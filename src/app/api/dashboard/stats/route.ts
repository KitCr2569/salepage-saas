import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// ⚡ In-memory cache — 30 วินาที
let _statsCache: { data: any; expiry: number } | null = null;
const STATS_CACHE_TTL = 30_000;

async function fetchStats() {
    // ใช้ cache ถ้ายังไม่หมดอายุ
    if (_statsCache && Date.now() < _statsCache.expiry) {
        return _statsCache.data;
    }
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 86400000);

        // Run ALL queries in parallel — single round-trip
        const [
            totalContacts,
            totalConversations,
            totalMessages,
            allOrdersRaw,
        ] = await Promise.all([
            prisma.contact.count(),
            prisma.conversation.count(),
            prisma.message.count(),
            prisma.ecommerceOrder.findMany({
                where: { status: { notIn: ['cancelled', 'คืนสินค้า'] } },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        // Filter valid orders like in /api/orders (remote already filtered cancelled/returned via prisma)
        const allOrders = allOrdersRaw.filter((o: any) => {
            if (o.note && o.note.includes('tempcart_')) return false;
            if (o.note && o.note.includes('ย้ายไปคุยผ่าน Messenger')) return false;
            const cust = typeof o.customerData === 'string' ? JSON.parse(o.customerData) : o.customerData;
            if (cust && cust.name === 'จาก Messenger') return false;
            return true;
        });

        // Process orders
        const todayOrders = allOrders.filter((o: any) => o.createdAt >= today);
        const weekOrders = allOrders.filter((o: any) => o.createdAt >= weekAgo);

        const totalOrderCount = allOrders.length;
        const todayOrderCount = todayOrders.length;

        const totalRevenue = allOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
        const todayRevenue = todayOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
        const weekRevenue = weekOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);

        // Top products from JSON itemsData
        const productCounts: Record<string, number> = {};
        allOrders.forEach((o: any) => {
            const items = o.itemsData as any[];
            if (!Array.isArray(items)) return;
            items.forEach((item: any) => {
                const name = item.name || item.productName || 'Unknown';
                productCounts[name] = (productCounts[name] || 0) + (item.quantity || 1);
            });
        });
        const topProducts = Object.entries(productCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        // Daily data (last 7 days)
        const dailyData: Record<string, { orders: number; revenue: number }> = {};
        weekOrders.forEach((o: any) => {
            const key = o.createdAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' });
            if (!dailyData[key]) dailyData[key] = { orders: 0, revenue: 0 };
            dailyData[key].orders++;
            dailyData[key].revenue += Number(o.total || 0);
        });

        // Recent orders (mapped to display format)
        const customerData = (o: any) => {
            const cd = o.customerData as any;
            return {
                name: cd?.name || cd?.fullName || o.facebookName || 'ลูกค้า',
                phone: cd?.phone || cd?.tel || '',
            };
        };

        const recentOrders = allOrders.slice(0, 5).map((o: any) => {
            const cust = customerData(o);
            const items = (o.itemsData as any[]) || [];
            return {
                id: o.orderNumber || o.id.substring(0, 8),
                customer: cust.name,
                phone: cust.phone,
                total: Number(o.total || 0),
                date: o.createdAt.toISOString(),
                status: o.status,
                itemCount: items.reduce((s: number, i: any) => s + (i.quantity || 1), 0),
            };
        });

        const result = {
            totalContacts,
            totalConversations,
            totalMessages,
            totalOrders: allOrders.length,
            totalRevenue,
            todayOrders: todayOrderCount,
            todayRevenue,
            weekOrders: weekOrders.length,
            weekRevenue,
            avgOrder: allOrders.length > 0 ? Math.round(totalRevenue / allOrders.length) : 0,
            topProducts,
            dailyData: Object.entries(dailyData),
            recentOrders,
        };
        // บันทึก cache
        _statsCache = { data: result, expiry: Date.now() + STATS_CACHE_TTL };
        return result;
    } catch (error) {
        console.error('Dashboard stats error:', error);
        throw error;
    }
}

export async function GET() {
    try {
        const data = await fetchStats();
        return NextResponse.json({
            success: true,
            data,
        }, {
            headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
    }
}
