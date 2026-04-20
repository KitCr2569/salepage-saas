// One-time utility: Whitelist domain for Messenger Extensions
import { NextResponse } from 'next/server';
import { getFacebookPageConfig } from '@/lib/facebook';


export async function POST() {
    try {
        const token = process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN || '';

        if (!token) {
            return NextResponse.json({ 
                error: 'No page access token found in env vars',
                hint: 'Set META_PAGE_ACCESS_TOKEN or PAGE_ACCESS_TOKEN env var',
                envKeys: Object.keys(process.env).filter(k => k.includes('TOKEN') || k.includes('META') || k.includes('PAGE')),
            }, { status: 400 });
        }

        // Call Messenger Profile API to whitelist domain
        const { pageAccessToken, pageId } = await getFacebookPageConfig();

        const res = await fetch(
            `https://graph.facebook.com/v19.0/me/messenger_profile?access_token=${token}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    whitelisted_domains: ['https://www.hdgwrapskin.com', 'https://hdgwrapskin.com'],
                }),
            }
        );

        const result = await res.json();
        return NextResponse.json({ success: res.ok, result, tokenPreview: token.substring(0, 15) + '...' });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
