// ═══════════════════════════════════════════════════════════════
// GET /api/stock — Returns low stock items for a shop
// Query params:
//   ?threshold=5   (default: 5)
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth";
import { getShopFromRequest } from "@/lib/tenant";
import { getLowStockItems } from "@/lib/stock";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { shop } = await getShopFromRequest(request);
        const threshold = parseInt(request.nextUrl.searchParams.get("threshold") || "5");

        const lowStockItems = await getLowStockItems(shop.id, threshold);

        return NextResponse.json({
            success: true,
            data: {
                threshold,
                count: lowStockItems.length,
                items: lowStockItems,
            },
        });
    } catch (error: any) {
        console.error("[stock] Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
