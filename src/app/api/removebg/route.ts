// ═══════════════════════════════════════════════════════════════
// POST /api/removebg — Proxy for remove.bg API
// Used by the embedded Template Studio iframe
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        // The API key is sent from the client in the X-Api-Key header
        const apiKey = request.headers.get('X-Api-Key');
        if (!apiKey) {
            return NextResponse.json(
                { error: 'Missing X-Api-Key header' },
                { status: 400 }
            );
        }

        // Forward the request body (FormData) to remove.bg
        const formData = await request.formData();

        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: {
                'X-Api-Key': apiKey,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[removebg] API error:', response.status, errorText);
            return NextResponse.json(
                { error: `remove.bg: HTTP ${response.status}` },
                { status: response.status }
            );
        }

        // Return the processed image as binary
        const imageBuffer = await response.arrayBuffer();
        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'no-store',
            },
        });
    } catch (error: any) {
        console.error('[removebg] Proxy error:', error);
        return NextResponse.json(
            { error: error?.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
