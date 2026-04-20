// ═══════════════════════════════════════════════════════════════
// sync-fb-history-v2.mjs — FAST Facebook Page → Supabase sync
// 10x faster: batched inserts, parallel fetches, skip existing
// Usage: node scripts/sync-fb-history-v2.mjs
// ═══════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN || '';
const PAGE_ID = process.env.FACEBOOK_PAGE_ID || '114336388182180';
const PARALLEL_CONVS = 5; // Process 5 conversations at a time

async function fbGet(url) {
    const res = await fetch(url);
    if (!res.ok) {
        const text = await res.text();
        // Rate limit — wait and retry
        if (res.status === 429 || text.includes('rate limit')) {
            console.log('  ⏳ Rate limited, waiting 10s...');
            await new Promise(r => setTimeout(r, 10000));
            return fbGet(url);
        }
        throw new Error(`FB API ${res.status}: ${text.substring(0, 200)}`);
    }
    return res.json();
}

async function main() {
    console.log('🚀 Starting FAST Facebook Page sync (v2)...');
    if (!PAGE_ACCESS_TOKEN) {
        console.error('❌ No PAGE_ACCESS_TOKEN found!');
        process.exit(1);
    }

    // Get channel
    let channel = await prisma.channel.findFirst({ where: { type: 'MESSENGER', isActive: true } });
    if (!channel) {
        channel = await prisma.channel.create({
            data: { type: 'MESSENGER', name: 'HDG Wrap Facebook', config: { pageId: PAGE_ID } },
        });
    }
    console.log('✅ Channel:', channel.id);

    // Pre-load ALL existing platformMessageIds to skip dupes in memory
    console.log('📋 Loading existing message IDs...');
    const existingMsgs = await prisma.message.findMany({
        select: { platformMessageId: true },
        where: { platformMessageId: { not: null } },
    });
    const existingMsgIds = new Set(existingMsgs.map(m => m.platformMessageId));
    console.log(`  → ${existingMsgIds.size} messages already in DB`);

    // Pre-load ALL existing contacts
    const existingContacts = await prisma.contact.findMany({
        where: { channelId: channel.id },
        select: { id: true, platformContactId: true },
    });
    const contactMap = new Map(existingContacts.map(c => [c.platformContactId, c.id]));
    console.log(`  → ${contactMap.size} contacts already in DB`);

    // Pre-load ALL existing conversations
    const existingConvs = await prisma.conversation.findMany({
        where: { channelId: channel.id },
        select: { id: true, contactId: true },
    });
    const convMap = new Map(existingConvs.map(c => [c.contactId, c.id]));
    console.log(`  → ${convMap.size} conversations already in DB`);

    const stats = { conversations: 0, contacts: 0, messages: 0, media: 0, skipped: 0, errors: 0 };

    // ─── Fetch ALL conversations ──────────────────────────────
    let convUrl = `https://graph.facebook.com/v19.0/${PAGE_ID}/conversations?fields=participants,updated_time,message_count&limit=100&access_token=${PAGE_ACCESS_TOKEN}`;
    let allConvs = [];
    let page = 1;

    console.log('📦 Fetching conversations...');
    while (convUrl) {
        const data = await fbGet(convUrl);
        allConvs = allConvs.concat(data.data || []);
        console.log(`  Page ${page++}: +${data.data?.length || 0} (total: ${allConvs.length})`);
        convUrl = data.paging?.next || '';
        if (!data.paging?.next) break;
    }
    console.log(`📊 Total: ${allConvs.length} conversations`);

    // ─── Process in parallel batches ──────────────────────────
    const startTime = Date.now();

    for (let i = 0; i < allConvs.length; i += PARALLEL_CONVS) {
        const batch = allConvs.slice(i, i + PARALLEL_CONVS);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const rate = i > 0 ? (i / ((Date.now() - startTime) / 1000)).toFixed(1) : '?';
        const eta = i > 0 ? (((allConvs.length - i) / (i / ((Date.now() - startTime) / 1000))) / 60).toFixed(1) : '?';

        process.stdout.write(`\r🔄 ${i + batch.length}/${allConvs.length} | ${elapsed}s | ${rate}/s | ETA ${eta}min | msgs:${stats.messages} skip:${stats.skipped}   `);

        await Promise.all(batch.map(conv => processConversation(conv, channel, existingMsgIds, contactMap, convMap, stats)));
    }

    console.log('\n\n✅ Sync complete!');
    console.log('📊 Stats:', stats);
    console.log(`⏱️ Total time: ${((Date.now() - startTime) / 1000 / 60).toFixed(1)} minutes`);
    await prisma.$disconnect();
}

