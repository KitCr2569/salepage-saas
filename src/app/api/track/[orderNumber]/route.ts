// ═══════════════════════════════════════════════════════════════
// GET /api/track/[orderNumber] — Public order tracking API
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ orderNumber: string }> }
) {
    try {
        const { orderNumber } = await params;

        // Look up in EcommerceOrder (sale page orders)
        const ecomOrder = await (prisma.ecommerceOrder as any).findUnique({
            where: { orderNumber },
        });

        if (ecomOrder) {
            const customer = (ecomOrder.customerData as any) || {};
            const items = (ecomOrder.itemsData as any[]) || [];
            return NextResponse.json({
                success: true,
                data: {
                    orderNumber: ecomOrder.orderNumber,
                    customerName: customer.name || '-',
                    status: ecomOrder.status,
                    total: Number(ecomOrder.total),
                    shipping: ecomOrder.shipping || '',
                    trackingNumber: ecomOrder.trackingNumber || null,
                    shippingProvider: ecomOrder.shippingProvider || null,
                    createdAt: ecomOrder.createdAt.toISOString(),
                    paidAt: null,
                    items: items.map((item: any) => ({
                        name: item.name || item.productName || '',
                        quantity: item.quantity || 1,
                        image: item.image || null,
                    })),
                },
            });
        }

        // Fallback: look up in chat Order
        const chatOrder = await (prisma.order as any).findUnique({
            where: { orderNumber },
            include: { items: { select: { name: true, quantity: true, image: true } } },
        });

        if (chatOrder) {
            return NextResponse.json({
                success: true,
                data: {
                    orderNumber: chatOrder.orderNumber,
                    customerName: chatOrder.customerName,
                    status: chatOrder.status.toLowerCase(),
                    total: Number(chatOrder.total),
                    shipping: chatOrder.shippingMethod || '',
                    trackingNumber: null,
                    shippingProvider: null,
                    createdAt: chatOrder.createdAt.toISOString(),
                    paidAt: chatOrder.paidAt?.toISOString() || null,
                    items: chatOrder.items.map((item: any) => ({
                        name: item.name,
                        quantity: item.quantity,
                        image: item.image || null,
                    })),
                },
            });
        }

        return NextResponse.json({ success: false, error: 'ไม่พบคำสั่งซื้อ' }, { status: 404 });
    } catch (error) {
        console.error('[Track] Error:', error);
        return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}
