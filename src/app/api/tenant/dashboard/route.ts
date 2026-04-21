import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth || !(auth as any).tenantId) {
            return NextResponse.json({ success: false, error: "Unauthorized or not a Tenant" }, { status: 401 });
        }

        const tenantId = (auth as any).tenantId;

        // 1. Get all shops for this tenant
        const shops = await prisma.shop.findMany({
            where: { tenantId },
            select: { id: true, name: true, slug: true, logo: true }
        });

        const shopIds = shops.map((s: any) => s.id);

        // 2. Fetch all orders for these shops
        // We only want to count orders that are not pending/cancelled, or maybe all depending on business logic.
        // Let's grab all orders and aggregate in memory for simplicity (since it's a demo, volume is low enough).
        // For production, we'd use prisma.ecommerceOrder.groupBy or raw SQL
        const orders = await prisma.ecommerceOrder.findMany({
            where: { shopId: { in: shopIds } },
            select: {
                shopId: true,
                total: true,
                status: true,
                createdAt: true,
            }
        });

        let totalRevenue = 0;
        let totalOrders = 0;
        let pendingOrders = 0;

        const shopMetrics: Record<string, { name: string, logo: string | null, revenue: number, orders: number }> = {};
        shops.forEach((s: any) => {
            shopMetrics[s.id] = { name: s.name, logo: s.logo, revenue: 0, orders: 0 };
        });

        orders.forEach((order: any) => {
            totalOrders++;
            if (order.status === 'pending') {
                pendingOrders++;
            }
            
            // Assuming we count all non-cancelled towards "Revenue" or just 'completed' and 'shipped'
            // For now, let's sum everything not cancelled
            if (order.status !== 'cancelled') {
                const val = Number(order.total);
                totalRevenue += val;
                if (order.shopId && shopMetrics[order.shopId]) {
                    shopMetrics[order.shopId].revenue += val;
                    shopMetrics[order.shopId].orders++;
                }
            }
        });

        const sortedShops = Object.values(shopMetrics).sort((a, b) => b.revenue - a.revenue);

        return NextResponse.json({
            success: true,
            data: {
                totalRevenue,
                totalOrders,
                pendingOrders,
                totalShops: shops.length,
                shops: sortedShops
            }
        });

    } catch (e: any) {
        console.error("Dashboard Aggregation Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
