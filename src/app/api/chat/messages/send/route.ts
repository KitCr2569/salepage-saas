// ═══════════════════════════════════════════════════════════════
// POST /api/messages/send — Send outbound message
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { SendMessageSchema } from '@/lib/chat-types';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { broadcastMessage } from '@/lib/supabase';

async function sendWithDatabase(input: { conversationId: string; type: string; content: string; imageUrl?: string }, auth: { sub: string; name: string }) {

    const conversation = await prisma.conversation.findUnique({
        where: { id: input.conversationId },
        include: { contact: true, channel: true },
    });

    if (!conversation) return null;

    // Handle internal notes
    if (input.type === 'NOTE') {
        const note = await prisma.note.create({
            data: {
                conversationId: conversation.id,
                agentId: auth.sub,
                content: input.content,
            },
            include: { agent: { select: { id: true, name: true } } },
        });
        return { type: 'note', note };
    }

    // Create message record
    const message = await prisma.message.create({
        data: {
            conversationId: conversation.id,
            direction: 'OUTBOUND',
            type: input.type as 'TEXT' | 'IMAGE' | 'FILE' | 'NOTE',
            content: input.content,
            imageUrl: input.imageUrl || null,
            sendStatus: 'PENDING',
            senderName: auth.name,
            senderAgentId: auth.sub,
        },
    });

    // Send via platform adapter
    const sendResult = await (async () => {
        try {
            const { getAdapterWithConfig } = await import('@/lib/adapters');
            const adapter = getAdapterWithConfig(
                conversation.channel.type as 'MESSENGER' | 'INSTAGRAM' | 'LINE' | 'WHATSAPP',
                conversation.channel.config as Record<string, unknown> | null
            );
            const result = await adapter.sendMessage({
                recipientPlatformId: conversation.contact.platformContactId,
                type: input.type,
                content: input.content,
                imageUrl: input.imageUrl,
            });
            logger.info('Adapter', `Sent via ${conversation.channel.type}: ${result.success ? '✅' : '❌'} ${result.error || ''}`);
            return result;
        } catch (err) {
            logger.warn('Adapter', `Send failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
            return { success: false, error: err instanceof Error ? err.message : 'Unknown error', platformMessageId: null };
        }
    })();

    await prisma.message.update({
        where: { id: message.id },
        data: {
            sendStatus: sendResult.success ? 'SENT' : 'FAILED',
            platformMessageId: sendResult.platformMessageId || null,
        },
    });

    await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
            lastMessageAt: new Date(),
            lastMessagePreview: input.content.substring(0, 100),
            unreadCount: 0,
        },
    });

    await prisma.webhookLog.create({
        data: {
            channelType: conversation.channel.type,
            direction: 'OUTBOUND',
            payload: { messageId: message.id, sendResult } as object,
        },
    });

    // ⚡ Realtime broadcast เพื่อให้อุปกรณ์อื่นๆ อัปเดตทันที
    try {
        await broadcastMessage(`chat:${conversation.id}`, 'new_message', {
            message: {
                id: message.id,
                direction: 'OUTBOUND',
                type: message.type,
                content: message.content,
                imageUrl: message.imageUrl,
                sendStatus: sendResult.success ? 'SENT' : 'FAILED',
                senderName: message.senderName,
                senderAgentId: message.senderAgentId,
                createdAt: message.createdAt.toISOString(),
                senderAgent: { id: auth.sub, name: auth.name, avatarUrl: null },
            },
        });
        await broadcastMessage('inbox:updates', 'new_message', { conversationId: conversation.id });
    } catch { /* silent */ }

    return {
        type: 'message',
        message: { ...message, sendStatus: sendResult.success ? 'SENT' : 'FAILED', platformMessageId: sendResult.platformMessageId },
        warning: sendResult.success ? undefined : `ส่งข้อความไม่สำเร็จ: ${sendResult.error}`,
    };
}

function sendWithMock(input: { conversationId: string; type: string; content: string; imageUrl?: string }, auth: { sub: string; name: string }) {
    if (input.type === 'NOTE') {
        return {
            type: 'note',
            note: {
                id: randomUUID(),
                conversationId: input.conversationId,
                agentId: auth.sub,
                content: input.content,
                createdAt: new Date().toISOString(),
                agent: { id: auth.sub, name: auth.name },
            },
        };
    }

    return {
        type: 'message',
        message: {
            id: randomUUID(),
            conversationId: input.conversationId,
            direction: 'OUTBOUND',
            type: input.type as 'TEXT' | 'IMAGE' | 'FILE' | 'NOTE',
            content: input.content,
            imageUrl: input.imageUrl || null,
            sendStatus: 'SENT',
            senderName: auth.name,
            senderAgentId: auth.sub,
            createdAt: new Date().toISOString(),
            platformMessageId: `mock-${Date.now()}`,
        },
    };
}

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return errorResponse('ไม่ได้เข้าสู่ระบบ', 401);
        }

        const body = await request.json();
        const input = SendMessageSchema.parse(body);

        logger.info('SendMessage', `Agent ${auth.name} sending message to conversation ${input.conversationId}`);

        let result;
        try {
            result = await sendWithDatabase(input, auth);
        } catch (dbError) {
            logger.warn('SendMessage', `Database unavailable, using mock send`);
            result = sendWithMock(input, auth);
        }

        if (!result) {
            return errorResponse('ไม่พบการสนทนา', 404);
        }

        logger.info('SendMessage', `Message handled successfully`);
        return successResponse(result);
    } catch (error) {
        return handleApiError(error);
    }
}