async function processConversation(conv, channel, existingMsgIds, contactMap, convMap, stats) {
    try {
        const participants = conv.participants?.data || [];
        const customer = participants.find(p => p.id !== PAGE_ID);
        if (!customer) { stats.skipped++; return; }

        const psid = customer.id;
        const displayName = customer.name || `User ${psid.substring(0, 8)}`;

        // Get/create contact
        let contactId = contactMap.get(psid);
        if (!contactId) {
            // Get profile pic (non-blocking error)
            let avatarUrl = null;
            try {
                const profile = await fbGet(`https://graph.facebook.com/v19.0/${psid}?fields=profile_pic&access_token=${PAGE_ACCESS_TOKEN}`);
                avatarUrl = profile.profile_pic || null;
            } catch { }

            const contact = await prisma.contact.create({
                data: { channelId: channel.id, platformContactId: psid, displayName, avatarUrl },
            });
            contactId = contact.id;
            contactMap.set(psid, contactId);
            stats.contacts++;
        }

        // Get/create conversation
        let conversationId = convMap.get(contactId);
        if (!conversationId) {
            const conversation = await prisma.conversation.create({
                data: {
                    channelId: channel.id, contactId, status: 'OPEN',
                    lastMessageAt: conv.updated_time ? new Date(conv.updated_time) : new Date(),
                },
            });
            conversationId = conversation.id;
            convMap.set(contactId, conversationId);
            stats.conversations++;
        }

        // Fetch ALL messages for this conversation
        let msgUrl = `https://graph.facebook.com/v19.0/${conv.id}/messages?fields=message,from,created_time,attachments{mime_type,file_url,image_data,video_data}&limit=500&access_token=${PAGE_ACCESS_TOKEN}`;
        let allMsgs = [];
        while (msgUrl) {
            const msgData = await fbGet(msgUrl);
            allMsgs = allMsgs.concat(msgData.data || []);
            msgUrl = msgData.paging?.next || '';
            if (!msgData.paging?.next) break;
        }

        // Filter out existing messages FAST (in-memory Set)
        const newMsgs = allMsgs.filter(msg => !existingMsgIds.has(msg.id));
        stats.skipped += allMsgs.length - newMsgs.length;

        if (newMsgs.length === 0) return;

        // Batch create all new messages
        const messagesToCreate = [];
        for (const msg of newMsgs.reverse()) {
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

            messagesToCreate.push({
                conversationId,
                direction: isFromPage ? 'OUTBOUND' : 'INBOUND',
                type: messageType,
                content: content || (messageType === 'IMAGE' ? '📷 รูปภาพ' : '📎 ไฟล์แนบ'),
                imageUrl,
                platformMessageId: msg.id,
                senderName: isFromPage ? 'HDG Wrapskin' : displayName,
                createdAt: msg.created_time ? new Date(msg.created_time) : new Date(),
            });

            existingMsgIds.add(msg.id); // prevent future dupe
        }

        if (messagesToCreate.length > 0) {
            await prisma.message.createMany({ data: messagesToCreate, skipDuplicates: true });
            stats.messages += messagesToCreate.length;
        }

        // Update conversation last message
        const lastMsg = messagesToCreate[messagesToCreate.length - 1];
        if (lastMsg) {
            await prisma.conversation.update({
                where: { id: conversationId },
                data: { lastMessageAt: lastMsg.createdAt, lastMessagePreview: lastMsg.content?.substring(0, 100) },
            });
        }
    } catch (err) {
        stats.errors++;
        // Don't spam console for known errors
        if (!err.message?.includes('Unique constraint')) {
            console.error(`\n❌ Conv error: ${err.message?.substring(0, 100)}`);
        }
    }
}

main().catch(e => { console.error(e); process.exit(1); });
