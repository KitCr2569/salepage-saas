// ═══════════════════════════════════════════════════════════════
// GET/POST /api/pay/[token] — Public payment page API
// GET: Fetch order by payment token
// POST: Upload payment slip
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAutoCancelMsg, getPaymentConfirmation, getAdminNotification, getAdminPaymentPreview, fillTemplate, getTrackingButtonMsg, getTrackingButtonTitle } from '@/lib/template-loader';
import { getFacebookPageConfig } from '@/lib/facebook';
import { getShopBaseUrl, getOrderUrl } from '@/lib/url-helpers';


// ─── Simple in-memory rate limiter ───────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 15;       // max attempts (ผ่อนคลาย — ลูกค้าอาจลองหลายครั้ง)
const RATE_WINDOW_MS = 60_000; // per 60 seconds

function isRateLimited(key: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return false;
    }
    if (entry.count >= RATE_LIMIT) return true;
    entry.count++;
    return false;
}

// ─── Expiry constants ─────────────────────────────────────────
const PAYMENT_LINK_EXPIRY_DAYS = 30; // Link expires after 30 days
const DRAFT_EXPIRY_DAYS = 7;         // Abandoned DRAFT orders expire after 7 days

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;

        // Try finding by paymentToken first (unified chat orders)
        let order = await (prisma.order as any).findUnique({
            where: { paymentToken: token },
            include: {
                items: { select: { name: true, quantity: true, unitPrice: true, total: true, image: true, variant: true } },
            },
        });

        // Fallback: search ecommerceOrder by orderNumber (webhook/salepage orders)
        let isEcommerceOrder = false;
        if (!order) {
            const ecomOrder = await prisma.ecommerceOrder.findFirst({
                where: { orderNumber: token },
            });
            if (ecomOrder) {
                isEcommerceOrder = true;

                // ⚡ Auto-cancel pending ecommerce orders older than 2 hours
                const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
                if (
                    ecomOrder.status === 'pending' &&
                    !ecomOrder.paymentSlipUrl &&
                    !ecomOrder.paidAt &&
                    new Date(ecomOrder.createdAt).getTime() < Date.now() - TWO_HOURS_MS
                ) {
                    // Cancel the order
                    await prisma.ecommerceOrder.updateMany({
                        where: { id: ecomOrder.id, status: 'pending' },
                        data: { status: 'cancelled' },
                    });
                    console.log(`[Pay] Auto-cancelled expired order: ${ecomOrder.orderNumber}`);

                    // Notify customer via Messenger
                    if (ecomOrder.facebookPsid) {
                        const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN;
                        if (PAGE_ACCESS_TOKEN) {
                            const fmt = (n: number) => new Intl.NumberFormat('th-TH').format(n);
                            const items: any[] = typeof ecomOrder.itemsData === 'string'
                                ? JSON.parse(ecomOrder.itemsData as string)
                                : (ecomOrder.itemsData as any[] || []);
                            const customerData: any = typeof ecomOrder.customerData === 'string'
                                ? JSON.parse(ecomOrder.customerData as string)
                                : (ecomOrder.customerData || {});
                            const itemLines = items.map((item: any) =>
                                `   • ${item.name}${item.variantName ? ` (${item.variantName})` : ''} x${item.quantity || 1}`
                            ).join('\n');
                            const shopUrl = getShopBaseUrl();
                            const msg = await getAutoCancelMsg({
                                orderNumber: ecomOrder.orderNumber,
                                customerName: customerData.name || ecomOrder.facebookName || 'ลูกค้า',
                                orderDate: new Date(ecomOrder.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }),
                                itemLines,
                                total: fmt(Number(ecomOrder.total || 0)),
                                shopUrl,
                            });
                            fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    messaging_type: 'UPDATE',
                                    recipient: { id: ecomOrder.facebookPsid },
                                    message: { text: msg },
                                }),
                            }).catch(err => console.error('[Pay] Expire notify error:', err));
                        }
                    }

                    // Return cancelled status to customer
                    ecomOrder.status = 'cancelled';
                }

                const itemsData = ecomOrder.itemsData as any[];
                order = {
                    id: ecomOrder.id,
                    orderNumber: ecomOrder.orderNumber,
                    customerName: (ecomOrder.customerData as any)?.name || 'ลูกค้า',
                    customerPhone: (ecomOrder.customerData as any)?.phone || null,
                    customerAddress: (ecomOrder.customerData as any)?.address || null,
                    adminFilledAddress: (ecomOrder.customerData as any)?.adminFilledAddress || false,
                    total: ecomOrder.total,
                    subtotal: ecomOrder.subtotal,
                    status: ecomOrder.status === 'pending' ? 'DRAFT' : ecomOrder.status?.toUpperCase(),
                    paymentMethod: ecomOrder.payment,
                    shippingMethod: ecomOrder.shipping,
                    paymentSlipUrl: null,
                    paidAt: null,
                    createdAt: ecomOrder.createdAt,
                    items: (itemsData || []).map((item: any) => ({
                        name: item.name || '',
                        quantity: item.quantity || 1,
                        unitPrice: item.price || 0,
                        total: (item.price || 0) * (item.quantity || 1),
                        image: item.image || null,
                        variant: item.variantName || null,
                    })),
                    note: ecomOrder.note || null,
                };
            }
        }

        if (!order) {
            return NextResponse.json({ success: false, error: 'ไม่พบคำสั่งซื้อ' }, { status: 404 });
        }

        // ─── Cross-check: if found via `order` table, also check `ecommerceOrder` status ───
        // Admin cancels/deletes through ecommerceOrder, but the `order` table may not be updated
        if (!isEcommerceOrder && order.orderNumber) {
            try {
                const ecomCheck = await prisma.ecommerceOrder.findFirst({
                    where: { orderNumber: order.orderNumber },
                    select: { status: true },
                });
                // If ecommerceOrder was deleted OR cancelled → block payment
                if (!ecomCheck || ecomCheck.status === 'cancelled') {
                    // Sync the cancellation back to the order table
                    await (prisma.order as any).update({
                        where: { paymentToken: token },
                        data: { status: 'CANCELLED' },
                    }).catch(() => {});
                    order.status = 'CANCELLED';
                }
            } catch (e) {
                console.warn('[Pay] Cross-check failed:', e);
            }
        }

        // ─── Expiry checks ────────────────────────────────────────────
        const now = new Date();
        const ageInDays = (now.getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24);

        if (ageInDays > PAYMENT_LINK_EXPIRY_DAYS) {
            return NextResponse.json({ success: false, error: 'ลิงก์ชำระเงินนี้หมดอายุแล้ว (เกิน 30 วัน) กรุณาติดต่อร้านค้าเพื่อรับลิงก์ใหม่' }, { status: 410 });
        }
        if (order.status === 'DRAFT' && ageInDays > DRAFT_EXPIRY_DAYS) {
            await (prisma.order as any).update({ where: { paymentToken: token }, data: { status: 'CANCELLED' } }).catch(() => {});
            return NextResponse.json({ success: false, error: 'คำสั่งซื้อนี้ถูกยกเลิกอัตโนมัติเนื่องจากไม่มีการชำระเงินภายใน 7 วัน' }, { status: 410 });
        }


        let productsMap: any[] = [];
        try {
            const data = await import('@/data');
            productsMap = data.products || [];
            const dbProducts = await prisma.shopProduct.findMany().catch(() => []);
            if (dbProducts && dbProducts.length > 0) {
                const mappedDb = dbProducts.map((p: any) => {
                    let imgs: string[] = [];
                    try { imgs = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []); } catch {}
                    return { ...p, images: Array.isArray(imgs) ? imgs : [] };
                });
                productsMap = [...productsMap, ...mappedDb];
            }
        } catch (e) {
            console.error('Failed to load products for mapping:', e);
        }

        return NextResponse.json({
            success: true,
            data: {
                id: order.id,
                orderNumber: order.orderNumber,
                customerName: order.customerName,
                total: Number(order.total),
                status: order.status,
                paymentMethod: (order as any).paymentMethod,
                shippingMethod: (order as any).shippingMethod,
                paymentSlipUrl: (order as any).paymentSlipUrl,
                paidAt: (order as any).paidAt?.toISOString() || null,
                customerPhone: (order as any).customerPhone || (order as any).customerData?.phone || null,
                customerAddress: (order as any).customerAddress || (order as any).customerData?.address || null,
                items: order.items.map((item: { name: string; quantity: number; unitPrice: unknown; total: unknown; image?: string | null; variant?: string | null }) => {
                    let finalImage = item.image || null;
                    if (productsMap.length > 0) {
                        const matchedProduct = productsMap.find(p => 
                            p.name.toLowerCase() === item.name.toLowerCase() || 
                            item.name.toLowerCase().includes(p.name.toLowerCase())
                        );
                        if (matchedProduct && matchedProduct.images && matchedProduct.images.length > 0) {
                            finalImage = matchedProduct.images[0];
                        }
                    }

                    return {
                        name: item.name,
                        quantity: item.quantity,
                        unitPrice: Number(item.unitPrice),
                        total: Number(item.total),
                        image: finalImage,
                        variant: item.variant || null,
                    };
                }),
                note: (order as any).note || null,
            },
        });
    } catch (error) {
        console.error('[Pay] Error:', error);
        return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;
        const body = await request.json();
        const { slipImage, customerData } = body;

        // ─── Rate limiting ────────────────────────────────────────────
        const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitKey = `pay_post:${token}:${clientIp}`;
        if (isRateLimited(rateLimitKey)) {
            return NextResponse.json({ success: false, error: 'ส่งคำขอบ่อยเกินไป กรุณารอ 1 นาทีแล้วลองใหม่' }, { status: 429 });
        }

        if (!slipImage) {
            return NextResponse.json({ success: false, error: 'กรุณาแนบรูปสลิป' }, { status: 400 });
        }

        // ─── Validate base64 image size (max 3MB encoded) ────────────
        const base64Data = slipImage.replace(/^data:image\/\w+;base64,/, '');
        const sizeInBytes = Math.ceil(base64Data.length * 0.75);
        if (sizeInBytes > 3 * 1024 * 1024) {
            return NextResponse.json({ success: false, error: 'ไฟล์ใหญ่เกินไป กรุณาบีบอัดรูปก่อนส่ง (สูงสุด 3MB)' }, { status: 400 });
        }

        let orderType: 'order' | 'ecommerce' = 'order';
        let order = await (prisma.order as any).findUnique({
            where: { paymentToken: token },
            include: { 
                items: true,
                conversation: { include: { contact: true, channel: true } } 
            },
        });

        if (!order) {
            order = await prisma.ecommerceOrder.findFirst({
                where: { orderNumber: token },
            });
            if (order) orderType = 'ecommerce';
        }

        if (!order) {
            return NextResponse.json({ success: false, error: 'ไม่พบคำสั่งซื้อ' }, { status: 404 });
        }

        if (order.status === 'PAID' || order.status === 'SHIPPED' || order.status === 'DELIVERED') {
            return NextResponse.json({ success: false, error: 'คำสั่งซื้อนี้ชำระเงินแล้ว' }, { status: 400 });
        }

        // Block cancelled orders from accepting payment
        if (order.status === 'CANCELLED' || order.status === 'cancelled') {
            return NextResponse.json({ success: false, error: 'คำสั่งซื้อนี้ถูกยกเลิกแล้ว ไม่สามารถชำระเงินได้' }, { status: 400 });
        }

        let updatedId;
        let updatedStatus;

        if (orderType === 'order') {
            let updateData: any = { paymentSlipUrl: slipImage, status: 'PAID', paidAt: new Date() };
            if (customerData) {
               if (customerData.name) updateData.customerName = customerData.name;
               if (customerData.phone) updateData.customerPhone = customerData.phone;
               const fullAddress = [customerData.address, customerData.subdistrict, customerData.district, customerData.province, customerData.postalCode].filter(Boolean).join(' ').trim();
               if (fullAddress) updateData.customerAddress = fullAddress;
            }

            const updated = await (prisma.order as any).update({
                where: { paymentToken: token },
                data: updateData,
            });
            updatedId = updated.id;
            updatedStatus = updated.status;

            // ─── Sync back to ecommerceOrder (for Admin Dashboard) ───
            try {
                const ecomOrder = await prisma.ecommerceOrder.findFirst({
                    where: { orderNumber: order.orderNumber }
                });
                if (ecomOrder) {
                    const currentData = (ecomOrder.customerData as any) || {};
                    await prisma.ecommerceOrder.update({
                        where: { id: ecomOrder.id },
                        data: {
                            status: 'confirmed',
                            paymentSlipUrl: slipImage,
                            paidAt: new Date(),
                            customerData: {
                                ...currentData,
                                name: customerData?.name || currentData.name,
                                phone: customerData?.phone || currentData.phone,
                                address: [customerData?.address, customerData?.subdistrict, customerData?.district, customerData?.province, customerData?.postalCode].filter(Boolean).join(' ').trim() || currentData.address,
                            }
                        }
                    });
                    console.log(`[PaySync] ✅ Synced payment for ${order.orderNumber} to ecommerceOrder`);
                }
            } catch (syncErr) {
                console.warn(`[PaySync] ⚠️ Failed to sync payment to ecommerceOrder:`, syncErr);
            }

            // Notify admin
            if (order.conversationId) {
                try {
                    const adminNotifyContent = await getAdminNotification({ orderNumber: order.orderNumber, total: new Intl.NumberFormat('th-TH').format(Number(order.total)) });
                    const adminMsg = await prisma.message.create({
                        data: {
                            conversationId: order.conversationId,
                            direction: 'INBOUND',
                            type: 'TEXT',
                            content: adminNotifyContent,
                            sendStatus: 'SENT',
                        },
                    });
                    await prisma.conversation.update({
                        where: { id: order.conversationId },
                        data: {
                            lastMessageAt: new Date(),
                            lastMessagePreview: getAdminPaymentPreview({ orderNumber: order.orderNumber }),
                            unreadCount: { increment: 1 },
                        },
                    });
                    // ⚡ Realtime broadcast
                    try {
                        const { broadcastMessage } = await import('@/lib/supabase');
                        await broadcastMessage(`chat:${order.conversationId}`, 'new_message', {
                            message: { id: adminMsg.id, direction: 'INBOUND', type: 'TEXT', content: adminNotifyContent, imageUrl: null, sendStatus: 'SENT', senderName: null, senderAgentId: null, createdAt: adminMsg.createdAt.toISOString(), senderAgent: null },
                        });
                        await broadcastMessage('inbox:updates', 'new_message', { conversationId: order.conversationId });
                    } catch { /* silent */ }
                } catch (msgErr) {
                    console.warn('[Pay] Failed to create notification message:', msgErr);
                }
            }

            // Customer notification
            if (order.conversation) {
                try {
                    const finalName = customerData?.name || order.customerName || '-';
                    const finalPhone = customerData?.phone || order.customerPhone || '-';
                    const finalAddress = [customerData?.address, customerData?.subdistrict, customerData?.district, customerData?.province, customerData?.postalCode].filter(Boolean).join(' ').trim() || order.customerAddress || '-';
                    
                    const itemLines = (order.items || []).map((item: any) => 
                        `- ${item.name} ${item.variant ? `[${item.variant}]` : ''} x${item.quantity}`
                    ).join('\n');

                    const confirmMsg = await getPaymentConfirmation({
                        orderNumber: order.orderNumber,
                        total: new Intl.NumberFormat('th-TH').format(Number(order.total)),
                        itemLines,
                        customerName: finalName,
                        address: finalAddress,
                        phone: finalPhone,
                        note: order.note || '-',
                    });
                    
                    const msg = await prisma.message.create({
                        data: {
                            conversationId: order.conversationId!,
                            direction: 'OUTBOUND',
                            type: 'TEXT',
                            content: confirmMsg,
                            sendStatus: 'PENDING',
                            senderName: 'System',
                        },
                    });

                    const { getAdapterWithConfig } = await import('@/lib/adapters');
                    const adapter = getAdapterWithConfig(
                        order.conversation.channel.type as any,
                        order.conversation.channel.config as any
                    );
                    
                    const sendResult = await adapter.sendMessage({
                        recipientPlatformId: order.conversation.contact.platformContactId!,
                        type: 'TEXT',
                        content: confirmMsg,
                    });
                    
                    await prisma.message.update({
                        where: { id: msg.id },
                        data: {
                            sendStatus: sendResult.success ? 'SENT' : 'FAILED',
                            platformMessageId: sendResult.platformMessageId || null,
                        },
                    });
                    console.log('[Pay] ✅ Customer confirmation sent');
                    
                    await prisma.conversation.update({
                        where: { id: order.conversationId! },
                        data: {
                            lastMessageAt: new Date(),
                            lastMessagePreview: confirmMsg.substring(0, 100),
                        },
                    });
                    // ⚡ Realtime broadcast — ข้อความยืนยันชำระเงินโผล่ทันที
                    try {
                        const { broadcastMessage } = await import('@/lib/supabase');
                        await broadcastMessage(`chat:${order.conversationId}`, 'new_message', {
                            message: { id: msg.id, direction: 'OUTBOUND', type: 'TEXT', content: confirmMsg, imageUrl: null, sendStatus: sendResult.success ? 'SENT' : 'FAILED', senderName: 'System', senderAgentId: null, createdAt: msg.createdAt.toISOString(), senderAgent: null },
                        });
                        await broadcastMessage('inbox:updates', 'new_message', { conversationId: order.conversationId });
                    } catch { /* silent */ }

                    // ───── NEW: Send Tracking Button (Raw Facebook API) ─────
                    try {
                        const channelConfig = order.conversation.channel.config as Record<string, any>;
                        const META_TOKEN = channelConfig?.pageAccessToken || process.env.META_PAGE_ACCESS_TOKEN;
                        if (META_TOKEN && order.conversation.contact.platformContactId) {
                            const trackingMsg = await getTrackingButtonMsg(vars);
                            await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${META_TOKEN}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    messaging_type: "RESPONSE",
                                    recipient: { id: order.conversation.contact.platformContactId },
                                    message: {
                                        attachment: {
                                            type: "template",
                                            payload: {
                                                template_type: "button",
                                                text: trackingMsg,
                                                buttons: [{
                                                    type: "web_url",
                                                    title: getTrackingButtonTitle(),
                                                    url: getOrderUrl(order.id)
                                                }]
                                            }
                                        }
                                    }
                                })
                            }).catch(() => { });
                        }
                    } catch (trackBtnErr) {
                        console.warn('[Pay] ⚠️ Failed to send tracking button:', trackBtnErr);
                    }

                } catch (sendErr) {
                    console.warn('[Pay] ⚠️ Failed to send confirmation to customer:', sendErr);
                }
            }
        } else {
            let updateData: any = { paymentSlipUrl: slipImage, status: 'confirmed', paidAt: new Date() };
            if (customerData) {
                // Ensure object merging
                const currentData = typeof order.customerData === 'object' && order.customerData !== null ? order.customerData : {};
                updateData.customerData = {
                    ...currentData,
                    ...customerData
                };
            }

            const updated = await prisma.ecommerceOrder.update({
                where: { id: order.id },
                data: updateData,
            });
            updatedId = updated.id;
            updatedStatus = updated.status;
        }

        return NextResponse.json({
            success: true,
            data: {
                orderId: updatedId,
                status: updatedStatus,
            },
        });
    } catch (error) {
        console.error('[Pay] Upload error:', error);
        return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการอัปโหลด' }, { status: 500 });
    }
}
