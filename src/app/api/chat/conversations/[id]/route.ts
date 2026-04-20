// ═══════════════════════════════════════════════════════════════
// GET /api/conversations/[id] — Get conversation with messages
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

import { getAuthFromRequest } from '@/lib/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { getFacebookPageConfig } from '@/lib/facebook';

const PAGE_SIZE = 500;

async function fetchFromDatabase(id: string, cursor?: string) {
    const messagesWhere: Record<string, unknown> = { conversationId: id };
    if (cursor) {
        messagesWhere.createdAt = { lt: new Date(cursor) };
    }

    // ⚡ Run ALL queries in parallel — saves 300-600ms vs sequential
    const [conversation, messages] = await Promise.all([
        prisma.conversation.findUnique({
            where: { id },
            include: {
                contact: { select: { id: true, displayName: true, avatarUrl: true, phone: true, email: true, platformContactId: true, createdAt: true } },
                channel: { select: { id: true, type: true, name: true } },
                assignedAgent: { select: { id: true, name: true, email: true, avatarUrl: true } },
                tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
                notes: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    select: { id: true, content: true, createdAt: true, agent: { select: { id: true, name: true } } },
                },
            },
        }),
        prisma.message.findMany({
            where: messagesWhere,
            orderBy: { createdAt: 'desc' },
            take: PAGE_SIZE + 1, // +1 to check if more exist
            select: {
                id: true, direction: true, type: true, content: true,
                imageUrl: true, sendStatus: true, senderName: true,
                senderAgentId: true, createdAt: true,
                senderAgent: { select: { id: true, name: true, avatarUrl: true } },
            },
        }),
    ]);

    if (!conversation) return null;

    // Attach paginated messages
    const hasMore = messages.length > PAGE_SIZE;
    const pageMessages = hasMore ? messages.slice(0, PAGE_SIZE) : messages;
    (conversation as any).messages = pageMessages.reverse(); // oldest-first for UI
    (conversation as any).hasMoreMessages = hasMore;
    (conversation as any).oldestCursor = pageMessages.length > 0 ? pageMessages[0].createdAt : null;

    // ⚡ Ecommerce orders + unread reset in parallel
    let ecommerceOrders: any[] = [];
    try {
        const platformId = conversation.contact?.platformContactId;
        const [orders] = await Promise.all([
            platformId
                ? prisma.ecommerceOrder.findMany({
                    where: { facebookPsid: platformId },
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                })
                : Promise.resolve([]),
            conversation.unreadCount > 0
                ? prisma.conversation.update({ where: { id }, data: { unreadCount: 0 } }).catch(() => { })
                : Promise.resolve(),
        ]);
        ecommerceOrders = orders || [];
    } catch (e) {
        logger.error('Conversation', `ecommerce order query failed: ${e}`);
    }
    (conversation as any).ecommerceOrders = ecommerceOrders;

    // Auto-sync avatar in background (non-blocking)
    if (!conversation.contact.avatarUrl &&
        (conversation.channel.type === 'MESSENGER' || conversation.channel.type === 'INSTAGRAM')) {
        syncAvatarInBackground(conversation.contact.id, conversation.contact.platformContactId, conversation.channel.id);
    }

    return conversation;
}

// Sync avatar from Facebook Graph API (non-blocking)
async function syncAvatarInBackground(contactId: string, platformContactId: string, channelId: string) {
    try {
        const channel = await prisma.channel.findUnique({ where: { id: channelId } });
        const config = channel?.config as Record<string, unknown> | null;
        
        const { pageAccessToken, pageId } = await getFacebookPageConfig();

        
        if (!pageAccessToken || !platformContactId || platformContactId.startsWith('mock')) return;

        const res = await fetch(
            `https://graph.facebook.com/v19.0/${platformContactId}?fields=first_name,last_name,profile_pic&access_token=${pageAccessToken}`
        );

        if (!res.ok) return;

        const profile = await res.json() as Record<string, string>;
        const avatarUrl = profile.profile_pic || null;
        const displayName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || undefined;

        if (avatarUrl || displayName) {
            const updateData: Record<string, string> = {};
            if (avatarUrl) updateData.avatarUrl = avatarUrl;
            if (displayName) updateData.displayName = displayName;

            await prisma.contact.update({
                where: { id: contactId },
                data: updateData,
            });
            logger.info('Contact', `Synced avatar for contact ${contactId}`);
        }
    } catch {
        // silent fail
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return errorResponse('ไม่ได้เข้าสู่ระบบ', 401);
        }

        const { id } = await params;
        const cursor = request.nextUrl.searchParams.get('cursor') || undefined;

        logger.info('Conversation', `GET /conversations/${id} cursor=${cursor || 'none'}`);

        const conversation = await fetchFromDatabase(id, cursor);

        if (!conversation) {
            return errorResponse('ไม่พบการสนทนา', 404);
        }

        return successResponse(conversation);
    } catch (error) {
        logger.error('Conversation', `GET /conversations failed: ${error instanceof Error ? error.message : error}`);
        return handleApiError(error);
    }
}

/**
 * PATCH /api/conversations/[id] — Update conversation (assign, status, etc.)
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return errorResponse('ไม่ได้เข้าสู่ระบบ', 401);
        }

        const { id } = await params;
        const body = await request.json();

        try {
            const updateData: Record<string, unknown> = {};
            if (body.status) updateData.status = body.status;
            if (body.assignedAgentId !== undefined) {
                updateData.assignedAgentId = body.assignedAgentId;
                if (body.assignedAgentId) updateData.status = 'ASSIGNED';
            }
            // ⚡ Quick actions: star, spam, unread
            if (body.isStarred !== undefined) updateData.isStarred = !!body.isStarred;
            if (body.isSpam !== undefined) updateData.isSpam = !!body.isSpam;
            if (body.unreadCount !== undefined) updateData.unreadCount = Math.max(0, parseInt(body.unreadCount) || 0);

            const conversation = await prisma.conversation.update({
                where: { id },
                data: updateData,
                include: {
                    contact: true,
                    channel: { select: { type: true } },
                    assignedAgent: { select: { id: true, name: true } },
                },
            });

            logger.info('Conversation', `Updated conversation ${id}`, updateData);
            return successResponse(conversation);
        } catch {
            return errorResponse('Database unavailable', 500);
        }
    } catch (error) {
        return handleApiError(error);
    }
}
