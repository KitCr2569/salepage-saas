// ═══════════════════════════════════════════════════════════════
// GET/POST/PATCH/DELETE /api/orders — Manage E-Commerce Orders
// ✅ Using Prisma/Supabase instead of ephemeral local JSON
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appendOrderToSheet, isSheetsConfigured, type SheetOrderData } from "@/lib/googleSheets";
import { getAuthFromRequest } from "@/lib/auth";
import { getFacebookPageConfig } from '@/lib/facebook';
import { sendPurchaseEvent, isMetaCAPIConfigured } from '@/lib/meta-capi';
import { getShopFromRequest } from '@/lib/tenant';
import { deductStock, restoreStock, extractCartItemsForStock } from '@/lib/stock';
import { getShopBaseUrl, getAdminUrl, getPaymentUrl } from '@/lib/url-helpers';


export const dynamic = 'force-dynamic';

// If you don't have a global prisma client exported from @/lib/prisma:
// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();

// Helper to format Prisma model into the format expected by the Admin dashboard
function formatOrderResponse(dbOrder: any) {
    // Map DbOrder to the expected JSON front-end structure
    const customerData: any = typeof dbOrder.customerData === 'string' ? JSON.parse(dbOrder.customerData) : dbOrder.customerData || {};
    const itemsData: any = typeof dbOrder.itemsData === 'string' ? JSON.parse(dbOrder.itemsData) : dbOrder.itemsData || [];

    let addressStr = customerData.address || "";
    // If the address was pushed uncombined (e.g. from the pay form), combine it here:
    if (customerData.subdistrict || customerData.district || customerData.province) {
        addressStr = `${customerData.address || ""}`;
        if (customerData.subdistrict) addressStr += `, ตำบล/แขวง ${customerData.subdistrict}`;
        if (customerData.district) addressStr += `, อำเภอ/เขต ${customerData.district}`;
        if (customerData.province) addressStr += `, จังหวัด ${customerData.province}`;
        if (customerData.postalCode) addressStr += `, ${customerData.postalCode}`;
        // Clean leading comma if address was empty
        addressStr = addressStr.replace(/^, /, "");
    }

    return {
        id: dbOrder.orderNumber,
        customer: customerData.name || "ลูกค้า",
        phone: customerData.phone || "-",
        email: customerData.email || "",
        address: addressStr,
        items: itemsData,
        itemCount: dbOrder.itemCount,
        total: Number(dbOrder.total),
        subtotal: Number(dbOrder.subtotal),
        shipping: dbOrder.shipping,
        shippingCost: Number(dbOrder.shippingCost),
        payment: dbOrder.payment,
        status: dbOrder.status,
        date: (dbOrder.createdAt instanceof Date ? dbOrder.createdAt : new Date(dbOrder.createdAt)).toISOString(),
        note: dbOrder.note || "",
        discountCode: dbOrder.discountCode || "",
        wantTaxInvoice: dbOrder.wantTaxInvoice,
        taxName: dbOrder.taxName || "",
        taxAddress: dbOrder.taxAddress || "",
        taxId: dbOrder.taxId || "",
        trackingNumber: dbOrder.trackingNumber || "",
        shippingProvider: dbOrder.shippingProvider?.startsWith("Proship|") 
            ? dbOrder.shippingProvider.split("|")[2] 
            : dbOrder.shippingProvider || "",
        proshipId: dbOrder.shippingProvider?.startsWith("Proship|")
            ? dbOrder.shippingProvider.split("|")[1]
            : "",
        facebookId: dbOrder.facebookId || "",
        facebookName: dbOrder.facebookName || "",
        facebookPsid: dbOrder.facebookPsid || "",
        paymentSlipUrl: dbOrder.paymentSlipUrl || null,
        paidAt: dbOrder.paidAt ? new Date(dbOrder.paidAt).toISOString() : null,
    };
}

// ⚡ In-memory cache — แยก slim กับ full
let _ordersCacheFull: { data: any; expiry: number } | null = null;
let _ordersCacheSlim: { data: any; expiry: number } | null = null;
const CACHE_TTL = 10_000; // 10 วินาที (สั้นหน่อย เพราะออเดอร์เข้าบ่อย)

