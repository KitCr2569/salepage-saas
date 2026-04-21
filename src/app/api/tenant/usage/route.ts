// ═══════════════════════════════════════════════════════════════
// GET /api/tenant/usage — Returns usage info (products, shops, features)
// for the authenticated tenant. Used by admin dashboard UI.
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth";
import { getUsageInfo } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const tenantId = (auth as any).tenantId;
        if (!tenantId) {
            // Agent/staff — no tenant-level usage
            return NextResponse.json({
                success: true,
                data: null,
                message: "No tenant context (staff login)",
            });
        }

        const usage = await getUsageInfo(tenantId);

        return NextResponse.json({
            success: true,
            data: usage,
        });
    } catch (e: any) {
        console.error("[tenant/usage] Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
