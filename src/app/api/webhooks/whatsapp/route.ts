// ═══════════════════════════════════════════════════════════════
// GET/POST /api/webhooks/whatsapp — WhatsApp Cloud API webhook
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
// prisma is imported dynamically below
import { getAdapter } from '@/lib/adapters';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

/**
 * GET — Webhook verification
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const mode = searchParams.get('hub.mode') || undefined;
        const token = searchParams.get('hub.verify_token') || undefined;
        const challenge = searchParams.get('hub.challenge') || undefined;

        const adapter = getAdapter('WHATSAPP');
        const result = adapter.verifyWebhook({ mode, token, challenge });

        if (result.valid && result.challenge) {
            logger.info('Webhook:WhatsApp', 'Verification successful');
            return new Response(result.challenge, { status: 200 });
        }

        return errorResponse('Verification failed', 403);
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * POST — Receive incoming messages
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        await prisma.webhookLog.create({
            data: {
                channelType: 'WHATSAPP',
                direction: 'INBOUND',
                payload: body as object,
            },
        });

        logger.info('Webhook:WhatsApp', 'Received webhook');

        const adapter = getAdapter('WHATSAPP');
        const messages = adapter.parseInboundMessages(body);

        for (const msg of messages) {
            let channel = await prisma.channel.findFirst({
                where: { type: 'WHATSAPP', isActive: true },
            });

            if (!channel) {
                channel = await prisma.channel.create({
                    data: { type: 'WHATSAPP', name: 'WhatsApp Channel (Auto)' },
                });
            }

            let contact = await prisma.contact.findFirst({
                where: {
                    channelId: channel.id,
                    platformContactId: msg.platformContactId,
                },
            });

            if (!contact) {
                contact = await prisma.contact.create({
                    data: {
                        channelId: channel.id,
                        platformContactId: msg.platformContactId,
                        displayName: msg.contactDisplayName || msg.platformContactId,
                        phone: msg.platformContactId,
                    },
                });
            }

            let conversation = await prisma.conversation.findFirst({
                where: {
                    channelId: channel.id,
                    contactId: contact.id,
                    status: { in: ['OPEN', 'ASSIGNED'] },
                },
            });

            if (!conversation) {
                conversation = await prisma.conversation.create({
                    data: {
                        channelId: channel.id,
                        contactId: contact.id,
                        status: 'OPEN',
                        lastMessageAt: msg.timestamp,
                        lastMessagePreview: msg.content?.substring(0, 100) || '[รูปภาพ]',
                        unreadCount: 1,
                    },
                });
            } else {
                await prisma.conversation.update({
                    where: { id: conversation.id },
                    data: {
                        lastMessageAt: msg.timestamp,
                        lastMessagePreview: msg.content?.substring(0, 100) || '[รูปภาพ]',
                        unreadCount: { increment: 1 },
                    },
                });
            }

            await prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    direction: 'INBOUND',
                    type: msg.type as 'TEXT' | 'IMAGE' | 'FILE' | 'NOTE',
                    content: msg.content || '',
                    imageUrl: msg.imageUrl || null,
                    platformMessageId: msg.platformMessageId,
                    sendStatus: 'SENT',
                    senderName: contact.displayName,
                    rawPayload: msg.rawPayload as object ?? undefined,
                },
            });

            logger.info('Webhook:WhatsApp', `Message saved for conversation ${conversation.id}`);
        }

        return successResponse({ received: true });
    } catch (error) {
        logger.error('Webhook:WhatsApp', 'Error processing webhook', error);
        return handleApiError(error);
    }
}
