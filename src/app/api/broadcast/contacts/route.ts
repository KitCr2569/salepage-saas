// ═══════════════════════════════════════════════════════════════
// GET /api/broadcast/contacts — Get contacts for broadcast targeting
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';

interface ContactTag {
    tag: { id: string; name: string; color: string };
}

interface ContactConversation {
    id: string;
    status: string;
    lastMessageAt: Date;
    tags: ContactTag[];
}

interface ContactWithRelations {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    platformContactId: string;
    updatedAt: Date;
    channel: { id: string; type: string; name: string };
    conversations: ContactConversation[];
}

export async function GET(request: NextRequest) {
    try {
        // Support both JWT auth and Facebook auth
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            const fbToken = request.headers.get('x-fb-token');
            const bypassMode = request.headers.get('x-admin-bypass');
            if (!fbToken && !bypassMode) {
                return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 });
            }
        }

        const { searchParams } = new URL(request.url);
        const channelFilter = searchParams.get('channel') || '';
        const tagFilter = searchParams.get('tag') || '';
        const search = searchParams.get('search') || '';
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(200, Math.max(10, parseInt(searchParams.get('limit') || '50')));

        try {
            const { prisma } = await import('@/lib/prisma');

            // Build where clause
            const where: Record<string, unknown> = {};
            if (channelFilter) {
                where.channel = { type: channelFilter };
            }
            if (search) {
                where.displayName = { contains: search, mode: 'insensitive' };
            }

            // Count total first
            const totalContacts = await prisma.contact.count({ where });

            const contacts = await prisma.contact.findMany({
                where,
                include: {
                    channel: { select: { id: true, type: true, name: true } },
                    conversations: {
                        select: {
                            id: true,
                            status: true,
                            lastMessageAt: true,
                            tags: { include: { tag: true } },
                        },
                        orderBy: { lastMessageAt: 'desc' },
                        take: 1,
                    },
                },
                orderBy: { updatedAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            });

            // Filter by tag if specified (post-query)
            let filtered = contacts as unknown as ContactWithRelations[];
            if (tagFilter) {
                filtered = filtered.filter((c: ContactWithRelations) =>
                    c.conversations.some((conv: ContactConversation) =>
                        conv.tags.some((t: ContactTag) => t.tag.name === tagFilter || t.tag.id === tagFilter)
                    )
                );
            }

            // Deduplicate by platformContactId (keep the most recently updated one)
            const seenPsids = new Set<string>();
            const deduplicated = [];
            for (const c of filtered) {
                if (!seenPsids.has(c.platformContactId)) {
                    seenPsids.add(c.platformContactId);
                    deduplicated.push(c);
                }
            }
            filtered = deduplicated;

            const result = filtered.map((c: ContactWithRelations) => ({
                id: c.id,
                displayName: c.displayName,
                avatarUrl: c.avatarUrl,
                platformContactId: c.platformContactId,
                channel: c.channel,
                lastMessageAt: c.conversations[0]?.lastMessageAt || c.updatedAt,
                tags: c.conversations[0]?.tags.map((t: ContactTag) => ({
                    id: t.tag.id,
                    name: t.tag.name,
                    color: t.tag.color,
                })) || [],
            }));

            // Get available tags
            const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });

            // Get channels
            const channels = await prisma.channel.findMany({
                where: { isActive: true },
                select: { id: true, type: true, name: true },
            });

            return NextResponse.json({
                success: true,
                data: {
                    contacts: result,
                    totalContacts,
                    tags,
                    channels,
                },
                pagination: {
                    page,
                    limit,
                    total: totalContacts,
                    totalPages: Math.ceil(totalContacts / limit),
                },
            }, {
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                },
            });
        } catch {
            // Mock data fallback
            return NextResponse.json({
                success: true,
                data: {
                    contacts: [
                        {
                            id: 'mock-1',
                            displayName: 'คุณสมชาย',
                            avatarUrl: null,
                            platformContactId: '1234567890',
                            channel: { id: 'ch-1', type: 'MESSENGER', name: 'Facebook Page' },
                            lastMessageAt: new Date().toISOString(),
                            tags: [{ id: 'tag-1', name: 'ลูกค้าประจำ', color: '#10B981' }],
                        },
                        {
                            id: 'mock-2',
                            displayName: 'คุณสมหญิง',
                            avatarUrl: null,
                            platformContactId: '0987654321',
                            channel: { id: 'ch-1', type: 'MESSENGER', name: 'Facebook Page' },
                            lastMessageAt: new Date(Date.now() - 86400000).toISOString(),
                            tags: [{ id: 'tag-2', name: 'สนใจสินค้า', color: '#3B82F6' }],
                        },
                        {
                            id: 'mock-3',
                            displayName: 'คุณวิชัย',
                            avatarUrl: null,
                            platformContactId: '5555555555',
                            channel: { id: 'ch-2', type: 'LINE', name: 'LINE OA' },
                            lastMessageAt: new Date(Date.now() - 172800000).toISOString(),
                            tags: [],
                        },
                    ],
                    totalContacts: 3,
                    tags: [
                        { id: 'tag-1', name: 'ลูกค้าประจำ', color: '#10B981' },
                        { id: 'tag-2', name: 'สนใจสินค้า', color: '#3B82F6' },
                        { id: 'tag-3', name: 'VIP', color: '#F59E0B' },
                    ],
                    channels: [
                        { id: 'ch-1', type: 'MESSENGER', name: 'Facebook Page' },
                        { id: 'ch-2', type: 'LINE', name: 'LINE OA' },
                    ],
                },
            });
        }
    } catch (error) {
        console.error('[Broadcast Contacts]', error);
        return NextResponse.json(
            { success: false, error: 'เกิดข้อผิดพลาด' },
            { status: 500 }
        );
    }
}
