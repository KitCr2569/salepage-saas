// ═══════════════════════════════════════════════════════════════
// GET /api/orders/stream — Server-Sent Events for real-time order updates
// Replaces polling with push-based notifications
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { getShopFromRequest } from '@/lib/tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    // Verify auth
    const auth = await getAuthFromRequest(request);
    if (!auth) {
        return new Response('Unauthorized', { status: 401 });
    }

    let shopId: string;
    try {
        const { shop } = await getShopFromRequest(request);
        shopId = shop.id;
    } catch {
        return new Response('Shop not found', { status: 404 });
    }

    const encoder = new TextEncoder();
    let isActive = true;

    // Per-connection state (NOT global) — prevents cross-tenant leakage
    let lastSeenOrderId: string | null = null;

    const stream = new ReadableStream({
        async start(controller) {
            // Send initial connection event
            controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`));

            // Initialize with latest order for THIS shop
            try {
                const latest = await prisma.ecommerceOrder.findFirst({
                    where: { shopId },
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, createdAt: true },
                });
                if (latest) lastSeenOrderId = latest.id;
            } catch {}

            // Poll DB every 5 seconds for new orders
            const interval = setInterval(async () => {
                if (!isActive) {
                    clearInterval(interval);
                    return;
                }

                try {
                    // Build query — only fetch orders newer than the last seen
                    let createdAfter = new Date(0);
                    if (lastSeenOrderId) {
                        const lastOrder = await prisma.ecommerceOrder.findUnique({
                            where: { id: lastSeenOrderId },
                            select: { createdAt: true },
                        });
                        if (lastOrder) createdAfter = lastOrder.createdAt;
                    }

                    const newOrders = await prisma.ecommerceOrder.findMany({
                        where: {
                            shopId,
                            createdAt: { gt: createdAfter },
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                        select: {
                            id: true,
                            orderNumber: true,
                            customerData: true,
                            itemsData: true,
                            total: true,
                            status: true,
                            createdAt: true,
                        },
                    });

                    if (newOrders.length > 0 && newOrders[0].id !== lastSeenOrderId) {
                        lastSeenOrderId = newOrders[0].id;

                        for (const order of newOrders) {
                            const cust = typeof order.customerData === 'string' 
                                ? JSON.parse(order.customerData) 
                                : (order.customerData || {}) as any;
                            const items = typeof order.itemsData === 'string'
                                ? JSON.parse(order.itemsData)
                                : (order.itemsData || []) as any;

                            const event = {
                                type: 'new_order',
                                order: {
                                    id: order.orderNumber,
                                    customer: cust.name || 'ลูกค้า',
                                    phone: cust.phone || '-',
                                    items: Array.isArray(items) ? items.map((i: any) => ({
                                        name: i.name || '',
                                        variantName: i.variantName || '',
                                        quantity: i.quantity || 1,
                                        price: i.price || 0,
                                    })) : [],
                                    total: Number(order.total || 0),
                                    status: order.status,
                                    date: order.createdAt.toISOString(),
                                },
                            };

                            controller.enqueue(
                                encoder.encode(`event: new_order\ndata: ${JSON.stringify(event)}\n\n`)
                            );
                        }
                    }

                    // Send heartbeat to keep connection alive
                    controller.enqueue(encoder.encode(`: heartbeat ${new Date().toISOString()}\n\n`));
                } catch (err) {
                    console.error('[SSE] Error checking orders:', err);
                }
            }, 5000);

            // Clean up when connection closes
            request.signal.addEventListener('abort', () => {
                isActive = false;
                clearInterval(interval);
                try { controller.close(); } catch {}
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable nginx buffering
        },
    });
}
