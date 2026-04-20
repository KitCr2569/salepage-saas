// Sync ALL messages for a SINGLE conversation from Facebook Page to database
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN || '';
const PAGE_ID = process.env.FACEBOOK_PAGE_ID || '114336388182180';

async function fbGet(url: string) {
    const res = await fetch(url);
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`FB API error ${res.status}: ${err}`);
    }
    return res.json();
}

export async function POST(request: Request, context: { params: { conversationId: string } }) {
    try {
        const { conversationId } = await context.params;

        // 1. Get our Conversation and Contact
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { contact: true, channel: true }
        });

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        const psid = conversation.contact.platformContactId;
        const displayName = conversation.contact.displayName;

        // 2. Fetch the Facebook Conversation ID by user PSID
        const convUrl = `https://graph.facebook.com/v19.0/${PAGE_ID}/conversations?user_id=${psid}&access_token=${PAGE_ACCESS_TOKEN}`;
        const convData = await fbGet(convUrl);
        
        if (!convData.data || convData.data.length === 0) {
            return NextResponse.json({ error: 'Facebook conversation not found for this user' }, { status: 404 });
        }

        const fbConvId = convData.data[0].id;

        // 3. Fetch ALL messages for this conversation
        let msgUrl = `https://graph.facebook.com/v19.0/${fbConvId}/messages?fields=message,from,created_time,attachments{mime_type,name,size,image_data,video_data,file_url}&limit=50&access_token=${PAGE_ACCESS_TOKEN}`;
        let allMessages: any[] = [];
        let stats = { messagesScanned: 0, newAdded: 0 };

        while (msgUrl && allMessages.length < 5000) { // Safety cap
            const msgData = await fbGet(msgUrl);
            const batch = msgData.data || [];
            allMessages = allMessages.concat(batch);
            stats.messagesScanned += batch.length;
            
            // Determine if we should keep going
            msgUrl = msgData.paging?.next || '';
        }

        // Process messages (oldest first so we don't disrupt timeline logic randomly)
        allMessages.reverse();

        for (const msg of allMessages) {
            // Check if message already exists anywhere in the DB!
            const existing = await prisma.message.findUnique({
                where: { platformMessageId: msg.id },
            });
            
            // If it exists, but is attached to a hidden duplicate conversation, rescue it!
            if (existing) {
                if (existing.conversationId !== conversation.id) {
                    await prisma.message.update({
                        where: { id: existing.id },
                        data: { conversationId: conversation.id }
                    });
                    stats.newAdded++; // We count rescued messages as new additions for this UI view
                }
                continue;
            }

            const isFromPage = msg.from?.id === PAGE_ID;
            const direction = isFromPage ? 'OUTBOUND' : 'INBOUND';
            const content = msg.message || '';

            // Handle attachments
            let imageUrl: string | null = null;
            let messageType: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT';
            const attachments = msg.attachments?.data || [];

            for (const att of attachments) {
                const mime = att.mime_type || '';
                if (mime.startsWith('image/') || att.image_data) {
                    imageUrl = att.image_data?.url || att.file_url || null;
                    messageType = 'IMAGE';
                } else if (mime.startsWith('video/') || att.video_data) {
                    imageUrl = att.video_data?.url || att.file_url || null;
                    messageType = 'FILE';
                } else if (att.file_url) {
                    imageUrl = att.file_url;
                    messageType = 'FILE';
                }
            }

            // Skip empty messages
            if (!content && !imageUrl) continue;

            await prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    direction,
                    type: messageType,
                    content: content || (messageType === 'IMAGE' ? '📷 รูปภาพ' : '📎 ไฟล์แนบ'),
                    imageUrl,
                    platformMessageId: msg.id,
                    senderName: isFromPage ? 'HDG Wrapskin' : displayName,
                    createdAt: msg.created_time ? new Date(msg.created_time) : new Date(),
                },
            });
            stats.newAdded++;
        }

        return NextResponse.json({
            success: true,
            message: `Synced properly. Found ${stats.messagesScanned} total messages on FB, added ${stats.newAdded} newly discovered older messages.`,
            stats
        });

    } catch (err) {
        console.error('❌ Single Sync error:', err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
