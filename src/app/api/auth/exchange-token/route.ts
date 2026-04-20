// ═══════════════════════════════════════════════════════════════
// POST /api/auth/exchange-token
// แปลง short-lived user token → long-lived user token
// แล้วดึง Page Access Token (ที่จะเป็น long-lived ด้วย ~60 วัน)
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { shortLivedToken } = (await request.json()) as { shortLivedToken: string };

        if (!shortLivedToken) {
            return NextResponse.json({ success: false, error: 'Missing shortLivedToken' }, { status: 400 });
        }

        const appId = process.env.FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;

        if (!appId || !appSecret) {
            console.warn('[exchange-token] Missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET - returning short-lived token as-is');
            return NextResponse.json({
                success: true,
                longLivedToken: shortLivedToken,
                isLongLived: false,
                message: 'App Secret not configured - using short-lived token',
            });
        }

        // Step 1: Exchange short-lived user token for long-lived user token
        const exchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
        
        const exchangeRes = await fetch(exchangeUrl);
        const exchangeData = (await exchangeRes.json()) as { access_token?: string; error?: { message: string } };

        if (!exchangeRes.ok || exchangeData.error) {
            console.error('[exchange-token] Failed to exchange token:', exchangeData.error?.message);
            return NextResponse.json({
                success: false,
                error: exchangeData.error?.message || 'Failed to exchange token',
            }, { status: 400 });
        }

        const longLivedUserToken = exchangeData.access_token!;

        // Step 2: Get pages with the long-lived user token
        // Page tokens obtained with a long-lived user token are automatically long-lived (~60 days, or never-expire for permanent pages)
        const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedUserToken}`);
        const pagesData = (await pagesRes.json()) as { data?: Array<{ id: string; name: string; access_token: string }> };

        const pages = (pagesData.data || []).map(page => ({
            id: page.id,
            name: page.name,
            picture: `https://graph.facebook.com/${page.id}/picture?width=100&height=100`,
            accessToken: page.access_token, // This is now a long-lived page token!
        }));

        console.log(`[exchange-token] ✅ Exchanged to long-lived token, found ${pages.length} pages`);

        return NextResponse.json({
            success: true,
            longLivedToken: longLivedUserToken,
            isLongLived: true,
            pages,
        });
    } catch (err) {
        console.error('[exchange-token] Error:', err);
        return NextResponse.json({
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
        }, { status: 500 });
    }
}
