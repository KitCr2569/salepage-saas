// ═══════════════════════════════════════════════════════════════
// GET /api/orders/export — Export orders as CSV
// Query: ?format=csv&period=all|today|week|month
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { getShopFromRequest } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

function getPeriodStart(period: string): Date {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (period) {
        case 'today': return today;
        case 'week': return new Date(today.getTime() - 7 * 86400000);
        case 'month': return new Date(today.getTime() - 30 * 86400000);
        default: return new Date(0);
    }
}

function escapeCSV(val: string): string {
    if (!val) return '';
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
}

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { shop } = await getShopFromRequest(request);
        const period = request.nextUrl.searchParams.get('period') || 'all';
        const periodStart = getPeriodStart(period);

        const orders = await prisma.ecommerceOrder.findMany({
            where: {
                shopId: shop.id,
                createdAt: { gte: periodStart },
            },
            orderBy: { createdAt: 'desc' },
            select: {
                orderNumber: true,
                customerData: true,
                itemsData: true,
                itemCount: true,
                subtotal: true,
                shippingCost: true,
                total: true,
                payment: true,
                status: true,
                shipping: true,
                trackingNumber: true,
                shippingProvider: true,
                discountCode: true,
                note: true,
                createdAt: true,
                paidAt: true,
            },
        });

        // CSV Header (BOM for Excel Thai support)
        const BOM = '\uFEFF';
        const headers = [
            'เลขออเดอร์', 'วันที่', 'ลูกค้า', 'โทรศัพท์', 'Email', 'ที่อยู่',
            'สินค้า', 'จำนวนรายการ', 'ยอดสินค้า', 'ค่าส่ง', 'ยอดรวม',
            'ช่องทางชำระ', 'สถานะ', 'ขนส่ง', 'เลขพัสดุ', 'โค้ดส่วนลด', 'หมายเหตุ', 'วันที่ชำระ',
        ];

        const rows = orders.map(order => {
            const cust = typeof order.customerData === 'string'
                ? JSON.parse(order.customerData) : (order.customerData || {}) as any;
            const items = typeof order.itemsData === 'string'
                ? JSON.parse(order.itemsData) : (order.itemsData || []) as any[];

            const itemsSummary = Array.isArray(items)
                ? items.map((i: any) => `${i.name || ''}(x${i.quantity || 1})`).join(' | ')
                : '';

            const address = [cust.address, cust.subdistrict, cust.district, cust.province, cust.postalCode]
                .filter(Boolean).join(' ');

            const provider = order.shippingProvider?.startsWith('Proship|')
                ? order.shippingProvider.split('|')[2] || ''
                : order.shippingProvider || '';

            return [
                order.orderNumber,
                new Date(order.createdAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
                cust.name || '',
                cust.phone || '',
                cust.email || '',
                address,
                itemsSummary,
                order.itemCount,
                Number(order.subtotal || 0),
                Number(order.shippingCost || 0),
                Number(order.total || 0),
                order.payment || '',
                order.status || '',
                provider,
                order.trackingNumber || '',
                order.discountCode || '',
                order.note || '',
                order.paidAt ? new Date(order.paidAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : '',
            ].map(v => escapeCSV(String(v)));
        });

        const csv = BOM + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        const filename = `orders_${period}_${new Date().toISOString().slice(0, 10)}.csv`;

        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error: any) {
        console.error('[Export] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