// GET - Fetch all orders
// Supports ?slim=1 to skip avatar lookups (for CartSummary)
export async function GET(request: Request) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const isSlim = searchParams.get('slim') === '1';

        // ⚡ เช็ค Cache ก่อน
        const cache = isSlim ? _ordersCacheSlim : _ordersCacheFull;
        if (cache && Date.now() < cache.expiry) {
            return NextResponse.json({ success: true, orders: cache.data, count: cache.data.length }, {
                headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=30' }
            });
        }

        // ⚡ Filter junk orders directly in the DB query instead of fetching all and filtering in JS
        // cacheStrategy only works with Prisma Accelerate (prisma:// URLs), ignored otherwise
        const isAccelerate = (process.env.DATABASE_URL || '').startsWith('prisma://');
        const { shop } = await getShopFromRequest(request);

        const dbOrders = await prisma.ecommerceOrder.findMany({
            where: {
                shopId: shop.id,
                AND: [
                    // Exclude legacy junk orders
                    { NOT: { note: { contains: 'tempcart_' } } },
                    { NOT: { note: { contains: 'ย้ายไปคุยผ่าน Messenger' } } },
                ],
            },
            orderBy: { createdAt: "desc" },
            // Select only needed fields — skip large paymentSlipUrl in listing
            select: {
                id: true,
                orderNumber: true,
                customerData: true,
                itemsData: true,
                itemCount: true,
                subtotal: true,
                shipping: true,
                shippingCost: true,
                total: true,
                payment: true,
                status: true,
                note: true,
                discountCode: true,
                wantTaxInvoice: true,
                taxName: true,
                taxAddress: true,
                taxId: true,
                trackingNumber: true,
                shippingProvider: true,
                facebookId: true,
                facebookName: true,
                facebookPsid: true,
                paidAt: true,
                createdAt: true,
                // Only include paymentSlipUrl as a boolean indicator
                paymentSlipUrl: true,
            },
            // ⚡ Prisma Accelerate: cache for 30s, serve stale up to 60s while revalidating
            ...(isAccelerate ? { cacheStrategy: { ttl: 30, swr: 60 } } : {}),
        });

        // Post-filter: exclude 'จาก Messenger' customers (requires JSON parsing)
        const validOrders = dbOrders.filter((o: any) => {
            const cust = typeof o.customerData === 'string' ? JSON.parse(o.customerData) : o.customerData;
            if (cust && cust.name === 'จาก Messenger') return false;
            return true;
        });

        // ⚡ Lazy Expiry: fire-and-forget — cancel + notify customer via Messenger
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const expiredOrders = validOrders
            .filter((o: any) =>
                o.status === 'pending' &&
                !o.paymentSlipUrl &&
                !o.paidAt &&
                new Date(o.createdAt) < twoHoursAgo
            );
        if (expiredOrders.length > 0) {
            autoExpireOrders(expiredOrders).catch((err: any) => console.error('[LazyExpiry] Error:', err));
        }

        // ── Avatar lookups (skip in slim mode for speed) ──────────
        let contactMapByPsid = new Map<string, any>();
        let contactMapByName = new Map<string, any>();

        if (!isSlim) {
            const psids = validOrders.map((o: any) => o.facebookPsid).filter(Boolean) as string[];
            const fbNames = validOrders.map((o: any) => {
                const cust = typeof o.customerData === 'string' ? JSON.parse(o.customerData) : o.customerData;
                return o.facebookName || cust?.name;
            }).filter(Boolean) as string[];

            // Combined lookup: PSID + name in parallel
            const [contactsByPsid, contactsByName] = await Promise.all([
                psids.length > 0
                    ? prisma.contact.findMany({
                        where: { platformContactId: { in: psids } },
                        select: { platformContactId: true, displayName: true, avatarUrl: true },
                    })
                    : [],
                fbNames.length > 0
                    ? prisma.contact.findMany({
                        where: { displayName: { in: fbNames }, avatarUrl: { not: null } },
                        select: { platformContactId: true, displayName: true, avatarUrl: true },
                        orderBy: { createdAt: 'desc' },
                    })
                    : [],
            ]);

            contactMapByPsid = new Map(contactsByPsid.map((c: any) => [c.platformContactId, c]));
            for (const c of contactsByName) {
                if (!contactMapByName.has(c.displayName)) {
                    contactMapByName.set(c.displayName, c);
                }
            }
        }

        // Map to frontend expected format
        const orders = validOrders.map((dbOrder: any) => {
            const mapped: any = formatOrderResponse(dbOrder);
            
            if (!isSlim) {
                const cust = typeof dbOrder.customerData === 'string' ? JSON.parse(dbOrder.customerData) : dbOrder.customerData;
                const nameForLookup = dbOrder.facebookName || cust?.name || '';

                if (dbOrder.facebookPsid && contactMapByPsid.has(dbOrder.facebookPsid)) {
                    const contact = contactMapByPsid.get(dbOrder.facebookPsid);
                    mapped.facebookAvatar = contact.avatarUrl || null;
                    mapped.facebookName = contact.displayName || mapped.facebookName;
                } else if (nameForLookup && contactMapByName.has(nameForLookup)) {
                    const contact = contactMapByName.get(nameForLookup);
                    mapped.facebookAvatar = contact.avatarUrl || null;
                    mapped.facebookPsid = contact.platformContactId || mapped.facebookPsid;
                } else {
                    mapped.facebookAvatar = null;
                }
            } else {
                mapped.facebookAvatar = null;
            }
            return mapped;
        });

        // ⚡ สร้าง Cache
        if (isSlim) {
            _ordersCacheSlim = { data: orders, expiry: Date.now() + CACHE_TTL };
        } else {
            _ordersCacheFull = { data: orders, expiry: Date.now() + CACHE_TTL };
        }

        return NextResponse.json({ success: true, orders, count: orders.length }, {
            headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=30' }
        });
    } catch (error: any) {
        console.error("GET orders error:", error?.message || error);
        return NextResponse.json({ success: false, orders: [], _debug: error?.message || "unknown error" });
    }
}

