// Run this script locally to sync ALL Facebook Page data to Supabase
// Usage: node scripts/sync-fb-history.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN || '';
const PAGE_ID = process.env.FACEBOOK_PAGE_ID || '114336388182180';

async function fbGet(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`FB API error ${res.status}: ${await res.text()}`);
    return res.json();
}

async function main() {
    console.log('🚀 Starting Facebook Page history sync...');
    if (!PAGE_ACCESS_TOKEN) {
        console.error('❌ No PAGE_ACCESS_TOKEN found!');
        process.exit(1);
    }

    // Get or create channel
    let channel = await prisma.channel.findFirst({ where: { type: 'MESSENGER', isActive: true } });
    if (!channel) {
        channel = await prisma.channel.create({
            data: { type: 'MESSENGER', name: 'HDG Wrap Facebook', config: { pageId: PAGE_ID } },
        });
        console.log('✅ Created channel:', channel.id);
    } else {
        console.log('✅ Using channel:', channel.id);
    }

    const stats = { conversations: 0, contacts: 0, messages: 0, media: 0, skipped: 0, errors: 0 };

    // Fetch all conversations
    let convUrl = `https://graph.facebook.com/v19.0/${PAGE_ID}/conversations?fields=participants,updated_time,message_count&limit=100&access_token=${PAGE_ACCESS_TOKEN}`;
    let allConvs = [];
    let page = 1;

    console.log('📦 Fetching conversations...');
    while (convUrl) {
        const data = await fbGet(convUrl);
        allConvs = allConvs.concat(data.data || []);
        console.log(`  Page ${page++}: ${data.data?.length || 0} conversations (total: ${allConvs.length})`);
        convUrl = data.paging?.next || '';
        if (!data.paging?.next) break;
    }
    console.log(`📊 Total conversations found: ${allConvs.length}`);

    for (let i = 0; i < allConvs.length; i++) {
        const conv = allConvs[i];
        try {
            process.stdout.write(`\r🔄 Processing ${i + 1}/${allConvs.length}...`);

            const participants = conv.participants?.data || [];
            const customer = participants.find(p => p.id !== PAGE_ID);
            if (!customer) { stats.skipped++; continue; }

            const psid = customer.id;
            const displayName = customer.name || `User ${psid.substring(0, 8)}`;

            // Get profile pic
            let avatarUrl = null;
            try {
                const profile = await fbGet(`https://graph.facebook.com/v19.0/${psid}?fields=profile_pic&access_token=${PAGE_ACCESS_TOKEN}`);
                avatarUrl = profile.profile_pic || null;
            } catch { }

            // Upsert contact
            let contact = await prisma.contact.findFirst({ where: { channelId: channel.id, platformContactId: psid } });
            if (!contact) {
                contact = await prisma.contact.create({
                    data: { channelId: channel.id, platformContactId: psid, displayName, avatarUrl },
                });
                stats.contacts++;
            }

            // Upsert conversation
            let conversation = await prisma.conversation.findFirst({ where: { channelId: channel.id, contactId: contact.id } });
            if (!conversation) {
                conversation = await prisma.conversation.create({
                    data: {
                        channelId: channel.id, contactId: contact.id, status: 'OPEN',
                        lastMessageAt: conv.updated_time ? new Date(conv.updated_time) : new Date(),
                    },
                });
                stats.conversations++;
            }

            // Fetch all messages for this conversation
            let msgUrl = `https://graph.facebook.com/v19.0/${conv.id}/messages?fields=message,from,created_time,attachments{mime_type,file_url,image_data,video_data}&limit=200&access_token=${PAGE_ACCESS_TOKEN}`;
            let allMsgs = [];
            while (msgUrl) {
                const msgData = await fbGet(msgUrl);
                allMsgs = allMsgs.concat(msgData.data || []);
                msgUrl = msgData.paging?.next || '';
                if (!msgData.paging?.next) break;
            }

            // Process messages (oldest first)
            for (const msg of allMsgs.reverse()) {
                const existing = await prisma.message.findFirst({ where: { platformMessageId: msg.id } });
                if (existing) { stats.skipped++; continue; }

                const isFromPage = msg.from?.id === PAGE_ID;
                const content = msg.message || '';
                let imageUrl = null;
                let messageType = 'TEXT';
                const atts = msg.attachments?.data || [];

                for (const att of atts) {
                    const mime = att.mime_type || '';
                    if (mime.startsWith('image/') || att.image_data) {
                        imageUrl = att.image_data?.url || att.file_url || null;
                        messageType = 'IMAGE';
                        stats.media++;
                    } else if (mime.startsWith('video/') || att.video_data) {
                        imageUrl = att.video_data?.url || att.file_url || null;
                        messageType = 'FILE';
                        stats.media++;
                    } else if (att.file_url) {
                        imageUrl = att.file_url;
                        messageType = 'FILE';
                    }
                }
                if (!content && !imageUrl) continue;

                await prisma.message.create({
                    data: {
                        conversationId: conversation.id,
                        direction: isFromPage ? 'OUTBOUND' : 'INBOUND',
                        type: messageType,
                        content: content || (messageType === 'IMAGE' ? '📷 รูปภาพ' : '📎 ไฟล์แนบ'),
                        imageUrl,
                        platformMessageId: msg.id,
                        senderName: isFromPage ? 'HDG Wrapskin' : displayName,
                        createdAt: msg.created_time ? new Date(msg.created_time) : new Date(),
                    },
                });
                stats.messages++;
            }

            // Update conversation last message
            const lastMsg = await prisma.message.findFirst({
                where: { conversationId: conversation.id },
                orderBy: { createdAt: 'desc' },
            });
            if (lastMsg) {
                await prisma.conversation.update({
                    where: { id: conversation.id },
                    data: { lastMessageAt: lastMsg.createdAt, lastMessagePreview: lastMsg.content?.substring(0, 100) },
                });
            }
        } catch (err) {
            console.error(`\n❌ Error for conv ${conv.id}:`, err.message);
            stats.errors++;
        }
    }

    console.log('\n\n✅ Sync complete!');
    console.log('📊 Stats:', stats);
    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
