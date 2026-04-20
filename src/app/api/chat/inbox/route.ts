// ═══════════════════════════════════════════════════════════════
// GET /api/inbox — List conversations for inbox view
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

import { getAuthFromRequest } from '@/lib/auth';
import { errorResponse, handleApiError } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
import { prisma, isDbReady } from '@/lib/prisma';

// Simple query parser (replaces zod InboxQuerySchema)
const InboxQuerySchema = {
    parse(data: Record<string, string>) {
        return {
            channel: data.channel || undefined,
            status: data.status || undefined,
            search: data.search || undefined,
            page: parseInt(data.page || '1', 10) || 1,
            limit: Math.min(parseInt(data.limit || '50', 10) || 50, 500),
            assignedToMe: data.assignedToMe === 'true',
        };
    }
};

async function fetchFromDatabase(request: NextRequest, auth: { sub: string; email: string }) {

    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = InboxQuerySchema.parse(searchParams);


    const where: Record<string, unknown> = {};

    if (query.channel) {
        where.channel = { type: query.channel };
    }
    if (query.status) {
        where.status = query.status;
    }
    if (query.assignedToMe) {
        where.assignedAgentId = auth.sub;
    }
    if (query.search) {
        where.OR = [
            { contact: { displayName: { contains: query.search, mode: 'insensitive' } } },
            { lastMessagePreview: { contains: query.search, mode: 'insensitive' } },
        ];
    }

    const [conversations, total] = await Promise.all([
        prisma.conversation.findMany({
            where,
            select: {
                id: true,
                status: true,
                isStarred: true,
                isSpam: true,
                lastMessagePreview: true,
                lastMessageAt: true,
                unreadCount: true,
                contact: { select: { displayName: true, avatarUrl: true, platformContactId: true } },
                channel: { select: { type: true } },
                assignedAgent: { select: { name: true } },
            },
            orderBy: { lastMessageAt: 'desc' },
            take: query.limit,
            skip: (query.page - 1) * query.limit,
        }),
        prisma.conversation.count({ where }),
    ]);

    const uniquePsids = new Set<string>();
    const items = [];

    for (const conv of conversations as Record<string, any>[]) {
        const psid = conv.contact.platformContactId;
        if (!psid || !uniquePsids.has(psid)) {
            if (psid) uniquePsids.add(psid);
            items.push({
                id: conv.id,
                contactName: conv.contact.displayName,
                contactAvatar: conv.contact.avatarUrl,
                contactPsid: psid,
                channelType: conv.channel.type,
                status: conv.status,
                isStarred: conv.isStarred || false,
                isSpam: conv.isSpam || false,
                lastMessage: conv.lastMessagePreview,
                lastMessageAt: conv.lastMessageAt,
                unreadCount: conv.unreadCount,
                assignedAgent: conv.assignedAgent?.name || null,
                tags: [],
            });
        }
    }

    return { items, total, page: query.page, limit: query.limit };
}

// Mock fallback removed — DB only

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return errorResponse('ไม่ได้เข้าสู่ระบบ', 401);
        }

        const result = await fetchFromDatabase(request, auth);

        return Response.json({
            success: true,
            data: result.items,
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: Math.ceil(result.total / result.limit),
            },
        }, {
            headers: { 'Cache-Control': 's-maxage=5, stale-while-revalidate=30' },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