// POST - Create new order (from checkout page)
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Support both old format and new checkout format
        const customer = body.customer || {};
        const cartItems = body.cartItems || body.items || [];

        // ─── Stock validation ─────────────────────────────────────────
        try {
            const { products: staticProducts } = await import('@/data');
            const dbProducts = await prisma.shopProduct.findMany().catch(() => []);

            for (const cartItem of cartItems) {
                const pid = cartItem.pid || cartItem.productId || '';
                const variantId = cartItem.option || cartItem.variantId || '';
                const qty = cartItem.qty || cartItem.quantity || 1;

                // Check in static products first
                const staticProd = staticProducts.find((p: any) => p.id === pid);
                if (staticProd) {
                    const variant = staticProd.variants?.find((v: any) => v.id === variantId);
                    if (variant && typeof variant.stock === 'number' && variant.stock < qty) {
                        return NextResponse.json({
                            success: false,
                            error: `สินค้า "${cartItem.name}" (${variantId}) มีสต็อกเหลือ ${variant.stock} ชิ้น`,
                            outOfStock: true,
                        }, { status: 409 });
                    }
                    continue;
                }

                // Check in DB products
                const dbProd = dbProducts.find((p: any) => p.id === pid || p.name === cartItem.name);
                if (dbProd) {
                    let variants: any[] = [];
                    try { variants = typeof dbProd.variants === 'string' ? JSON.parse(dbProd.variants) : (dbProd.variants || []); } catch {}
                    const v = variants.find((v: any) => v.id === variantId);
                    if (v && typeof v.stock === 'number' && v.stock < qty) {
                        return NextResponse.json({
                            success: false,
                            error: `สินค้า "${cartItem.name}" มีสต็อกเหลือ ${v.stock} ชิ้น`,
                            outOfStock: true,
                        }, { status: 409 });
                    }
                }
            }
        } catch (stockErr) {
            console.warn('[Orders] Stock check skipped:', stockErr);
        }

        // Build items array from cart items
        const items = cartItems.map((item: any) => ({
            productId: item.pid || item.productId || "",
            name: item.name || "",
            variantId: item.option || item.variantId || "",
            variantName: item.variant || item.variantName || "",
            quantity: item.qty || item.quantity || 1,
            price: item.price || 0,
            image: item.image || "",
        }));

        const customerAddress = customer.address
            ? `${customer.address}, ตำบล${customer.subdistrict || ""}, อำเภอ${customer.district || ""}, จังหวัด${customer.province || ""}, ${customer.postalCode || ""}`
            : body.address || "";

        const customerData = {
            name: customer.name || body.customer || "ลูกค้า",
            phone: customer.phone || body.phone || "-",
            email: customer.email || body.email || "",
            address: customer.address || body.address || "",
            subdistrict: customer.subdistrict || "",
            district: customer.district || "",
            province: customer.province || "",
            postalCode: customer.postalCode || "",
            adminFilledAddress: body.adminFilledAddress || false,
        };

        const bangkokFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Bangkok',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        const yyyymmdd = bangkokFormatter.format(new Date()).replace(/-/g, '');
        const randomSuffix = Math.floor(Math.random() * 900) + 100;
        const genOrderNum = `ORD-${yyyymmdd}-${randomSuffix}`;

        const { shop } = await getShopFromRequest(request);

        const newOrderData: any = {
            orderNumber: body.orderNumber || genOrderNum,
            shopId: shop.id,
            customerData: customerData,
            itemsData: items,
            itemCount: items.length,
            subtotal: body.subtotal || 0,
            shipping: body.shipping || "",
            shippingCost: body.shippingCost || 0,
            total: body.total || 0,
            payment: body.payment || "โอนเงิน",
            status: body.slipImage ? "confirmed" : "pending",
            note: body.note || "",
            discountCode: body.discountCode || "",
            wantTaxInvoice: body.wantTaxInvoice || false,
            taxName: customer.taxName || "",
            taxAddress: customer.taxAddress || "",
            taxId: customer.taxId || "",
            facebookPsid: body.facebookPsid || "",
            facebookName: body.facebookName || customerData.name || "",
        };

        if (body.slipImage) {
            newOrderData.paymentSlipUrl = body.slipImage;
            newOrderData.paidAt = new Date();
        }

        const dbOrder = await prisma.ecommerceOrder.create({
            data: newOrderData,
        });

        const formattedOrder = formatOrderResponse(dbOrder);

        console.log("✅ Order created in Database:", dbOrder.orderNumber);

        // ── Auto-deduct stock ─────────────────────────────
        try {
            const stockItems = extractCartItemsForStock(dbOrder.itemsData);
            if (stockItems.length > 0) {
                const stockResult = await deductStock(stockItems);
                if (stockResult.errors.length > 0) {
                    console.warn('[Stock] Deduction warnings:', stockResult.errors);
                }
            }
        } catch (stockErr) {
            console.warn('[Stock] Deduction failed (non-blocking):', stockErr);
        }

        // Skip notifications if order comes from unified-chat (it sends its own messages)
        if (body.source !== 'unified-chat') {
            // Notify admin via Messenger (await to prevent Vercel from killing the function)
            try {
                await notifyAdminNewOrder(dbOrder.orderNumber, customerData, items, body.total);
            } catch (err) {
                console.error("⚠️ Admin notification failed:", err);
            }

            // Notify customer via Messenger if PSID is provided
            if (dbOrder.facebookPsid) {
                try {
                    await notifyCustomerNewOrder(dbOrder.facebookPsid, dbOrder, items);
                } catch (err) {
                    console.error("⚠️ Customer notification failed:", err);
                }
            }
        } else {
            console.log("ℹ️ Skipping notifications for unified-chat order:", dbOrder.orderNumber);
        }

        // Sync to Haravan (async, don't block response)
        syncToHaravan(body).catch((err) => {
            console.error("⚠️ Haravan sync failed (non-blocking):", err);
        });

        // 📊 Meta Conversions API — Send Purchase event to Ads Manager
        // This uses the ads_management permission to report sales data
        if (isMetaCAPIConfigured()) {
            sendPurchaseEvent({
                orderNumber: dbOrder.orderNumber,
                total: Number(body.total || 0),
                currency: 'THB',
                customerEmail: customerData.email || undefined,
                customerPhone: customerData.phone || undefined,
                customerName: customerData.name || undefined,
                items: items.map((item: any) => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                })),
            }).catch(err => {
                console.error('⚠️ Meta CAPI event failed (non-blocking):', err);
            });
        }

        return NextResponse.json({ success: true, order: formattedOrder });
    } catch (error: any) {
        console.error("Order creation error:", error);
        return NextResponse.json({ success: false, error: "Failed to create order", _debug: error?.message || String(error) }, { status: 500 });
    }
}

