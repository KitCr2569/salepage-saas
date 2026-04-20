// ═══════════════════════════════════════════════════════════════
// POST /api/webhooks/line — LINE Messaging API webhook
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
// prisma is imported dynamically below
import { getAdapter } from '@/lib/adapters';
import { successResponse, handleApiError } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        const body = JSON.parse(rawBody);
        const signature = request.headers.get('x-line-signature') || '';

        // Log raw payload
        await prisma.webhookLog.create({
            data: {
                channelType: 'LINE',
                direction: 'INBOUND',
                payload: body as object,
            },
        });

        logger.info('Webhook:LINE', 'Received LINE webhook');

        const adapter = getAdapter('LINE');

        // Verify signature
        const verification = adapter.verifyWebhook({
            signature,
            body: rawBody,
        });

        if (!verification.valid) {
            logger.warn('Webhook:LINE', 'Invalid signature');
            return new Response('Invalid signature', { status: 403 });
        }

        const messages = adapter.parseInboundMessages(body);

        for (const msg of messages) {
            let channel = await prisma.channel.findFirst({
                where: { type: 'LINE', isActive: true },
            });

            if (!channel) {
                channel = await prisma.channel.create({
                    data: { type: 'LINE', name: 'LINE Channel (Auto)' },
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
                        avatarUrl: msg.contactAvatarUrl || null,
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

            logger.info('Webhook:LINE', `Message saved for conversation ${conversation.id}`);
        }

        return successResponse({ received: true });
    } catch (error) {
        logger.error('Webhook:LINE', 'Error processing webhook', error);
        return handleApiError(error);
    }
}
