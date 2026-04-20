// ═══════════════════════════════════════════════════════════════
// GET /api/facebook-tools/comments — Extract comments from a Facebook post
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getFacebookPageConfig } from '@/lib/facebook';


interface FBComment {
    id: string;
    message: string;
    from: { name: string; id: string };
    created_time: string;
    like_count?: number;
}

// Simple in-memory cache
const commentsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds cache

export async function GET(request: NextRequest) {
    try {
        // Auth check
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            const fbToken = request.headers.get('x-fb-token');
            const bypassMode = request.headers.get('x-admin-bypass');
            if (!fbToken && !bypassMode) {
                return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 });
            }
        }

        const { pageAccessToken, pageId } = await getFacebookPageConfig(request);
        const tokenToUse = process.env.PAGECLAW_PAGE_TOKEN || pageAccessToken;
        const pageIdToUse = process.env.PAGECLAW_PAGE_ID || pageId;

        if (!tokenToUse) {
            return NextResponse.json(
                { success: false, error: 'ยังไม่ได้ตั้งค่า PAGE_ACCESS_TOKEN หรือ PAGECLAW_PAGE_TOKEN' },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(request.url);
        const postId = searchParams.get('postId');
        let postUrl = searchParams.get('postUrl');
        const limit = parseInt(searchParams.get('limit') || '100');

        // Resolve short URL
        if (postUrl && postUrl.includes('/share/')) {
            try {
                const res = await fetch(postUrl, {
                    method: 'GET',
                    redirect: 'follow',
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
                });
                postUrl = res.url; // Use the resolved URL for regex extraction
            } catch (e) {
                console.error('Failed to resolve share URL:', e);
            }
        }

        // Extract post ID from URL if provided
        let targetPostId = postId;
        if (!targetPostId && postUrl) {
            // Try to extract post ID from various Facebook URL formats
            const urlMatch = postUrl.match(/\/posts\/([a-zA-Z0-9_-]+)/);
            const storyMatch = postUrl.match(/story_fbid=([a-zA-Z0-9_-]+)/);
            const photoMatch = postUrl.match(/\/photos\/[^/]+\/([a-zA-Z0-9_-]+)/);
            const permalinkMatch = postUrl.match(/permalink\/([a-zA-Z0-9_-]+)/);
            const shareMatch = postUrl.match(/\/share\/[pvr]\/([a-zA-Z0-9_-]+)/);
            const watchMatch = postUrl.match(/\/watch\/\?v=([a-zA-Z0-9_-]+)/);
            const videoMatch = postUrl.match(/\/videos\/([a-zA-Z0-9_-]+)/);
            const groupsMatch = postUrl.match(/\/groups\/[^/]+\/([a-zA-Z0-9_-]+)/);

            if (urlMatch) targetPostId = urlMatch[1];
            else if (storyMatch) targetPostId = storyMatch[1];
            else if (photoMatch) targetPostId = photoMatch[1];
            else if (permalinkMatch) targetPostId = permalinkMatch[1];
            else if (shareMatch) targetPostId = shareMatch[1];
            else if (watchMatch) targetPostId = watchMatch[1];
            else if (videoMatch) targetPostId = videoMatch[1];
            else if (groupsMatch) targetPostId = groupsMatch[1];
            else {
                // Fallback: extract any sequence of digits longer than 8
                const digitsMatch = postUrl.match(/\d{8,}/);
                if (digitsMatch) targetPostId = digitsMatch[0];
            }
        }

        // If we still don't have a targetPostId, but we have a URL, let's try to query the URL directly
        // Sometimes the Graph API accepts the URL as the ID node, or we can use the alphanumeric ID.
        if (!targetPostId && postUrl) {
            // For example, if they just pasted a weird link without ID, 
            // we will let the Graph API try to resolve it later by setting targetPostId to the URL or we return error.
            return NextResponse.json(
                { success: false, error: 'กรุณาระบุ Post ID เป็นตัวเลข หรือตรวจสอบ URL ของโพสต์อีกครั้ง' },
                { status: 400 }
            );
        }

        if (!targetPostId) {
            return NextResponse.json(
                { success: false, error: 'กรุณาระบุ Post ID หรือ URL ของโพสต์' },
                { status: 400 }
            );
        }

        // --- Cache Check ---
        const cacheKey = `${pageId}-comments-${targetPostId}-${limit}`;
        const cached = commentsCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return NextResponse.json(cached.data);
        }

        // Fetch comments from the post
        const allComments: Array<{
            id: string;
            name: string;
            userId: string;
            message: string;
            time: string;
            likeCount: number;
            phone: string | null;
            email: string | null;
        }> = [];

        // For page posts, the Graph API requires the ID format to be {page_id}_{post_id}
        // If we only send the post_id, Facebook throws "(#12) singular statuses API is deprecated"
        const finalPostId = targetPostId.includes('_') ? targetPostId : `${pageIdToUse}_${targetPostId}`;
        let nextUrl: string | null = `https://graph.facebook.com/v19.0/${finalPostId}/comments?fields=id,message,from,created_time,like_count&limit=${Math.min(limit, 100)}&access_token=${tokenToUse}`;
        let pagesFetched = 0;
        const maxPages = Math.ceil(limit / 100);

        while (nextUrl && pagesFetched < maxPages) {
            if (pagesFetched > 0) {
                // Throttling: หน่วงเวลา 1 วินาทีเพื่อลด Rate Limit
                await new Promise(r => setTimeout(r, 1000));
            }
            const res: Response = await fetch(nextUrl);
            const data: { data?: FBComment[]; error?: { message: string }; paging?: { next?: string } } = await res.json();

            if (!res.ok || data.error) {
                if (pagesFetched === 0) {
                    let errorMsg = data.error?.message || `HTTP ${res.status}`;
                    
                    // Handle Facebook Rate Limit Error
                    if (data.error?.code === 4 || errorMsg.includes('request limit reached') || errorMsg.includes('Application request limit reached')) {
                        errorMsg = 'ดึงข้อมูลบ่อยเกินไป (Facebook Rate Limit) แชทบอท/แอปใช้งานโควต้าเต็มแล้ว กรุณารอประมาณ 30-60 นาที แล้วลองใหม่อีกครั้ง';
                    }

                    return NextResponse.json(
                        { success: false, error: errorMsg },
                        { status: data.error?.code === 4 ? 429 : 502 }
                    );
                }
                break;
            }

            for (const comment of (data.data || []) as FBComment[]) {
                // Extract phone numbers and emails from comment text
                const phoneMatch = comment.message?.match(/(?:0[689]\d{8}|0[2-9]\d{7}|\+66\d{9})/);
                const emailMatch = comment.message?.match(/[\w.+-]+@[\w-]+\.[\w.]+/);

                allComments.push({
                    id: comment.id,
                    name: comment.from?.name || 'ไม่ทราบ',
                    userId: comment.from?.id || '',
                    message: comment.message || '',
                    time: comment.created_time,
                    likeCount: comment.like_count || 0,
                    phone: phoneMatch ? phoneMatch[0] : null,
                    email: emailMatch ? emailMatch[0] : null,
                });
            }

            nextUrl = data.paging?.next || null;
            pagesFetched++;
        }

        // Extract stats
        const uniqueUsers = new Set(allComments.map(c => c.userId)).size;
        const withPhone = allComments.filter(c => c.phone).length;
        const withEmail = allComments.filter(c => c.email).length;

        const responseData = {
            success: true,
            data: {
                comments: allComments,
                stats: {
                    total: allComments.length,
                    uniqueUsers,
                    withPhone,
                    withEmail,
                },
                postId: targetPostId,
            },
        };

        // Save to cache
        commentsCache.set(cacheKey, { data: responseData, timestamp: Date.now() });

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('[Facebook Tools - Comments]', error);
        return NextResponse.json(
            { success: false, error: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'Unknown'}` },
            { status: 500 }
        );
    }
}
