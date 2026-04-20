// ═══════════════════════════════════════════════════════════════
// POST /api/broadcast — Send broadcast messages to selected contacts
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getFacebookPageConfig } from '@/lib/facebook';


interface BroadcastRequest {
    contactIds?: string[];          // ถ้าไม่ส่ง → ใช้ sendAll
    sendAll?: boolean;              // ส่งให้ทุกคนในฐานข้อมูล
    channelFilter?: string;         // กรอง channel (ใช้กับ sendAll)
    message: string;
    messageType: 'TEXT' | 'IMAGE';
    imageUrl?: string;
    tag?: string;                   // Facebook MESSAGE_TAG
    delay?: number;                 // วินาทีระหว่างส่งแต่ละคน
}

interface SendResult {
    contactId: string;
    contactName: string;
    success: boolean;
    error?: string;
    platformMessageId?: string;
}

export async function POST(request: NextRequest) {
    try {
        // Support both JWT auth and Facebook auth
        let auth = await getAuthFromRequest(request);
        let authName = auth?.name || 'Admin';
        if (!auth) {
            const fbToken = request.headers.get('x-fb-token');
            if (!fbToken) {
                return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 });
            }
            authName = 'Facebook Admin';
        } else {
            authName = auth.name;
        }

        const body = (await request.json()) as BroadcastRequest;
        const { sendAll, channelFilter, message, messageType = 'TEXT', imageUrl, tag, delay = 1 } = body;
        let { contactIds } = body;

        if (!message && messageType === 'TEXT') {
            return NextResponse.json(
                { success: false, error: 'กรุณากรอกข้อความ' },
                { status: 400 }
            );
        }

        const results: SendResult[] = [];
        let successCount = 0;
        let failCount = 0;
        let resolvedIds: string[] = contactIds ?? [];

        try {
            const { prisma } = await import('@/lib/prisma');
            const { getAdapterWithConfig } = await import('@/lib/adapters');

            // ─── ถ้า sendAll=true ให้ดึง contactIds จาก DB ─────────
            if (sendAll) {
                const where: Record<string, unknown> = {};
                if (channelFilter) where.channel = { type: channelFilter };
                const allContacts = await prisma.contact.findMany({
                    where,
                    select: { id: true },
                    orderBy: { updatedAt: 'desc' },
                });
                resolvedIds = allContacts.map((c: { id: string }) => c.id);
                console.log(`[Broadcast] sendAll mode — found ${resolvedIds.length} contacts`);
            }

            if (resolvedIds.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'ไม่พบผู้รับ กรุณา Sync รายชื่อก่อน' },
                    { status: 400 }
                );
            }

            // ─── Fetch contacts with channel info ────────────────
            const contacts = await prisma.contact.findMany({
                where: { id: { in: resolvedIds } },
                include: { channel: true },
            });

            // ใช้ token จากการ login (x-page-token) ก่อน
            // Fallback: PAGE_ACCESS_TOKEN (sync route ใช้ชื่อนี้) หรือ META_PAGE_ACCESS_TOKEN
            const pageTokenFromHeader = request.headers.get('x-page-token')
                || process.env.PAGE_ACCESS_TOKEN
                || process.env.META_PAGE_ACCESS_TOKEN;
            
            // Send messages sequentially to avoid rate limits
            for (const contact of contacts) {
                try {
                    // Inject the fresh page token into channel config if available
                    const channelConfig = contact.channel.config as Record<string, unknown> | null;
                    const enrichedConfig = pageTokenFromHeader 
                        ? { ...channelConfig, pageAccessToken: pageTokenFromHeader }
                        : channelConfig;
                    
                    const adapter = getAdapterWithConfig(
                        contact.channel.type as 'MESSENGER' | 'INSTAGRAM' | 'LINE' | 'WHATSAPP',
                        enrichedConfig
                    );

                    // Replace variable placeholders with contact data
                    const contactName = contact.displayName || 'ลูกค้า';
                    const firstName = contactName.split(' ')[0] || contactName;
                    const personalizedMessage = message
                        .replace(/\[\[name\]\]/g, contactName)
                        .replace(/\[\[first_name\]\]/g, firstName);

                    const result = await adapter.sendMessage({
                        recipientPlatformId: contact.platformContactId,
                        type: messageType,
                        content: personalizedMessage,
                        imageUrl,
                        tag: tag || undefined,
                    });

                    if (!result.success) {
                        console.warn(`[Broadcast] Failed PSID=${contact.platformContactId} name=${contact.displayName}: ${result.error}`);
                    }

                    // Create message record in conversation if exists
                    const conversation = await prisma.conversation.findFirst({
                        where: { contactId: contact.id },
                        orderBy: { lastMessageAt: 'desc' },
                    });

                    if (conversation) {
                        const bcMsg = await prisma.message.create({
                            data: {
                                conversationId: conversation.id,
                                direction: 'OUTBOUND',
                                type: messageType,
                                content: personalizedMessage,
                                imageUrl: imageUrl || null,
                                sendStatus: result.success ? 'SENT' : 'FAILED',
                                senderName: authName,
                                senderAgentId: auth?.sub || 'broadcast',
                                platformMessageId: result.platformMessageId || null,
                            },
                        });

                        await prisma.conversation.update({
                            where: { id: conversation.id },
                            data: {
                                lastMessageAt: new Date(),
                                lastMessagePreview: `[Broadcast] ${message.substring(0, 80)}`,
                            },
                        });

                        // ⚡ Realtime broadcast
                        try {
                            const { broadcastMessage: rtBroadcast } = await import('@/lib/supabase');
                            await rtBroadcast(`chat:${conversation.id}`, 'new_message', {
                                message: { id: bcMsg.id, direction: 'OUTBOUND', type: messageType, content: personalizedMessage, imageUrl: imageUrl || null, sendStatus: result.success ? 'SENT' : 'FAILED', senderName: authName, senderAgentId: auth?.sub || null, createdAt: bcMsg.createdAt.toISOString(), senderAgent: auth ? { id: auth.sub, name: authName, avatarUrl: null } : null },
                            });
                            await rtBroadcast('inbox:updates', 'new_message', { conversationId: conversation.id });
                        } catch { /* silent */ }
                    }

                    results.push({
                        contactId: contact.id,
                        contactName: contact.displayName,
                        success: result.success,
                        error: result.error,
                        platformMessageId: result.platformMessageId,
                    });

                    if (result.success) successCount++;
                    else failCount++;

                    // Delay between messages (user-configured)
                    await new Promise(resolve => setTimeout(resolve, (delay || 1) * 1000));
                } catch (err) {
                    results.push({
                        contactId: contact.id,
                        contactName: contact.displayName,
                        success: false,
                        error: err instanceof Error ? err.message : 'Unknown error',
                    });
                    failCount++;
                }
            }

            // Log broadcast event
            await prisma.webhookLog.create({
                data: {
                    channelType: 'MESSENGER',
                    direction: 'OUTBOUND',
                    payload: {
                        type: 'BROADCAST',
                        agentId: auth?.sub || 'broadcast',
                        agentName: authName,
                        totalTargets: resolvedIds.length,
                        successCount,
                        failCount,
                        message: message.substring(0, 200),
                        timestamp: new Date().toISOString(),
                    } as object,
                },
            });
        } catch {
            // Mock mode — simulate send
            for (const contactId of resolvedIds) {
                const mockSuccess = Math.random() > 0.1; // 90% success rate in mock
                results.push({
                    contactId,
                    contactName: `Contact ${contactId}`,
                    success: mockSuccess,
                    error: mockSuccess ? undefined : 'Mock: simulated failure',
                    platformMessageId: mockSuccess ? `mock-broadcast-${Date.now()}` : undefined,
                });
                if (mockSuccess) successCount++;
                else failCount++;
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                totalTargets: resolvedIds.length,
                successCount,
                failCount,
                results,
                sentAt: new Date().toISOString(),
                sentBy: authName,
            },
        });
    } catch (error) {
        console.error('[Broadcast]', error);
        return NextResponse.json(
            { success: false, error: 'เกิดข้อผิดพลาดในการส่งบรอดแคสต์' },
            { status: 500 }
        );
    }
}
