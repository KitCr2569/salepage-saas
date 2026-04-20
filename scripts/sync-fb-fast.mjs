// Fast sync — batch insert, skip existing messages in bulk
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN || '';
const PAGE_ID = process.env.FACEBOOK_PAGE_ID || '114336388182180';

async function fbGet(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`FB API ${res.status}: ${await res.text()}`);
    return res.json();
}

async function main() {
    console.log('⚡ Fast sync starting...');
    if (!PAGE_ACCESS_TOKEN) { console.error('❌ No token!'); process.exit(1); }

    let channel = await prisma.channel.findFirst({ where: { type: 'MESSENGER', isActive: true } });
    if (!channel) {
        channel = await prisma.channel.create({
            data: { type: 'MESSENGER', name: 'HDG Wrap Facebook', config: { pageId: PAGE_ID } },
        });
    }
    console.log('📡 Channel:', channel.id);

    // Get ALL existing platformMessageIds in one query
    const existingMsgs = await prisma.message.findMany({
        select: { platformMessageId: true },
        where: { platformMessageId: { not: null } },
    });
    const existingIds = new Set(existingMsgs.map(m => m.platformMessageId));
    console.log(`📦 Already have ${existingIds.size} messages in DB`);

    // Fetch conversations
    let convUrl = `https://graph.facebook.com/v19.0/${PAGE_ID}/conversations?fields=participants,updated_time&limit=100&access_token=${PAGE_ACCESS_TOKEN}`;
    let allConvs = [];
    while (convUrl) {
        const data = await fbGet(convUrl);
        allConvs = allConvs.concat(data.data || []);
        convUrl = data.paging?.next || '';
        if (!convUrl) break;
    }
    console.log(`💬 ${allConvs.length} conversations found`);

    let totalNew = 0, totalSkipped = 0;

    for (let i = 0; i < allConvs.length; i++) {
        const conv = allConvs[i];
        try {
            const participants = conv.participants?.data || [];
            const customer = participants.find(p => p.id !== PAGE_ID);
            if (!customer) continue;

            const psid = customer.id;
            process.stdout.write(`\r⚡ ${i + 1}/${allConvs.length} [${customer.name || psid}]`.padEnd(60));

            // Upsert contact (no avatar fetch for speed)
            let contact = await prisma.contact.findFirst({ where: { channelId: channel.id, platformContactId: psid } });
            if (!contact) {
                contact = await prisma.contact.create({
                    data: { channelId: channel.id, platformContactId: psid, displayName: customer.name || `User ${psid.substring(0, 8)}` },
                });
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
            }

            // Fetch messages
            let msgUrl = `https://graph.facebook.com/v19.0/${conv.id}/messages?fields=message,from,created_time,attachments{mime_type,image_data,file_url}&limit=500&access_token=${PAGE_ACCESS_TOKEN}`;
            let allMsgs = [];
            while (msgUrl) {
                const msgData = await fbGet(msgUrl);
                allMsgs = allMsgs.concat(msgData.data || []);
                msgUrl = msgData.paging?.next || '';
                if (!msgUrl) break;
            }

            // Filter out existing — client-side check (no DB query per message!)
            const newMsgs = allMsgs.filter(m => !existingIds.has(m.id));
            totalSkipped += (allMsgs.length - newMsgs.length);

            if (newMsgs.length === 0) continue;

            // Batch insert
            const records = newMsgs.reverse().map(msg => {
                const isFromPage = msg.from?.id === PAGE_ID;
                const atts = msg.attachments?.data || [];
                let imageUrl = null, messageType = 'TEXT';
                for (const att of atts) {
                    if ((att.mime_type || '').startsWith('image/') || att.image_data) {
                        imageUrl = att.image_data?.url || att.file_url || null;
                        messageType = 'IMAGE';
                    } else if (att.file_url) {
                        imageUrl = att.file_url;
                        messageType = 'FILE';
                    }
                }
                const content = msg.message || (messageType === 'IMAGE' ? '📷 รูปภาพ' : messageType === 'FILE' ? '📎 ไฟล์' : '');
                if (!content && !imageUrl) return null;
                return {
                    conversationId: conversation.id,
                    direction: isFromPage ? 'OUTBOUND' : 'INBOUND',
                    type: messageType,
                    content,
                    imageUrl,
                    platformMessageId: msg.id,
                    sendStatus: 'SENT',
                    senderName: isFromPage ? 'HDG Wrapskin' : (customer.name || contact.displayName),
                    createdAt: msg.created_time ? new Date(msg.created_time) : new Date(),
                };
            }).filter(Boolean);

            if (records.length > 0) {
                await prisma.message.createMany({ data: records, skipDuplicates: true });
                totalNew += records.length;
                // Add to set so we don't re-insert
                records.forEach(r => existingIds.add(r.platformMessageId));
            }

            // Update conversation preview
            const lastMsg = records[records.length - 1];
            if (lastMsg) {
                await prisma.conversation.update({
                    where: { id: conversation.id },
                    data: { lastMessageAt: lastMsg.createdAt, lastMessagePreview: lastMsg.content?.substring(0, 100) },
                });
            }
        } catch (err) {
            console.error(`\n❌ Error: ${err.message}`);
        }
    }

    console.log(`\n\n✅ Done! New: ${totalNew}, Skipped: ${totalSkipped}`);
    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