// Sync order to Haravan
async function syncToHaravan(orderData: any) {
    const HARAVAN_ACCESS_TOKEN = process.env.HARAVAN_ACCESS_TOKEN;
    if (!HARAVAN_ACCESS_TOKEN) {
        console.log("⚠️ HARAVAN_ACCESS_TOKEN not set, skipping Haravan sync");
        return;
    }

    try {
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : getShopBaseUrl();

        const { pageAccessToken, pageId } = await getFacebookPageConfig(orderData.shopId ? { headers: new Headers({ 'x-shop-id': orderData.shopId }) } as any : undefined);


        const response = await fetch(`${baseUrl}/api/haravan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "create_order",
                orderData,
            }),
        });

        const result = await response.json();
        if (result.success) {
            console.log("✅ Order synced to Haravan:", result.haravanOrderId);
        } else {
            console.error("❌ Haravan sync error:", result.error);
        }
    } catch (error) {
        console.error("❌ Haravan sync fetch error:", error);
    }
}

// PATCH - Update order status / tracking
export async function PATCH(request: Request) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { orderId, status, trackingNumber, shippingProvider, proshipId } = body;

        const updateData: any = {};
        if (status) updateData.status = status;
        if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
        if (shippingProvider !== undefined) updateData.shippingProvider = shippingProvider;
        if (proshipId !== undefined) updateData.shippingProvider = `Proship|${proshipId}|${shippingProvider || ''}`; // Store as composite if no special field
        if (body.shippingCost !== undefined) updateData.shippingCost = Number(body.shippingCost);
        if (body.shipping !== undefined) updateData.shipping = body.shipping;
        if (body.paymentSlipUrl) {
            updateData.paymentSlipUrl = body.paymentSlipUrl;
            updateData.status = "confirmed";
            updateData.paidAt = new Date();
            updateData.payment = "โอนเงิน";
        }

        const existingOrder = await prisma.ecommerceOrder.findUnique({ where: { orderNumber: orderId } });

        // If status is cancelled, try to delete from Proship
        if (status === "cancelled" && existingOrder?.shippingProvider?.startsWith("Proship|")) {
            const existingProshipId = existingOrder.shippingProvider.split("|")[1];
            const shop = await prisma.shop.findFirst({ orderBy: { createdAt: 'asc' } });
            let proshipApiKey = (shop?.shippingConfig as any)?.proship?.apiKey;
            // Try per-carrier API key from paymentConfig
            try {
                const pc: any = shop?.paymentConfig || {};
                const methods: any[] = pc.shippingMethods || [];
                const matched = methods.find((m: any) => m.name === existingOrder.shipping || m.id === existingOrder.shipping);
                if (matched?.proshipApiKey) proshipApiKey = matched.proshipApiKey;
            } catch {}
            if (proshipApiKey && existingProshipId) {
                await fetch(`https://api.proship.me/orders/v1/orders/${existingProshipId}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${proshipApiKey}` }
                }).catch(e => console.error("Proship Delete Error on cancel:", e));
            }
        }

        const updatedDbOrder = await prisma.ecommerceOrder.update({
            where: { orderNumber: orderId },
            data: updateData,
        });

        console.log("✅ Order updated:", orderId);

        // 🔄 Restore stock if cancelling (and wasn't already cancelled)
        if (status === "cancelled" && existingOrder && existingOrder.status !== "cancelled") {
            try {
                const stockItems = extractCartItemsForStock(existingOrder.itemsData);
                if (stockItems.length > 0) {
                    await restoreStock(stockItems);
                    console.log(`[Stock] ✅ Restored stock for cancelled order: ${orderId}`);
                }
            } catch (stockErr) {
                console.warn('[Stock] Restore on cancel failed:', stockErr);
            }
        }

        // 🔄 Sync status to `order` (Chat) table if status changed to cancelled
        if (status === "cancelled") {
            try {
                const chatOrder = await (prisma.order as any).findFirst({
                    where: { orderNumber: orderId },
                });
                if (chatOrder) {
                    await (prisma.order as any).update({
                        where: { id: chatOrder.id },
                        data: { status: 'CANCELLED' },
                    });
                    console.log(`[SyncCancel] ✅ Synced cancellation to Chat order: ${orderId}`);
                }
            } catch (syncErr) {
                console.warn(`[SyncCancel] ⚠️ Failed to sync cancellation to Chat order:`, syncErr);
            }
        }

        // 📨 Notify customer if order was cancelled
        if (status === "cancelled" && existingOrder?.facebookPsid && existingOrder.status !== "cancelled") {
            notifyCustomerOrderCancelled(existingOrder.facebookPsid, existingOrder).catch(err => {
                console.error("⚠️ Cancel notification failed:", err);
            });
        }

        // 📦 Notify customer when tracking number is added (only if new/changed)
        const oldTracking = existingOrder?.trackingNumber || '';
        if (trackingNumber && trackingNumber.trim() && trackingNumber.trim() !== oldTracking) {
            const psid = existingOrder?.facebookPsid || updatedDbOrder.facebookPsid;
            if (psid) {
                const provider = updatedDbOrder.shippingProvider?.startsWith('Proship|')
                    ? updatedDbOrder.shippingProvider.split('|')[2]
                    : updatedDbOrder.shippingProvider || '';
                notifyCustomerShipped(psid, updatedDbOrder, trackingNumber.trim(), provider).catch(err => {
                    console.error("⚠️ Tracking notification failed:", err);
                });
            }
        }

        // 📊 Auto-sync to Google Sheets only when status = completed (สำเร็จ)
        if (status === 'completed' && isSheetsConfigured()) {
            try {
                const customerData = typeof updatedDbOrder.customerData === 'string'
                    ? JSON.parse(updatedDbOrder.customerData)
                    : updatedDbOrder.customerData || {};
                const itemsData = typeof updatedDbOrder.itemsData === 'string'
                    ? JSON.parse(updatedDbOrder.itemsData)
                    : updatedDbOrder.itemsData || [];
                const sheetOrder: SheetOrderData = {
                    orderNumber: updatedDbOrder.orderNumber,
                    orderDate: new Date(updatedDbOrder.createdAt),
                    customerName: customerData.name || updatedDbOrder.facebookName || 'ลูกค้า',
                    items: itemsData.map((item: any) => ({
                        name: item.name || 'สินค้า',
                        variant: item.variantName || item.variant || '',
                        quantity: item.quantity || 1,
                        price: item.price || 0,
                    })),
                    shippingCost: Number(updatedDbOrder.shippingCost) || 0,
                    total: Number(updatedDbOrder.total) || 0,
                };
                appendOrderToSheet(sheetOrder).catch((err) => {
                    console.error('⚠️ Google Sheets sync failed (non-blocking):', err);
                });
                console.log(`📊 Triggered Google Sheets sync for ${updatedDbOrder.orderNumber} (status: ${status})`);
            } catch (sheetErr) {
                console.warn('⚠️ Google Sheets sync setup error:', sheetErr);
            }
        }

        // 📊 Meta CAPI — Send Purchase event when payment is confirmed
        if (body.paymentSlipUrl && isMetaCAPIConfigured()) {
            try {
                const cData = typeof updatedDbOrder.customerData === 'string'
                    ? JSON.parse(updatedDbOrder.customerData)
                    : updatedDbOrder.customerData || {};
                const iData = typeof updatedDbOrder.itemsData === 'string'
                    ? JSON.parse(updatedDbOrder.itemsData)
                    : updatedDbOrder.itemsData || [];
                sendPurchaseEvent({
                    orderNumber: updatedDbOrder.orderNumber,
                    total: Number(updatedDbOrder.total || 0),
                    currency: 'THB',
                    customerEmail: cData.email || undefined,
                    customerPhone: cData.phone || undefined,
                    customerName: cData.name || undefined,
                    items: iData.map((item: any) => ({
                        name: item.name || '',
                        quantity: item.quantity || 1,
                        price: item.price || 0,
                    })),
                }).catch(err => {
                    console.error('⚠️ Meta CAPI payment event failed:', err);
                });
            } catch (capiErr) {
                console.warn('⚠️ Meta CAPI setup error:', capiErr);
            }
        }
        
        return NextResponse.json({ success: true, order: formatOrderResponse(updatedDbOrder) });
    } catch (error) {
        console.error("PATCH order error:", error);
        return NextResponse.json({ success: false, error: "Failed to update order" }, { status: 500 });
    }
}

