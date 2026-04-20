// FAST Sync — Parallel + Batch insert for maximum speed
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const PAGE_ID = process.env.FACEBOOK_PAGE_ID || '114336388182180';
const CONCURRENCY = 10; // Process 10 conversations at once
const MAX_CONVS = 5000; // Fetch up to 5000 conversations

async function fbGet(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`FB ${res.status}`);
    return res.json();
}

async function processConversation(conv, channel, index, total) {
    const customer = (conv.participants?.data || []).find(p => p.id !== PAGE_ID);
    if (!customer) return null;

    const psid = customer.id;
    let displayName = customer.name || `User ${psid.substring(0, 8)}`;

    // Upsert contact (skip profile pic for speed)
    let contact = await prisma.contact.findFirst({ where: { channelId: channel.id, platformContactId: psid } });
    if (!contact) {
        contact = await prisma.contact.create({
            data: { channelId: channel.id, platformContactId: psid, displayName },
        });
    }

    // Create conversation
    let conversation = await prisma.conversation.findFirst({ where: { channelId: channel.id, contactId: contact.id } });
    if (!conversation) {
        conversation = await prisma.conversation.create({
            data: { channelId: channel.id, contactId: contact.id, status: 'OPEN', lastMessageAt: conv.updated_time ? new Date(conv.updated_time) : new Date() },
        });
    }

    // Fetch messages (only first page for speed — latest 500)
    let msgUrl = `https://graph.facebook.com/v19.0/${conv.id}/messages?fields=message,from,created_time,attachments{mime_type,image_data,file_url}&limit=500&access_token=${PAGE_ACCESS_TOKEN}`;
    let allMsgs = [];
    try {
        const msgData = await fbGet(msgUrl);
        allMsgs = (msgData.data || []).reverse();
    } catch { return { name: displayName, msgs: 0, new: 0 }; }

    // Get existing message IDs for this conversation
    const existingIds = new Set(
        (await prisma.message.findMany({
            where: { conversationId: conversation.id },
            select: { platformMessageId: true },
        })).map(m => m.platformMessageId)
    );

    // Batch prepare new messages
    const newMessages = [];
    let imgCount = 0;
    for (const msg of allMsgs) {
        if (existingIds.has(msg.id)) continue;
        const isFromPage = msg.from?.id === PAGE_ID;
        const content = msg.message || '';
        let imageUrl = null;
        let messageType = 'TEXT';
        for (const att of (msg.attachments?.data || [])) {
            if ((att.mime_type || '').startsWith('image/') || att.image_data) {
                imageUrl = att.image_data?.url || att.file_url || null;
                messageType = 'IMAGE'; imgCount++;
            } else if (att.file_url) {
                imageUrl = att.file_url; messageType = 'FILE';
            }
        }
        if (!content && !imageUrl) continue;
        newMessages.push({
            conversationId: conversation.id,
            direction: isFromPage ? 'OUTBOUND' : 'INBOUND',
            type: messageType,
            content: content || (messageType === 'IMAGE' ? '📷' : '📎'),
            imageUrl,
            platformMessageId: msg.id,
            senderName: isFromPage ? 'HDG' : displayName,
            createdAt: msg.created_time ? new Date(msg.created_time) : new Date(),
        });
    }

    // Batch insert
    if (newMessages.length > 0) {
        await prisma.message.createMany({ data: newMessages, skipDuplicates: true });
    }

    // Update last message
    const lastMsg = await prisma.message.findFirst({ where: { conversationId: conversation.id }, orderBy: { createdAt: 'desc' } });
    if (lastMsg) {
        await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: lastMsg.createdAt, lastMessagePreview: lastMsg.content?.substring(0, 100) } });
    }

    return { name: displayName, msgs: allMsgs.length, new: newMessages.length, imgs: imgCount };
}

async function main() {
    console.log('⚡ FAST SYNC — Starting...');
    const t0 = Date.now();

    let channel = await prisma.channel.findFirst({ where: { type: 'MESSENGER', isActive: true } });
    if (!channel) {
        channel = await prisma.channel.create({ data: { type: 'MESSENGER', name: 'HDG Wrap Facebook', config: { pageId: PAGE_ID } } });
    }

    // Fetch all conversations
    let convUrl = `https://graph.facebook.com/v19.0/${PAGE_ID}/conversations?fields=participants,updated_time&limit=100&access_token=${PAGE_ACCESS_TOKEN}`;
    let allConvs = [];
    while (convUrl && allConvs.length < MAX_CONVS) {
        const data = await fbGet(convUrl);
        allConvs = allConvs.concat(data.data || []);
        convUrl = data.paging?.next || '';
    }
    console.log(`📨 ${allConvs.length} conversations found (${((Date.now()-t0)/1000).toFixed(1)}s)`);

    let totalMsgs = 0, totalNew = 0, totalImgs = 0, errors = 0;

    // Process in parallel batches
    for (let i = 0; i < allConvs.length; i += CONCURRENCY) {
        const batch = allConvs.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
            batch.map((conv, j) => processConversation(conv, channel, i + j, allConvs.length))
        );
        for (const r of results) {
            if (r.status === 'fulfilled' && r.value) {
                totalMsgs += r.value.msgs;
                totalNew += r.value.new;
                totalImgs += r.value.imgs || 0;
            } else if (r.status === 'rejected') { errors++; }
        }
        const done = Math.min(i + CONCURRENCY, allConvs.length);
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`[${done}/${allConvs.length}] ${elapsed}s — ${totalNew} new msgs, ${totalImgs} imgs`);
    }

    console.log(`\n✅ DONE in ${((Date.now()-t0)/1000).toFixed(1)}s`);
    console.log(`📊 ${allConvs.length} convs | ${totalMsgs} total msgs | ${totalNew} new | ${totalImgs} images | ${errors} errors`);
    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
