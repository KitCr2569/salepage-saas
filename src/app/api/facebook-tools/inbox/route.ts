// ═══════════════════════════════════════════════════════════════
// GET /api/facebook-tools/inbox — Fetch inbox conversations from Facebook Page
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getFacebookPageConfig } from '@/lib/facebook';

interface FBMessage {
    id: string;
    message: string;
    from: { name: string; id: string };
    created_time: string;
}

interface FBConversation {
    id: string;
    participants: { data: Array<{ name: string; id: string; email?: string }> };
    updated_time: string;
    snippet?: string;
    messages?: { data: FBMessage[] };
}

// Simple in-memory cache
const inboxCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 20 * 1000; // 20 seconds cache

export async function GET(request: NextRequest) {
    try {
        // Auth check (support JWT + FB + bypass)
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            const fbToken = request.headers.get('x-fb-token');
            const bypassMode = request.headers.get('x-admin-bypass');
            if (!fbToken && !bypassMode) {
                return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 });
            }
        }

        const { pageAccessToken, pageId } = await getFacebookPageConfig(request);

        if (!pageAccessToken || !pageId) {
            return NextResponse.json(
                { success: false, error: 'ยังไม่ได้ตั้งค่า PAGE_ACCESS_TOKEN หรือ FACEBOOK_PAGE_ID' },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '25');
        const after = searchParams.get('after') || '';

        // --- Cache Check ---
        const cacheKey = `${pageId}-inbox-${limit}-${after}`;
        const cached = inboxCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return NextResponse.json(cached.data);
        }

        // --- Throttling (Delay) ---
        await new Promise(resolve => setTimeout(resolve, 800)); // หน่วง 800ms ก่อนยิง API

        // Fetch conversations with messages
        let url = `https://graph.facebook.com/v19.0/${pageId}/conversations?fields=participants,updated_time,snippet,messages.limit(3){message,from,created_time}&limit=${limit}&access_token=${pageAccessToken}`;
        if (after) {
            url += `&after=${after}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok || data.error) {
            return NextResponse.json(
                { success: false, error: data.error?.message || `HTTP ${res.status}` },
                { status: 502 }
            );
        }

        // Process conversations
        const conversations = (data.data || []).map((conv: FBConversation) => {
            const participants = conv.participants?.data?.filter(
                (p: { id: string }) => p.id !== pageId
            ) || [];

            const lastMessage = conv.messages?.data?.[0];

            return {
                id: conv.id,
                customerName: participants[0]?.name || 'ไม่ทราบชื่อ',
                customerId: participants[0]?.id || '',
                lastMessage: lastMessage?.message || conv.snippet || '',
                lastMessageFrom: lastMessage?.from?.name || '',
                lastMessageTime: lastMessage?.created_time || conv.updated_time,
                updatedTime: conv.updated_time,
                messageCount: conv.messages?.data?.length || 0,
                recentMessages: (conv.messages?.data || []).map((msg: FBMessage) => ({
                    id: msg.id,
                    text: msg.message,
                    from: msg.from?.name || '',
                    fromId: msg.from?.id || '',
                    isPage: msg.from?.id === pageId,
                    time: msg.created_time,
                })),
            };
        });

        const responseData = {
            success: true,
            data: {
                conversations,
                total: conversations.length,
                paging: {
                    hasNext: !!data.paging?.next,
                    after: data.paging?.cursors?.after || null,
                },
            },
        };

        // Save to cache
        inboxCache.set(cacheKey, { data: responseData, timestamp: Date.now() });

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('[Facebook Tools - Inbox]', error);
        return NextResponse.json(
            { success: false, error: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'Unknown'}` },
            { status: 500 }
        );
    }
}