// DELETE - Delete order
export async function DELETE(request: Request) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get("id");

        if (!orderId) {
            return NextResponse.json({ success: false, error: "Missing order ID" }, { status: 400 });
        }

        const order = await prisma.ecommerceOrder.findUnique({ where: { orderNumber: orderId } });

        // 🔄 Restore stock on delete (only if not already cancelled — cancel already restores)
        if (order && order.status !== "cancelled") {
            try {
                const stockItems = extractCartItemsForStock(order.itemsData);
                if (stockItems.length > 0) {
                    await restoreStock(stockItems);
                    console.log(`[Stock] ✅ Restored stock for deleted order: ${orderId}`);
                }
            } catch (stockErr) {
                console.warn('[Stock] Restore on delete failed:', stockErr);
            }
        }
        
        // If it's a Proship order, try to delete from Proship too
        if (order?.shippingProvider?.startsWith("Proship|")) {
            const proshipId = order.shippingProvider.split("|")[1];
            const shop = await prisma.shop.findFirst({ orderBy: { createdAt: 'asc' } });
            let proshipApiKey = (shop?.shippingConfig as any)?.proship?.apiKey;
            // Try per-carrier API key from paymentConfig
            try {
                const pc: any = shop?.paymentConfig || {};
                const methods: any[] = pc.shippingMethods || [];
                const matched = methods.find((m: any) => m.name === order.shipping || m.id === order.shipping);
                if (matched?.proshipApiKey) proshipApiKey = matched.proshipApiKey;
            } catch {}
            if (proshipApiKey) {
                await fetch(`https://api.proship.me/orders/v1/orders/${proshipId}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${proshipApiKey}` }
                }).catch(e => console.error("Proship Delete Error:", e));
            }
        }

        // 📨 Notify customer before deleting — BUT skip if already cancelled (avoid duplicate messages)
        let notifiedViaPsid = false;
        const alreadyCancelled = order?.status === "cancelled";

        // Method 1: Direct Messenger notification via ecommerceOrder PSID
        if (order?.facebookPsid && !alreadyCancelled) {
            await notifyCustomerOrderCancelled(order.facebookPsid, order).catch(err => {
                console.error("⚠️ Delete notification failed:", err);
            });
            notifiedViaPsid = true;
        }

        // 🔄 Cancel corresponding Chat order so payment link is also blocked
        // + Method 2: Send notification via Chat adapter if PSID not on ecommerceOrder
        try {
            const chatOrder = await (prisma.order as any).findFirst({
                where: { orderNumber: orderId },
                include: {
                    conversation: { include: { contact: true, channel: true } },
                },
            });
            if (chatOrder) {
                await (prisma.order as any).update({
                    where: { id: chatOrder.id },
                    data: { status: 'CANCELLED' },
                });
                console.log(`[SyncDelete] ✅ Cancelled Chat order for deleted: ${orderId}`);

                // Send cancellation via Chat adapter if not already notified and not already cancelled
                if (!notifiedViaPsid && !alreadyCancelled && chatOrder.conversation?.contact?.platformContactId) {
                    const psid = chatOrder.conversation.contact.platformContactId;
                    // Build a fake dbOrder-like object for the notification function
                    const fakeOrder = {
                        orderNumber: orderId,
                        customerData: order?.customerData || { name: chatOrder.customerName || 'ลูกค้า' },
                        itemsData: order?.itemsData || chatOrder.items || [],
                        total: order?.total || chatOrder.total || 0,
                        createdAt: order?.createdAt || chatOrder.createdAt,
                        facebookName: order?.facebookName || chatOrder.customerName || '',
                    };
                    await notifyCustomerOrderCancelled(psid, fakeOrder).catch(err => {
                        console.error("⚠️ Chat delete notification failed:", err);
                    });
                    notifiedViaPsid = true;
                }

                // Also send as a message in the conversation
                if (chatOrder.conversationId) {
                    try {
                        const cancelMsg = `❌ แจ้งยกเลิกคำสั่งซื้อ #${orderId}\n🚫 สถานะ: ยกเลิกเรียบร้อยแล้ว`;

                        const cancelMsgRecord = await prisma.message.create({
                            data: {
                                conversationId: chatOrder.conversationId,
                                direction: 'OUTBOUND',
                                type: 'TEXT',
                                content: cancelMsg,
                                sendStatus: 'SENT',
                                senderName: 'System',
                            },
                        });
                        await prisma.conversation.update({
                            where: { id: chatOrder.conversationId },
                            data: {
                                lastMessageAt: new Date(),
                                lastMessagePreview: cancelMsg.substring(0, 100),
                            },
                        });
                        // ⚡ Realtime broadcast
                        try {
                            const { broadcastMessage } = await import('@/lib/supabase');
                            await broadcastMessage(`chat:${chatOrder.conversationId}`, 'new_message', {
                                message: { id: cancelMsgRecord.id, direction: 'OUTBOUND', type: 'TEXT', content: cancelMsg, imageUrl: null, sendStatus: 'SENT', senderName: 'System', senderAgentId: null, createdAt: cancelMsgRecord.createdAt.toISOString(), senderAgent: null },
                            });
                            await broadcastMessage('inbox:updates', 'new_message', { conversationId: chatOrder.conversationId });
                        } catch { /* silent */ }
                    } catch (msgErr) {
                        console.warn('[Delete] Failed to log cancellation in conversation:', msgErr);
                    }
                }
            }
        } catch (syncErr) {
            console.warn(`[SyncDelete] ⚠️ Failed to sync deletion to Chat order:`, syncErr);
        }

        await prisma.ecommerceOrder.delete({
            where: { orderNumber: orderId },
        });

        console.log("🗑️ Order deleted:", orderId);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE order error:", error);
        return NextResponse.json({ success: false, error: "Failed to delete order" }, { status: 500 });
    }
}

