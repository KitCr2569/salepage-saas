// ═══════════════════════════════════════════════════════════════
// GET /api/avatar/[psid] — Server-side proxy for Facebook profile pictures
// Fetches avatar via Graph API using page access token (kept server-side)
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getFacebookPageConfig } from '@/lib/facebook';


export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ psid: string }> }
) {
    const { psid } = await params;

    if (!psid || psid.length < 5) {
        return NextResponse.json({ error: 'Invalid PSID' }, { status: 400 });
    }

    const token = process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN;
    if (!token) {
        return NextResponse.json({ error: 'No token configured' }, { status: 500 });
    }

    try {
        // Use Graph API picture endpoint — redirects to actual image
        const fbUrl = `https://graph.facebook.com/v19.0/${psid}/picture?width=200&height=200&access_token=${token}`;
        const { pageAccessToken, pageId } = await getFacebookPageConfig();

        const res = await fetch(fbUrl, { redirect: 'follow' });

        if (!res.ok) {
            // Return a 1x1 transparent pixel as fallback
            return new NextResponse(null, { status: 404 });
        }

        const imageBuffer = await res.arrayBuffer();
        const contentType = res.headers.get('content-type') || 'image/jpeg';

        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24h
            },
        });
    } catch (error) {
        console.error('[Avatar Proxy] Error:', error);
        return new NextResponse(null, { status: 500 });
    }
}
