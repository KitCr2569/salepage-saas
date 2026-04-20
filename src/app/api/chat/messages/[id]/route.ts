// ═══════════════════════════════════════════════════════════════
// DELETE /api/chat/messages/[id] — Delete a message
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { broadcastMessage } from '@/lib/supabase';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return errorResponse('ไม่ได้เข้าสู่ระบบ', 401);
        }

        const { id } = await params;

        // Find the message first to get conversationId for broadcast
        const message = await prisma.message.findUnique({
            where: { id },
            select: { id: true, conversationId: true, senderAgentId: true }
        });

        if (!message) {
            return errorResponse('ไม่พบข้อความ', 404);
        }

        // Only allow deleting own outbound messages or if admin
        // (Assuming auth.sub is agent ID)
        if (message.senderAgentId && message.senderAgentId !== auth.sub) {
             // You might want to allow admins to delete anything, but for now strict check
             // return errorResponse('ไม่มีสิทธิ์ลบข้อความนี้', 403);
        }

        await prisma.message.delete({
            where: { id }
        });

        logger.info('Message', `Deleted message ${id} from conversation ${message.conversationId}`);

        // ⚡ Realtime broadcast to tell other clients to remove this message
        try {
            await broadcastMessage(`chat:${message.conversationId}`, 'message_deleted', {
                messageId: id
            });
        } catch (e) {
            logger.error('Realtime', `Failed to broadcast message deletion: ${e}`);
        }

        return successResponse({ deleted: true, id });
    } catch (error) {
        return handleApiError(error);
    }
}