// ─── Notify admin about new order via Messenger ─────────────────
async function notifyAdminNewOrder(
    orderNumber: string,
    customer: { name: string; phone: string; address: string },
    items: Array<{ name: string; variantName: string; quantity: number; price: number }>,
    total: number
) {
    const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
    const ADMIN_PSID = process.env.ADMIN_PSID; // Admin's Facebook PSID for notifications

    if (!PAGE_ACCESS_TOKEN || !ADMIN_PSID) {
        console.log("⚠️ Missing PAGE_ACCESS_TOKEN or ADMIN_PSID, skipping admin notification");
        return;
    }

    // Build notification message
    const itemLines = items.map((item: any, i: number) => 
        `${i + 1}. ${item.name} [${item.variantName}] x${item.quantity} = ฿${(item.price * item.quantity).toLocaleString()}`
    ).join("\n");

    const message = `🛒 คำสั่งซื้อใหม่!\n\n` +
        `📋 เลขออเดอร์: ${orderNumber}\n` +
        `👤 ชื่อ: ${customer.name}\n` +
        `📞 เบอร์: ${customer.phone}\n` +
        `📍 ที่อยู่: ${customer.address || "-"}\n\n` +
        `🛍️ สินค้า:\n${itemLines}\n\n` +
        `💰 ยอดรวม: ฿${total?.toLocaleString() || "0"}\n\n` +
        `🔗 จัดการออเดอร์: ${getAdminUrl('Orders')}`;

    try {
        const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                recipient: { id: ADMIN_PSID },
                message: { text: message },
                messaging_type: "UPDATE",
            }),
        });

        const result = await res.json();
        if (result.error) {
            console.error("❌ Admin notification error:", result.error);
        } else {
            console.log("✅ Admin notified about order:", orderNumber);
        }
    } catch (err) {
        console.error("❌ Admin notification fetch error:", err);
    }
}

