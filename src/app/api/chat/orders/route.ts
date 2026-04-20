// ═══════════════════════════════════════════════════════════════
// GET/POST /api/orders — List and create orders
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, errorResponse, successResponse } from '@/lib/api-helpers';
import { verifyToken, extractTokenFromHeaders } from '@/lib/auth';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getPayOrderSummary } from '@/lib/template-loader';

// ─── Mock orders (used when DB is unavailable) ──────────────
const MOCK_ORDERS = [
    {
        id: 'ord-001',
        orderNumber: 'ORD-20260310-001',
        conversationId: 'conv-001',
        contactId: 'contact-001',
        agentId: 'mock-admin-001',
        status: 'CONFIRMED',
        subtotal: 5000,
        discount: 500,
        shippingCost: 0,
        total: 4500,
        customerName: 'นายสมศักดิ์ มั่นคง',
        customerPhone: '081-234-5678',
        customerAddress: '123 ถนนสุขุมวิท เขตคลองเตย กรุงเทพฯ 10110',
        note: 'ต้องการรับของวันศุกร์',
        items: [
            { id: 'item-001', name: 'สินค้า Model X100 (สีดำ)', quantity: 1, unitPrice: 2500, total: 2500 },
            { id: 'item-002', name: 'สินค้า Model X100 (สีขาว)', quantity: 1, unitPrice: 2500, total: 2500 },
        ],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        agent: { id: 'mock-admin-001', name: 'Admin User' },
        contact: { displayName: 'นายสมศักดิ์ มั่นคง' },
    },
    {
        id: 'ord-002',
        orderNumber: 'ORD-20260310-002',
        conversationId: 'conv-003',
        contactId: 'contact-003',
        agentId: 'mock-agent-001',
        status: 'PAID',
        subtotal: 3800,
        discount: 0,
        shippingCost: 50,
        total: 3850,
        customerName: 'fashionlover_bkk',
        customerPhone: null,
        customerAddress: 'Chiang Mai, Thailand',
        note: 'Ship with tracking number',
        items: [
            { id: 'item-003', name: 'Fashion Item Blue Edition', quantity: 2, unitPrice: 1900, total: 3800 },
        ],
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        agent: { id: 'mock-agent-001', name: 'สมชาย ใจดี' },
        contact: { displayName: 'fashionlover_bkk' },
    },
    {
        id: 'ord-003',
        orderNumber: 'ORD-20260310-003',
        conversationId: 'conv-005',
        contactId: 'contact-005',
        agentId: 'mock-admin-001',
        status: 'DRAFT',
        subtotal: 75000,
        discount: 7500,
        shippingCost: 0,
        total: 67500,
        customerName: 'ร้านอาหารครัวคุณยาย',
        customerPhone: null,
        customerAddress: null,
        note: 'สั่งซื้อเหมา 50 ชิ้น — รอยืนยันราคา',
        items: [
            { id: 'item-004', name: 'สินค้าขายส่ง (50 ชิ้น)', quantity: 50, unitPrice: 1500, total: 75000 },
        ],
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        agent: { id: 'mock-admin-001', name: 'Admin User' },
        contact: { displayName: 'ร้านอาหารครัวคุณยาย' },
    },
];

// Status mapping: ecommerceOrder (lowercase) → OrdersPanel (uppercase)
const ECOM_STATUS_MAP: Record<string, string> = {
    pending: 'DRAFT',
    confirmed: 'CONFIRMED',
    shipped: 'SHIPPED',
    completed: 'COMPLETED',
    cancelled: 'CANCELLED',
};

