// Sync ALL conversations & messages from Facebook Page to database
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

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const limit = body.limit || 500; // max conversations to sync

        // Get channel
        let channel = await prisma.channel.findFirst({
            where: { type: 'MESSENGER', isActive: true },
        });
        if (!channel) {
            channel = await prisma.channel.create({
                data: { type: 'MESSENGER', name: 'HDG Wrap Facebook', config: { pageId: PAGE_ID } },
            });
        }

        const stats = { conversations: 0, contacts: 0, messages: 0, images: 0, errors: 0 };

        // Step 1: Fetch all conversations from page
        let convUrl = `https://graph.facebook.com/v19.0/${PAGE_ID}/conversations?fields=participants,updated_time,message_count&limit=100&access_token=${PAGE_ACCESS_TOKEN}`;
        let allConversations: any[] = [];

        while (convUrl && allConversations.length < limit) {
            const convData = await fbGet(convUrl);
            allConversations = allConversations.concat(convData.data || []);
            convUrl = convData.paging?.next || '';
        }

        console.log(`📦 Found ${allConversations.length} conversations`);

        for (const conv of allConversations) {
            try {
                // Get participant (customer) info
                const participants = conv.participants?.data || [];
                const customer = participants.find((p: any) => p.id !== PAGE_ID);
                if (!customer) continue;

                const psid = customer.id;
                let displayName = customer.name || `User ${psid.substring(0, 8)}`;

                // Get customer profile picture
                let avatarUrl: string | null = null;
                try {
                    const profileData = await fbGet(
                        `https://graph.facebook.com/v19.0/${psid}?fields=name,first_name,last_name,profile_pic&access_token=${PAGE_ACCESS_TOKEN}`
                    );
                    avatarUrl = profileData.profile_pic || null;
                    if (!customer.name) {
                        const fetchedName = profileData.name || `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
                        if (fetchedName) displayName = fetchedName;
                    }
                } catch {
                    // Profile pic not available
                }

                // Upsert contact
                let contact = await prisma.contact.findFirst({
                    where: { channelId: channel.id, platformContactId: psid },
                });
                if (!contact) {
                    contact = await prisma.contact.create({
                        data: {
                            channelId: channel.id,
                            platformContactId: psid,
                            displayName,
                            avatarUrl,
                        },
                    });
                    stats.contacts++;
                } else if ((avatarUrl && !contact.avatarUrl) || (displayName !== psid && contact.displayName === psid)) {
                    await prisma.contact.update({
                        where: { id: contact.id },
                        data: {
                            avatarUrl: avatarUrl || contact.avatarUrl,
                            displayName: displayName !== psid ? displayName : contact.displayName
                        },
                    });
                }

                // Create conversation
                let conversation = await prisma.conversation.findFirst({
                    where: { channelId: channel.id, contactId: contact.id },
                });
                if (!conversation) {
                    conversation = await prisma.conversation.create({
                        data: {
                            channelId: channel.id,
                            contactId: contact.id,
                            status: 'OPEN',
                            lastMessageAt: conv.updated_time ? new Date(conv.updated_time) : new Date(),
                        },
                    });
                    stats.conversations++;
                }

                // Step 2: Fetch ALL messages for this conversation
                let msgUrl = `https://graph.facebook.com/v19.0/${conv.id}/messages?fields=message,from,created_time,attachments{mime_type,name,size,image_data,video_data,file_url}&limit=500&access_token=${PAGE_ACCESS_TOKEN}`;
                let allMessages: any[] = [];

                while (msgUrl) {
                    const msgData = await fbGet(msgUrl);
                    allMessages = allMessages.concat(msgData.data || []);
                    msgUrl = msgData.paging?.next || '';
                }

                // Process messages (oldest first)
                allMessages.reverse();

                for (const msg of allMessages) {
                    // Check if message already exists
                    const existing = await prisma.message.findUnique({
                        where: { platformMessageId: msg.id },
                    });
                    
                    if (existing) {
                        if (existing.conversationId !== conversation.id) {
                            await prisma.message.update({
                                where: { id: existing.id },
                                data: { conversationId: conversation.id }
                            });
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
                            stats.images++;
                        } else if (mime.startsWith('video/') || att.video_data) {
                            imageUrl = att.video_data?.url || att.file_url || null;
                            messageType = 'FILE';
                            stats.images++;
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
                        data: {
                            lastMessageAt: lastMsg.createdAt,
                            lastMessagePreview: lastMsg.content?.substring(0, 100),
                        },
                    });
                }

            } catch (err) {
                console.error(`❌ Error processing conversation:`, err);
                stats.errors++;
            }
        }

        return NextResponse.json({
            success: true,
            stats,
            message: `Synced ${stats.conversations} conversations, ${stats.contacts} contacts, ${stats.messages} messages, ${stats.images} media files`,
        });
    } catch (err) {
        console.error('❌ Sync error:', err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