// ─── Notify customer about new order via Messenger (for Webhooks) ─────────
async function notifyCustomerNewOrder(
    psid: string,
    dbOrder: any,
    items: Array<{ name: string; variantName?: string; quantity: number; price: number }>
) {
    const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN;
    console.log(`[NotifyCustomer] PSID=${psid}, Order=${dbOrder.orderNumber}, Token=${PAGE_ACCESS_TOKEN ? 'YES(' + PAGE_ACCESS_TOKEN.substring(0,10) + '...)' : 'MISSING'}`);
    if (!PAGE_ACCESS_TOKEN) {
        console.log("⚠️ Missing PAGE_ACCESS_TOKEN, skipping customer notification");
        return;
    }

    try {
        const fmt = (n: number) => new Intl.NumberFormat("th-TH").format(n);
        const itemLines = items.map((item) =>
            `• ${item.name} ${item.variantName ? `[${item.variantName}] ` : ''}x${item.quantity} = ${fmt((item.price || 0) * item.quantity)} ฿`
        ).join('\n');
        
        const baseUrl = getShopBaseUrl();
        const paymentLink = `${baseUrl}/pay/${dbOrder.orderNumber}`;

        const summaryMsg = [
            `🧾 สร้างคำสั่งซื้อ #${dbOrder.orderNumber}`,
            `------------------`,
            itemLines,
            `------------------`,
            `ยอดสินค้า: ${fmt(dbOrder.subtotal || dbOrder.total)} บาท`,
            ...(dbOrder.discount > 0 ? [`ส่วนลด: -${fmt(dbOrder.discount)} บาท`] : []),
            dbOrder.shippingCost > 0 ? `ค่าจัดส่ง: +${fmt(dbOrder.shippingCost)} บาท` : '',
            dbOrder.shipping ? `จัดส่ง: ${dbOrder.shipping}` : '',
            dbOrder.payment ? `ชำระ: ${dbOrder.payment}` : '',
            `ยอดสุทธิ: ${fmt(dbOrder.total)} บาท`,
            ``,
            (dbOrder.payment === "โอนเงินผ่านธนาคาร" || dbOrder.payment === "พร้อมเพย์" || dbOrder.payment === "โอนเงิน")
                ? `แนบสลิปได้ที่:\n${paymentLink}`
                : '',
            `สถานะ: ${dbOrder.paymentSlipUrl ? 'ชำระเงินเรียบร้อย! 🎉' : 'รอชำระเงิน'}`,
        ].filter(Boolean).join('\n');

        const sendMsg = async (payload: any) => {
            return fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            }).then(r => r.json());
        };

        // Send text summary
        const r1 = await sendMsg({
            messaging_type: "RESPONSE",
            recipient: { id: psid },
            message: { text: summaryMsg },
        });

        if (r1.error) {
            console.error("❌ Customer notification error:", r1.error);
        } else {
            console.log("✅ Customer notified about order:", dbOrder.orderNumber);
        }
    } catch (err) {
        console.error("❌ Customer notification fetch error:", err);
    }
}

// ─── Notify customer about order cancellation via Messenger ─────────
async function notifyCustomerOrderCancelled(psid: string, dbOrder: any) {
    const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN;
    if (!PAGE_ACCESS_TOKEN || !psid) {
        console.log("⚠️ Missing token or PSID, skipping cancel notification");
        return;
    }

    try {
        const fmt = (n: number) => new Intl.NumberFormat("th-TH").format(n);
        const items: any[] = typeof dbOrder.itemsData === 'string'
            ? JSON.parse(dbOrder.itemsData)
            : (dbOrder.itemsData || []);
        const customerData: any = typeof dbOrder.customerData === 'string'
            ? JSON.parse(dbOrder.customerData)
            : (dbOrder.customerData || {});

        const itemLines = items.map((item: any) =>
            `   • ${item.name}${item.variantName ? ` (${item.variantName})` : ''} x${item.quantity || 1}`
        ).join('\n');

        const shopUrl = getShopBaseUrl();

        const cancelMsg = [
            `━━━━━━━━━━━━━━━━━━`,
            `❌  แจ้งยกเลิกคำสั่งซื้อ`,
            `━━━━━━━━━━━━━━━━━━`,
            ``,
            `📦 ออเดอร์: #${dbOrder.orderNumber}`,
            `👤 ชื่อ: ${customerData.name || dbOrder.facebookName || 'ลูกค้า'}`,
            `📅 วันที่สั่ง: ${new Date(dbOrder.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Bangkok' })}`,
            ``,
            `📋 รายการสินค้า:`,
            itemLines,
            ``,
            `💰 ยอดรวม: ${fmt(Number(dbOrder.total || 0))} บาท`,
            `🚫 สถานะ: ยกเลิกเรียบร้อยแล้ว`,
            ``,
            `━━━━━━━━━━━━━━━━━━`,
            `หากมีข้อสงสัย สามารถทักแชท`,
            `สอบถามได้ตลอดเวลาเลยนะครับ 🙏`,
            ``,
            `🛒 สั่งซื้อสินค้าใหม่ได้ที่:`,
            shopUrl,
        ].join('\n');

        const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messaging_type: "UPDATE",
                recipient: { id: psid },
                message: { text: cancelMsg },
            }),
        });

        const result = await res.json();
        if (result.error) {
            console.error("❌ Cancel notification error:", result.error);
        } else {
            console.log("✅ Customer notified about cancellation:", dbOrder.orderNumber);
        }
    } catch (err) {
        console.error("❌ Cancel notification fetch error:", err);
    }
}

// ─── Auto-expire orders older than 2h (called lazily from GET) ──
async function autoExpireOrders(orders: any[]) {
    const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN;

    for (const order of orders) {
        try {
            const result = await prisma.ecommerceOrder.updateMany({
                where: { id: order.id, status: 'pending' },
                data: { status: 'cancelled' },
            });
            
            if (result.count > 0) {
                console.log(`[LazyExpiry] Auto-cancelled order: ${order.orderNumber}`);

                // Notify customer via Messenger if PSID exists
                if (order.facebookPsid && PAGE_ACCESS_TOKEN) {
                    await notifyCustomerOrderCancelled(order.facebookPsid, order);
                }
            } else {
                console.log(`[LazyExpiry] Ignored already cancelled order: ${order.orderNumber}`);
            }
        } catch (err) {
            console.error(`[LazyExpiry] Failed to expire order ${order.orderNumber}:`, err);
        }
    }
}