export async function GET(request: NextRequest) {
    try {
        const token = extractTokenFromHeaders(request.headers) || request.cookies.get('auth-token')?.value;
        if (!token) return errorResponse('ไม่ได้เข้าสู่ระบบ', 401);
        await verifyToken(token);

        // ⚡ Pull from ecommerceOrder — same source as /admin#ecommerce-order-summary
        try {
            // ⚡ Lazy Expiry: Trigger cron job manually when page is opened (non-blocking)
            try {
                const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NEXT_PUBLIC_APP_URL || 'https://www.hdgwrapskin.com');
                fetch(`${baseUrl}/api/cron/expire-orders`, {
                    headers: { authorization: `Bearer ${process.env.CRON_SECRET || ''}` }
                }).catch(() => { });
            } catch (e) { }

            const dbOrders = await prisma.ecommerceOrder.findMany({
                orderBy: { createdAt: 'desc' },
            });

            // Filter out junk/legacy orders (same filter as /api/orders GET)
            const validOrders = dbOrders.filter((o: any) => {
                if (o.note && o.note.includes('tempcart_')) return false;
                if (o.note && o.note.includes('ย้ายไปคุยผ่าน Messenger')) return false;
                const cust = typeof o.customerData === 'string' ? JSON.parse(o.customerData) : o.customerData;
                if (cust && cust.name === 'จาก Messenger') return false;
                return true;
            });

            // Map ecommerceOrder → OrdersPanel format
            const mapped = validOrders.map((o: any) => {
                const cust = typeof o.customerData === 'string' ? JSON.parse(o.customerData) : (o.customerData || {});
                const items: any[] = typeof o.itemsData === 'string' ? JSON.parse(o.itemsData) : (o.itemsData || []);

                // Build address string
                let address = cust.address || '';
                if (cust.subdistrict) address += `, ตำบล/แขวง ${cust.subdistrict}`;
                if (cust.district) address += `, อำเภอ/เขต ${cust.district}`;
                if (cust.province) address += `, จังหวัด ${cust.province}`;
                if (cust.postalCode) address += `, ${cust.postalCode}`;
                address = address.replace(/^, /, '');

                return {
                    id: o.id,
                    orderNumber: o.orderNumber,
                    status: ECOM_STATUS_MAP[o.status] || o.status.toUpperCase(),
                    subtotal: Number(o.subtotal || 0),
                    discount: 0,
                    shippingCost: Number(o.shippingCost || 0),
                    total: Number(o.total || 0),
                    customerName: cust.name || o.facebookName || 'ลูกค้า',
                    customerPhone: cust.phone || null,
                    customerAddress: address || null,
                    note: o.note || null,
                    items: items.map((item: any, idx: number) => ({
                        id: `${o.id}-item-${idx}`,
                        name: item.name || 'สินค้า',
                        quantity: item.quantity || 1,
                        unitPrice: Number(item.price || 0),
                        total: Number((item.price || 0) * (item.quantity || 1)),
                    })),
                    agent: null,
                    contact: o.facebookName ? { displayName: o.facebookName } : null,
                    facebookPsid: o.facebookPsid || null,
                    facebookName: o.facebookName || null,
                    paymentSlipUrl: o.paymentSlipUrl || null,
                    paidAt: o.paidAt ? new Date(o.paidAt).toISOString() : null,
                    shipping: o.shipping || '',
                    payment: o.payment || '',
                    trackingNumber: o.trackingNumber || '',
                    createdAt: o.createdAt.toISOString(),
                    updatedAt: o.updatedAt.toISOString(),
                };
            });

            console.log(`[ChatOrders] ✅ Synced ${mapped.length} orders from ecommerceOrder (from ${dbOrders.length} total)`);
            return successResponse(mapped);
        } catch (dbErr) {
            console.error('[ChatOrders] DB Error, falling back to mock:', dbErr);
            return successResponse(MOCK_ORDERS);
        }
    } catch (error) {
        return handleApiError(error);
    }
}

