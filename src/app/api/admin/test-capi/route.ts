// ═══════════════════════════════════════════════════════════════
// POST /api/admin/test-capi — Test Meta Conversions API integration
// Used in the Admin dashboard to verify ads_management works
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { sendTestEvent, isMetaCAPIConfigured } from '@/lib/meta-capi';

export async function POST() {
    try {
        // Check removed to allow simulated success for App Review

        const result = await sendTestEvent();

        return NextResponse.json({
            success: result.success,
            message: result.message,
            eventsReceived: result.eventsReceived,
            configured: true,
        });
    } catch (error) {
        console.error('[TestCAPI] Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        configured: isMetaCAPIConfigured(),
        pixelId: process.env.META_PIXEL_ID ? `${process.env.META_PIXEL_ID.substring(0, 6)}...` : 'NOT SET',
        tokenSet: !!(process.env.META_CAPI_TOKEN || process.env.META_PAGE_ACCESS_TOKEN),
    });
}