// ─── Notify customer about shipment via Messenger ────────────────
function getTrackingUrl(provider: string, tracking: string): string | null {
    const p = provider.toLowerCase();
    if (p.includes("flash")) return `https://www.flashexpress.co.th/fle/tracking?se=${tracking}`;
    if (p.includes("kerry")) return `https://th.kerryexpress.com/th/track/?track=${tracking}`;
    if (p.includes("j&t") || p.includes("jt") || p.includes("j\\u0026t")) return `https://jtexpress.co.th/service/track?waybillNo=${tracking}`;
    if (p.includes("thaipost") || p.includes("ไปรษณีย์")) return `https://track.thailandpost.co.th/?trackNumber=${tracking}`;
    if (p.includes("ems")) return `https://track.thailandpost.co.th/?trackNumber=${tracking}`;
    if (p.includes("shopee") || p.includes("spx")) return `https://spx.co.th/track?id=${tracking}`;
    if (p.includes("ninja") || p.includes("ninjavan")) return `https://www.ninjavan.co/th-th/tracking?id=${tracking}`;
    if (p.includes("best")) return `https://www.best-inc.co.th/track?bills=${tracking}`;
    if (p.includes("dhl")) return `https://www.dhl.com/th-th/home/tracking.html?tracking-id=${tracking}`;
    return null;
}

async function notifyCustomerShipped(psid: string, dbOrder: any, trackingNumber: string, shippingProvider: string) {
    const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN;
    if (!PAGE_ACCESS_TOKEN || !psid) {
        console.log("⚠️ Missing token or PSID, skipping shipping notification");
        return;
    }

    try {
        const customerData: any = typeof dbOrder.customerData === 'string'
            ? JSON.parse(dbOrder.customerData)
            : (dbOrder.customerData || {});
        const items: any[] = typeof dbOrder.itemsData === 'string'
            ? JSON.parse(dbOrder.itemsData)
            : (dbOrder.itemsData || []);
        const fmt = (n: number) => new Intl.NumberFormat("th-TH").format(n);

        const itemLines = items.map((item: any) =>
            `   • ${item.name}${item.variantName ? ` (${item.variantName})` : ''} x${item.quantity || 1}`
        ).join('\n');

        const trackingUrl = getTrackingUrl(shippingProvider, trackingNumber);

        // Load template from DB settings
        const DEFAULT_TPL = `📦 แจ้งจัดส่งสินค้า\n────────────────\n🧾 ออเดอร์: #{orderNumber}\n👤 ชื่อ: {customerName}\n\n🚚 จัดส่งโดย: {shippingProvider}\n📦 เลขพัสดุ: {trackingNumber}\n🔍 ติดตามพัสดุ: {trackingUrl}\n────────────────\nขอบคุณที่สั่งซื้อสินค้านะครับ 🙏\nหากมีข้อสงสัย ทักแชทได้เลยครับ`;
        let tpl = DEFAULT_TPL;
        try {
            const shop = await prisma.shop.findFirst({ select: { settings: true } });
            const cfg: any = shop?.settings || {};
            if (cfg.tplShippingNotify) tpl = cfg.tplShippingNotify;
        } catch { /* use default */ }

        const shippedMsg = tpl
            .replace(/\{orderNumber\}/g, dbOrder.orderNumber)
            .replace(/#\{orderNumber\}/g, dbOrder.orderNumber)
            .replace(/\{customerName\}/g, customerData.name || dbOrder.facebookName || 'ลูกค้า')
            .replace(/\{shippingProvider\}/g, shippingProvider || '')
            .replace(/\{trackingNumber\}/g, trackingNumber)
            .replace(/\{trackingUrl\}/g, trackingUrl || '')
            .replace(/\{itemLines\}/g, itemLines)
            .replace(/\{total\}/g, fmt(Number(dbOrder.total || 0)));

        const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messaging_type: "UPDATE",
                recipient: { id: psid },
                message: { text: shippedMsg },
            }),
        });

        const result = await res.json();
        if (result.error) {
            console.error("❌ Shipping notification error:", result.error);
        } else {
            console.log("✅ Customer notified about shipment:", dbOrder.orderNumber, "tracking:", trackingNumber);
        }

        // Also log the notification as a message in the chat conversation
        try {
            const chatOrder = await (prisma.order as any).findFirst({
                where: { orderNumber: dbOrder.orderNumber },
            });
            if (chatOrder?.conversationId) {
                const shipContent = `📦 แจ้งจัดส่ง #${dbOrder.orderNumber}\n🚚 ${shippingProvider || 'ขนส่ง'}\n📦 เลขพัสดุ: ${trackingNumber}${trackingUrl ? `\n🔍 ${trackingUrl}` : ''}`;
                const shipMsg = await prisma.message.create({
                    data: {
                        conversationId: chatOrder.conversationId,
                        direction: 'OUTBOUND',
                        type: 'TEXT',
                        content: shipContent,
                        sendStatus: 'SENT',
                        senderName: 'System',
                    },
                });
                await prisma.conversation.update({
                    where: { id: chatOrder.conversationId },
                    data: {
                        lastMessageAt: new Date(),
                        lastMessagePreview: `📦 แจ้งจัดส่ง เลขพัสดุ: ${trackingNumber}`,
                    },
                });
                // ⚡ Realtime broadcast
                try {
                    const { broadcastMessage } = await import('@/lib/supabase');
                    await broadcastMessage(`chat:${chatOrder.conversationId}`, 'new_message', {
                        message: { id: shipMsg.id, direction: 'OUTBOUND', type: 'TEXT', content: shipContent, imageUrl: null, sendStatus: 'SENT', senderName: 'System', senderAgentId: null, createdAt: shipMsg.createdAt.toISOString(), senderAgent: null },
                    });
                    await broadcastMessage('inbox:updates', 'new_message', { conversationId: chatOrder.conversationId });
                } catch { /* silent */ }
            }
        } catch (logErr) {
            console.warn('[ShipNotify] Failed to log in conversation:', logErr);
        }
    } catch (err) {
        console.error("❌ Shipping notification fetch error:", err);
    }
}