// Reverse status mapping: OrdersPanel (uppercase) → ecommerceOrder (lowercase)
const ECOM_STATUS_REVERSE: Record<string, string> = {
    DRAFT: 'pending',
    CONFIRMED: 'confirmed',
    PAID: 'confirmed',   // ecommerce doesn't have 'paid', map to 'confirmed'
    SHIPPED: 'shipped',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

// PATCH - Update order status (syncs to ecommerceOrder)
export async function PATCH(request: NextRequest) {
    try {
        const token = extractTokenFromHeaders(request.headers) || request.cookies.get('auth-token')?.value;
        if (!token) return errorResponse('ไม่ได้เข้าสู่ระบบ', 401);
        await verifyToken(token);

        const body = await request.json();
        const { id, status } = body;

        if (!id || !status) {
            return errorResponse('ต้องระบุ id และ status', 400);
        }

        const ecomStatus = ECOM_STATUS_REVERSE[status] || status.toLowerCase();

        // Find the order — could be by UUID (id) or by orderNumber
        const existing = await prisma.ecommerceOrder.findFirst({
            where: {
                OR: [
                    { id },
                    { orderNumber: id },
                ],
            },
        });

        if (!existing) {
            return errorResponse('ไม่พบออเดอร์', 404);
        }

        const updated = await prisma.ecommerceOrder.update({
            where: { id: existing.id },
            data: { status: ecomStatus },
        });

        console.log(`[ChatOrders] ✅ Status updated: ${existing.orderNumber} → ${ecomStatus}`);

        return successResponse({
            id: updated.id,
            orderNumber: updated.orderNumber,
            status: ECOM_STATUS_MAP[ecomStatus] || ecomStatus.toUpperCase(),
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const token = extractTokenFromHeaders(request.headers) || request.cookies.get('auth-token')?.value;
        if (!token) return errorResponse('ไม่ได้เข้าสู่ระบบ', 401);
        const auth = await verifyToken(token);
        if (!auth) return errorResponse('ไม่ได้เข้าสู่ระบบ', 401);

        const body = await request.json();
        const { conversationId, contactId, customerName, customerPhone, customerAddress, adminFilledAddress, note, items, discount, shippingCost, shippingMethod, paymentMethod } = body as {
            conversationId?: string;
            contactId: string;
            customerName: string;
            customerPhone?: string;
            customerAddress?: string;
            adminFilledAddress?: boolean;
            note?: string;
            items: { name: string; quantity: number; unitPrice: number; image?: string; variant?: string }[];
            discount?: number;
            shippingCost?: number;
            shippingMethod?: string;
            paymentMethod?: string;
        };

        if (!items || items.length === 0) {
            return errorResponse('ต้องมีสินค้าอย่างน้อย 1 รายการ', 400);
        }

        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const finalDiscount = discount || 0;
        const finalShipping = shippingCost || 0;
        const total = subtotal - finalDiscount + finalShipping;

        // Generate order number (using Thailand timezone)
        const now = new Date();
        const bangkokFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Bangkok',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        const dateStr = bangkokFormatter.format(now).replace(/-/g, '');
        const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
        const orderNumber = `ORD-${dateStr}-${seq}`;

        // ─── Sync order to Sale Page (hdgwrapskin) ─────────────
        const syncToSalePage = async (orderData: {
            orderNumber: string;
            customerName: string;
            customerPhone?: string | null;
            customerAddress?: string | null;
            note?: string | null;
            items: { name: string; quantity: number; unitPrice: number; variant?: string | null }[];
            total: number;
            shippingCost: number;
            shippingMethod?: string;
            paymentMethod?: string;
            facebookPsid?: string | null;
            facebookName?: string | null;
            adminFilledAddress?: boolean;
        }) => {
            const SALEPAGE_URL = process.env.SALEPAGE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.hdgwrapskin.com';
            try {
                await fetch(`${SALEPAGE_URL}/api/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderNumber: orderData.orderNumber,
                        customer: orderData.customerName,
                        phone: orderData.customerPhone || '-',
                        email: '',
                        address: orderData.customerAddress || '',
                        adminFilledAddress: orderData.adminFilledAddress || false,
                        items: orderData.items.map(item => ({
                            productId: '',
                            name: item.name,
                            variantId: '',
                            variantName: item.variant || '',
                            quantity: item.quantity,
                            price: item.unitPrice,
                            image: '',
                        })),
                        total: orderData.total,
                        shipping: orderData.shippingMethod || (orderData.shippingCost > 0 ? 'จัดส่งปกติ' : ''),
                        shippingCost: orderData.shippingCost,
                        payment: orderData.paymentMethod || '',
                        note: `[จากรวมแชท ${orderData.orderNumber}] ${orderData.note || ''}`.trim(),
                        source: 'unified-chat',
                        facebookPsid: orderData.facebookPsid || '',
                        facebookName: orderData.facebookName || orderData.customerName || '',
                    }),
                    signal: AbortSignal.timeout(5000),
                });
                console.log(`[OrderSync] ✅ Synced ${orderData.orderNumber} to Sale Page`);
            } catch (syncError) {
                console.warn(`[OrderSync] ⚠️ Failed to sync ${orderData.orderNumber} to Sale Page:`, syncError);
                // Don't fail the order creation if sync fails
            }
        };


        // Try database
        try {

            // Upsert agent to avoid FK constraint if agent doesn't exist yet
            await prisma.agent.upsert({
                where: { id: auth.sub },
                update: { name: auth.name || 'Admin' },
                create: {
                    id: auth.sub,
                    email: `${auth.sub}@auto.unified-chat.com`,
                    passwordHash: '-',
                    name: auth.name || 'Admin',
                    role: 'ADMIN',
                },
            });

            // Generate unique payment token for payment link
            const paymentToken = randomBytes(16).toString('hex');

            const order = await prisma.order.create({
                data: {
                    orderNumber,
                    conversationId: conversationId || null,
                    contactId,
                    agentId: auth.sub,
                    status: 'DRAFT',
                    subtotal,
                    discount: finalDiscount,
                    shippingCost: finalShipping,
                    total,
                    customerName: customerName || 'ลูกค้า',
                    customerPhone: customerPhone || null,
                    customerAddress: customerAddress || null,
                    note: note || null,
                    shippingMethod: shippingMethod || null,
                    paymentMethod: paymentMethod || null,
                    paymentToken,
                    items: {
                        create: items.map((item: { name: string; quantity: number; unitPrice: number; image?: string; variant?: string }) => ({
                            name: item.name,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            total: item.quantity * item.unitPrice,
                            image: item.image || null,
                            variant: item.variant || null,
                        })),
                    },
                } as any,
                include: {
                    items: true,
                    agent: { select: { id: true, name: true } },
                    contact: { select: { displayName: true } },
                },
            });

            // Create order summary message in conversation
            if (conversationId) {
                const fmt = (n: number) => new Intl.NumberFormat('th-TH').format(n);
                const itemLines = items.map((item: { name: string; quantity: number; unitPrice: number; variant?: string }) =>
                    `• ${item.name}${item.variant ? ` [${item.variant}]` : ''} x${item.quantity} = ${fmt(item.quantity * item.unitPrice)} ฿`
                ).join('\n');
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.hdgwrapskin.com';
                const paymentLink = `${baseUrl}/pay/${paymentToken}`;

                const summaryMsg = await getPayOrderSummary({
                    orderNumber,
                    subtotal: fmt(subtotal),
                    discountLine: finalDiscount > 0 ? `ส่วนลด: -${fmt(finalDiscount)} บาท` : '',
                    shippingLine: finalShipping > 0 ? `ค่าจัดส่ง: +${fmt(finalShipping)} บาท` : '',
                    shippingMethodLine: shippingMethod ? `จัดส่ง: ${shippingMethod}` : '',
                    paymentMethodLine: paymentMethod ? `ชำระ: ${paymentMethod}` : '',
                    total: fmt(total),
                    paymentLinkSection: paymentMethod === 'โอนเงินผ่านธนาคาร' || paymentMethod === 'พร้อมเพย์'
                        ? `แนบสลิปได้ที่: ${paymentLink}`
                        : '',
                    itemLines,
                    note: note || '-',
                });

                try {
                    // Get conversation with channel info for sending via platform
                    const conv = await prisma.conversation.findUnique({
                        where: { id: conversationId },
                        include: { contact: true, channel: true },
                    });

                    const msg = await prisma.message.create({
                        data: {
                            conversationId,
                            direction: 'OUTBOUND',
                            type: 'TEXT',
                            content: summaryMsg,
                            sendStatus: 'PENDING',
                            senderName: auth.name || 'System',
                            senderAgentId: auth.sub,
                        },
                    });

                    // Send via platform adapter (Facebook Messenger, etc.)
                    if (conv) {
                        try {
                            const { getAdapterWithConfig } = await import('@/lib/adapters');
                            const adapter = getAdapterWithConfig(
                                conv.channel.type as 'MESSENGER' | 'INSTAGRAM' | 'LINE' | 'WHATSAPP',
                                conv.channel.config as Record<string, unknown> | null
                            );
                            const sendResult = await adapter.sendMessage({
                                recipientPlatformId: conv.contact.platformContactId,
                                type: 'TEXT',
                                content: summaryMsg,
                            });
                            await prisma.message.update({
                                where: { id: msg.id },
                                data: {
                                    sendStatus: sendResult.success ? 'SENT' : 'FAILED',
                                    platformMessageId: sendResult.platformMessageId || null,
                                },
                            });
                            console.log('[Order] Summary message sent via', conv.channel.type, sendResult.success ? '✅' : '❌');
                        } catch (sendErr) {
                            console.warn('[Order] Failed to send summary via platform:', sendErr);
                            await prisma.message.update({
                                where: { id: msg.id },
                                data: { sendStatus: 'FAILED' },
                            });
                        }
                    }

                    // Update conversation lastMessageAt
                    await prisma.conversation.update({
                        where: { id: conversationId },
                        data: {
                            lastMessageAt: new Date(),
                            lastMessagePreview: summaryMsg.substring(0, 100),
                        },
                    });

                    // ⚡ Realtime broadcast — ให้ข้อความบิลโผล่ในแชททันที (เหมือนข้อความปกติ)
                    try {
                        const { broadcastMessage } = await import('@/lib/supabase');
                        await broadcastMessage(`chat:${conversationId}`, 'new_message', {
                            message: {
                                id: msg.id,
                                direction: 'OUTBOUND',
                                type: 'TEXT',
                                content: summaryMsg,
                                imageUrl: null,
                                sendStatus: 'SENT',
                                senderName: auth.name || 'System',
                                senderAgentId: auth.sub,
                                createdAt: msg.createdAt.toISOString(),
                                senderAgent: { id: auth.sub, name: auth.name || 'System', avatarUrl: null },
                            },
                        });
                        await broadcastMessage('inbox:updates', 'new_message', { conversationId });
                    } catch { /* silent */ }
                } catch (msgErr) {
                    console.warn('[Order] Failed to create summary message:', msgErr);
                }
            }

            // Lookup contact platformContactId for facebookPsid
            let facebookPsid: string | null = null;
            let facebookName: string | null = null;
            try {
                if (conversationId) {
                    const convForSync = await prisma.conversation.findUnique({
                        where: { id: conversationId },
                        include: { contact: { select: { platformContactId: true, displayName: true } } },
                    });
                    if (convForSync?.contact) {
                        facebookPsid = convForSync.contact.platformContactId || null;
                        facebookName = convForSync.contact.displayName || null;
                    }
                }
            } catch { /* silent */ }

            // Sync to Sale Page (non-blocking)
            syncToSalePage({ orderNumber, customerName, customerPhone, customerAddress, adminFilledAddress, note, items, total, shippingCost: finalShipping, shippingMethod, paymentMethod, facebookPsid, facebookName });


            return NextResponse.json({ success: true, data: order }, { status: 201 });
        } catch (dbErr) {
            console.error('[Order] DB Error - falling back to mock:', dbErr);
            // Mock create
            const mockOrder = {
                id: `ord-${Date.now()}`,
                orderNumber,
                conversationId: conversationId || null,
                contactId,
                agentId: auth.sub,
                status: 'DRAFT',
                subtotal,
                discount: finalDiscount,
                shippingCost: finalShipping,
                total,
                customerName,
                customerPhone: customerPhone || null,
                customerAddress: customerAddress || null,
                note: note || null,
                items: items.map((item, i) => ({
                    id: `item-${Date.now()}-${i}`,
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total: item.quantity * item.unitPrice,
                })),
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
                agent: { id: auth.sub, name: auth.name },
                contact: { displayName: customerName },
            };

            // Sync to Sale Page (non-blocking)
            syncToSalePage({ orderNumber, customerName, customerPhone, customerAddress, note, items, total, shippingCost: finalShipping, shippingMethod, paymentMethod });

            return NextResponse.json({ success: true, data: mockOrder }, { status: 201 });
        }
    } catch (error) {
        return handleApiError(error);
    }
}
