// ═══════════════════════════════════════════════════════════════
// GET/POST /api/webhooks/meta — Facebook Messenger & Instagram
// ✅ รวม: Cart Referral Order Confirmation + Unified Chat + Realtime Broadcast
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { getAdapterWithConfig } from '@/lib/adapters';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { broadcastMessage } from '@/lib/supabase';
import { getOrderConfirmation, getTrackingButtonMsg, getTrackingButtonTitle, getAddressConfirm, getAddressConfirmWithNote, getCheckoutOrderSummary } from '@/lib/template-loader';
import { getShopBaseUrl, getOrderUrl, getCheckoutUrl } from '@/lib/url-helpers';

// ─── Token Helpers ────────────────────────────────────────────

async function getPageAccessToken(dbConfig?: Record<string, unknown> | null): Promise<string> {
    if (dbConfig?.pageAccessToken) return dbConfig.pageAccessToken as string;
    if (process.env.PAGECLAW_PAGE_TOKEN) return process.env.PAGECLAW_PAGE_TOKEN;
    const envToken = (process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN || '').trim();
    return envToken;
}

// ─── Save Outbound Message to Unified Chat ────────────────────

async function saveOutboundMessage(senderId: string, content: string, channelType: 'MESSENGER' | 'INSTAGRAM' = 'MESSENGER') {
    try {
        const channel = await prisma.channel.findFirst({
            where: { type: channelType, isActive: true },
        });
        if (!channel) return;

        const contact = await prisma.contact.findFirst({
            where: { channelId: channel.id, platformContactId: senderId },
        });
        if (!contact) return; // contact ต้องมีอยู่แล้ว (สร้างตอน inbound)

        let conversation = await prisma.conversation.findFirst({
            where: {
                channelId: channel.id,
                contactId: contact.id,
                status: { in: ['OPEN', 'ASSIGNED'] },
            },
        });

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    channelId: channel.id,
                    contactId: contact.id,
                    status: 'OPEN',
                    lastMessageAt: new Date(),
                    lastMessagePreview: content.substring(0, 100),
                    unreadCount: 0,
                },
            });
        } else {
            await prisma.conversation.update({
                where: { id: conversation.id },
                data: {
                    lastMessageAt: new Date(),
                    lastMessagePreview: `🤖 ${content.substring(0, 80)}`,
                },
            });
        }

        const newMessage = await prisma.message.create({
            data: {
                conversationId: conversation.id,
                direction: 'OUTBOUND',
                type: 'TEXT',
                content,
                sendStatus: 'SENT',
                senderName: 'Bot',
            },
        });

        // Realtime broadcast
        try {
            await broadcastMessage(`chat:${conversation.id}`, 'new_message', {
                message: {
                    id: newMessage.id,
                    direction: 'OUTBOUND',
                    type: 'TEXT',
                    content,
                    imageUrl: null,
                    sendStatus: 'SENT',
                    senderName: 'Bot',
                    senderAgentId: null,
                    createdAt: newMessage.createdAt.toISOString(),
                    senderAgent: null,
                },
            });
            await broadcastMessage('inbox:updates', 'new_message', { conversationId: conversation.id });
        } catch { /* silent */ }

        logger.info('Webhook:Meta', `Outbound bot message saved for conversation ${conversation.id}`);
    } catch (err) {
        logger.warn('Webhook:Meta', `saveOutboundMessage failed: ${err}`);
    }
}
// ─── Facebook Send API ────────────────────────────────────────

async function callSendAPI(messageData: Record<string, unknown>, token: string) {
    if (!token) {
        logger.error('Webhook:Meta', 'PAGE_ACCESS_TOKEN not configured!');
        return { error: 'Token not configured' };
    }
    try {
        const payload = { messaging_type: 'RESPONSE', ...messageData };
        const res = await fetch(
            `https://graph.facebook.com/v19.0/me/messages?access_token=${token}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
        );
        const result = await res.json();
        if (!res.ok) {
            logger.error('Webhook:Meta', `Send API error: ${JSON.stringify(result)}`);
        } else {
            logger.info('Webhook:Meta', `Message sent OK: ${JSON.stringify(result)}`);
        }
        return result;
    } catch (err) {
        logger.error('Webhook:Meta', `Send API fetch error: ${err}`);
        return { error: String(err) };
    }
}

async function sendText(recipientId: string, text: string, token: string) {
    return callSendAPI({ recipient: { id: recipientId }, message: { text } }, token);
}

async function sendQuickReplies(recipientId: string, text: string, replies: string[], token: string) {
    return callSendAPI({
        recipient: { id: recipientId },
        message: {
            text: text,
            quick_replies: replies.slice(0, 13).map(r => ({
                content_type: 'text',
                title: r.substring(0, 20),
                payload: `FAQ_${r}`
            }))
        }
    }, token);
}

async function sendGenericTemplate(recipientId: string, elements: any[], token: string) {
    return callSendAPI({
        recipient: { id: recipientId },
        message: {
            attachment: {
                type: 'template',
                payload: { template_type: 'generic', elements: elements.slice(0, 10) }
            }
        }
    }, token);
}

async function sendButtons(recipientId: string, text: string, buttons: unknown[], token: string) {
    return callSendAPI({
        recipient: { id: recipientId },
        message: {
            attachment: {
                type: 'template',
                payload: { template_type: 'button', text, buttons },
            },
        },
    }, token);
}

// ─── Cart Referral Handler ────────────────────────────────────

async function handleCartReferral(senderId: string, ref: string, token: string) {
    logger.info('Webhook:Meta', `handleCartReferral for: ${senderId}, ref: ${ref.substring(0, 80)}...`);

    try {
        // ── Case 1: ลูกค้ามาจาก checkout page (มี order_info) → ส่งยืนยันออเดอร์
        // รองรับทั้ง | separator (format ใหม่) และ & separator (format เก่า)
        const orderInfoMatch = ref.match(/order_info=([^|&]+)/);
        if (orderInfoMatch) {
            logger.info('Webhook:Meta', 'Confirmed order detected → sending confirmation');
            const orderInfo = JSON.parse(decodeURIComponent(orderInfoMatch[1]));
            // รองรับทั้ง encoded cartRef (format ใหม่) และ raw JSON (format เก่า)
            const cartJsonMatchEncoded = ref.match(/^tempcart_(%5B.*?%5D|%5b.*?%5d)/);
            const cartJsonMatchRaw = ref.match(/^tempcart_(\[.*?\])/);
            let cartItems: any[] = [];
            if (cartJsonMatchEncoded) {
                try { cartItems = JSON.parse(decodeURIComponent(cartJsonMatchEncoded[1])); } catch { cartItems = []; }
            } else if (cartJsonMatchRaw) {
                try { cartItems = JSON.parse(cartJsonMatchRaw[1]); } catch { cartItems = []; }
            }

            // Load product data from database first, fallback to static data
            let productMap = new Map<string, { name: string; images?: string[]; variants: Map<string, { name: string; price: number }> }>();

            const productIds = cartItems.map((ci: any) => ci.pid).filter(Boolean);
            if (productIds.length > 0) {
                try {
                    // Try DB products first (UUID format)
                    const dbProducts = await prisma.shopProduct.findMany({
                        where: { id: { in: productIds } },
                    }).catch(() => []);

                    if (dbProducts.length > 0) {
                        for (const p of dbProducts) {
                            const varMap = new Map<string, { name: string; price: number }>();
                            try {
                                const variantsJson: any = typeof p.variants === 'string' ? JSON.parse(p.variants) : (p.variants || []);
                                if (Array.isArray(variantsJson)) {
                                    for (const v of variantsJson) {
                                        varMap.set(v.id, { name: v.name, price: Number(v.price) });
                                    }
                                }
                            } catch { }
                            let imgArr: string[] = [];
                            try {
                                const rawImages = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []);
                                if (Array.isArray(rawImages)) imgArr = rawImages;
                            } catch { }
                            productMap.set(p.id, { name: p.name, images: imgArr, variants: varMap });
                        }
                    } else {
                        // Fallback: try static data
                        try {
                            const data = await import('@/data');
                            for (const p of data.products) {
                                const varMap = new Map<string, { name: string; price: number }>();
                                for (const v of p.variants) {
                                    varMap.set(v.id, { name: v.name, price: v.price });
                                }
                                productMap.set(p.id, { name: p.name, images: p.images, variants: varMap });
                            }
                        } catch {
                            logger.warn('Webhook:Meta', 'Could not import products data');
                        }
                    }
                } catch {
                    logger.warn('Webhook:Meta', 'DB product lookup failed');
                }
            }

            // Build item list
            let itemList = '';
            for (const ci of cartItems) {
                const product = productMap.get(ci.pid);
                const variant = product?.variants?.get(ci.option);
                const name = product?.name || ci.name || ci.pid || 'สินค้า';
                const variantName = variant?.name || ci.optionName || ci.option || '';
                const displayVariant = variantName && (!name || !name.includes(variantName)) ? ` [${variantName}]` : '';
                itemList += `- ${name}${displayVariant} x${ci.qty || 1}\n`;
            }

            // Build confirmation message
            const vars = {
                orderNumber: orderInfo.on,
                total: Number(orderInfo.t).toLocaleString('en-US', { minimumFractionDigits: 2 }),
                itemLines: itemList,
                customerName: orderInfo.n || '-',
                address: orderInfo.a || '-',
                phone: orderInfo.p || '-',
                note: orderInfo.note || '-',
            };
            const msg = await getOrderConfirmation(vars);

            await sendText(senderId, msg, token);
            await saveOutboundMessage(senderId, msg);

            const trackingUrl = `${getShopBaseUrl()}/order/${orderInfo.on}?psid=${senderId}`;
            const trackingMsg = await getTrackingButtonMsg(vars);
            await sendButtons(senderId, trackingMsg, [
                { type: 'web_url', title: getTrackingButtonTitle(), url: trackingUrl },
            ], token);
            await saveOutboundMessage(senderId, trackingMsg);

            logger.info('Webhook:Meta', `Order confirmation sent for: ${orderInfo.on}`);
            return;
        }

        // ── Case 2: ลูกค้ากด m.me จากตะกร้าสินค้า (ยังไม่ checkout) → แสดงสรุปตะกร้า
        // Strip |source=... suffix, decode up to twice to handle double-encoded refs
        const rawCartPart = ref.replace(/^tempcart_/, '').split('|')[0];
        let cartItems: any[] = [];
        const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };
        // Try: raw JSON → decode once → decode twice
        const attempts = [rawCartPart, decodeURIComponent(rawCartPart), decodeURIComponent(decodeURIComponent(rawCartPart))];
        for (const attempt of attempts) {
            const parsed = tryParse(attempt);
            if (parsed && Array.isArray(parsed) && parsed.length > 0) { cartItems = parsed; break; }
        }
        if (cartItems.length === 0) {
            logger.warn('Webhook:Meta', 'Cannot parse cart data from ref');
            await sendText(senderId, 'ไม่สามารถอ่านข้อมูลตะกร้าได้ กรุณาลองใหม่อีกครั้ง', token);
            return;
        }

        // ── Load products: try static data first (for string IDs like "sony-a7c")
        let products: any[] = [];
        let shippingMethods: any[] = [];

        try {
            const data = await import('@/data');
            products = data.products || [];
            shippingMethods = data.shippingMethods || [];
        } catch (importErr) {
            logger.error('Webhook:Meta', `Failed to import data: ${importErr}`);
        }

        const productIds2 = cartItems.map((ci: any) => ci.pid).filter(Boolean);
        if (productIds2.length > 0) {
            try {
                const dbProducts2 = await prisma.shopProduct.findMany({
                    where: { id: { in: productIds2 } }
                });
                if (dbProducts2.length > 0) {
                    const mappedDbProducts = dbProducts2.map((p: any) => {
                        let vars: any[] = [];
                        try { vars = typeof p.variants === 'string' ? JSON.parse(p.variants) : (p.variants || []); } catch { }
                        let imgs: string[] = [];
                        try { imgs = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []); } catch { }
                        return {
                            id: p.id,
                            name: p.name,
                            images: Array.isArray(imgs) ? imgs : [],
                            variants: Array.isArray(vars) ? vars.map((v: any) => ({
                                id: String(v.id || ''),
                                name: v.name || '',
                                price: Number(v.price || 0)
                            })) : []
                        };
                    });
                    products = [...products, ...mappedDbProducts];
                }
            } catch (err) {
                logger.warn('Webhook:Meta', `DB Product lookup for summary failed: ${err}`);
            }
        }

        // ── Build order summary
        let totalPrice = 0;
        let hasUnresolved = false;
        let itemList = '';

        cartItems.forEach((cartItem: any, index: number) => {
            // Try to find in static products first
            let product = products.find((p: any) => p.id === cartItem.pid);

            if (product) {
                // Found in static data
                const variant = product.variants.find((v: any) => v.id === cartItem.option) || product.variants[0];
                const qty = cartItem.qty || 1;
                const itemTotal = variant.price * qty;
                totalPrice += itemTotal;
                const qtyText = qty > 1 ? ` x${qty}` : '';
                itemList += `${index + 1}. ${product.name} [${variant.name}]${qtyText}: ${itemTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} บาท\n`;
            } else if (cartItem.name && cartItem.price) {
                // Cart item has embedded name & price (new format from checkout)
                const qty = cartItem.qty || 1;
                const itemTotal = (cartItem.price || 0) * qty;
                totalPrice += itemTotal;
                const variantName = cartItem.optionName || cartItem.option || '';
                const displayVariant = variantName && !cartItem.name.includes(variantName) ? ` [${variantName}]` : '';
                const qtyText = qty > 1 ? ` x${qty}` : '';
                itemList += `${index + 1}. ${cartItem.name}${displayVariant}${qtyText}: ${itemTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} บาท\n`;
            } else {
                // Could not resolve - show what we have
                hasUnresolved = true;
                const qty = cartItem.qty || 1;
                itemList += `${index + 1}. สินค้า ${cartItem.pid?.substring(0, 8) || '?'}... x${qty}: (กรุณาตรวจสอบกับแอดมิน)\n`;
            }
        });

        let shippingOptsText = '';
        if (shippingMethods.length > 0 && totalPrice > 0) {
            for (const method of shippingMethods) {
                const shippingTotal = totalPrice + method.price;
                shippingOptsText += `📦${method.name} +${method.price} = ${shippingTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} บาท\n`;
            }
        }

        const templateVars = {
            itemLines: itemList.trim(),
            subtotal: totalPrice > 0 ? totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }) : 'กรุณาติดต่อแอดมินเพื่อยืนยันราคา',
            shippingOptions: shippingOptsText.trim(),
        };

        let orderText = await getCheckoutOrderSummary(templateVars);

        if (hasUnresolved) {
            orderText += '\n\n⚠️ บางรายการไม่สามารถแสดงรายละเอียดได้ แอดมินจะตรวจสอบและติดต่อกลับครับ';
        }

        const minimalCart = cartItems.map((ci: any) => {
            let pName = ci.name || '';
            let vName = ci.optionName || ci.option || ci.variantId || '';
            let pPrice = ci.price || 0;
            let img = ci.image || '';

            // Try to enhance info if static product matched
            if (!pName || !pPrice || !img) {
                const sp = products.find((p: any) => p.id === ci.pid);
                if (sp) {
                    pName = pName || sp.name;
                    const spv = sp.variants.find((v: any) => v.id === (ci.option || ci.variantId)) || sp.variants[0];
                    vName = vName || spv?.name || '';
                    pPrice = pPrice || spv?.price || 0;
                    img = img || sp.images?.[0] || '';
                }
            }

            return {
                pid: ci.pid,
                qty: ci.qty || 1,
                option: ci.option || ci.variantId || '',
                name: pName,
                optionName: vName,
                price: pPrice,
                image: img
            };
        });
        const checkoutUrl = `${getShopBaseUrl()}/checkout?cart=${encodeURIComponent(JSON.stringify(minimalCart))}`;

        await sendText(senderId, orderText, token);
        await saveOutboundMessage(senderId, orderText);
        await sendButtons(senderId, 'กรุณาเลือกดำเนินการ:', [
            { type: 'web_url', title: '✏️ เพิ่ม/แก้ไข', url: getShopBaseUrl(), webview_height_ratio: 'full', messenger_extensions: true },
            { type: 'web_url', title: '✅ ยืนยันออเดอร์', url: checkoutUrl, webview_height_ratio: 'full', messenger_extensions: true },
        ], token);
        await saveOutboundMessage(senderId, 'กรุณาเลือกดำเนินการ: [✏️ เพิ่ม/แก้ไข] [✅ ยืนยันออเดอร์]');

    } catch (err) {
        logger.error('Webhook:Meta', `Error in handleCartReferral: ${err}`);
        await sendText(senderId, 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง', token);
    }
}

// ─── Checkout Referral Handler (New Database-backed Flow) ──

async function handleCheckoutReferral(senderId: string, ref: string, token: string, chatbotConfig?: any) {
    const orderNumber = ref.replace('checkout_', '');
    logger.info('Webhook:Meta', `handleCheckoutReferral for order: ${orderNumber}`);

    try {
        // Wait briefly to ensure DB has been updated (if webhook arrived very fast)
        await new Promise(resolve => setTimeout(resolve, 1500));

        const dbOrder = await prisma.ecommerceOrder.findUnique({
            where: { orderNumber },
        });

        if (!dbOrder) {
            logger.warn('Webhook:Meta', `Order ${orderNumber} not found in DB`);
            await sendText(senderId, `✅ ได้รับออเดอร์ ${orderNumber} แล้ว\nกำลังดำเนินการ กรุณารอสักครู่ครับ 🙏`, token);
            return;
        }

        // Parse data
        const customerData: any = typeof dbOrder.customerData === 'string' ? JSON.parse(dbOrder.customerData) : dbOrder.customerData || {};
        const itemsData: any = typeof dbOrder.itemsData === 'string' ? JSON.parse(dbOrder.itemsData) : dbOrder.itemsData || [];

        // Build item list
        let itemList = '';
        for (const ci of itemsData) {
            const name = ci.name || 'สินค้า';
            const variantName = ci.variantName || '';
            const displayVariant = variantName && !name.includes(variantName) ? ` [${variantName}]` : '';
            itemList += `- ${name}${displayVariant} x${ci.quantity || 1}\n`;
        }

        // Build confirmation message
        const vars2 = {
            orderNumber,
            total: Number(dbOrder.total).toLocaleString('en-US', { minimumFractionDigits: 2 }),
            itemLines: itemList,
            customerName: customerData.name || '-',
            address: customerData.address || '-',
            phone: customerData.phone || '-',
            note: dbOrder.note || '-',
        };
        const msg = await getOrderConfirmation(vars2);

        await sendText(senderId, msg, token);
        await saveOutboundMessage(senderId, msg);

        const trackingUrl = `${getShopBaseUrl()}/order/${orderNumber}?psid=${senderId}`;
        const trackingMsg = await getTrackingButtonMsg(vars2);
        await sendButtons(senderId, trackingMsg, [
            { type: 'web_url', title: getTrackingButtonTitle(), url: trackingUrl },
        ], token);
        await saveOutboundMessage(senderId, trackingMsg);

        logger.info('Webhook:Meta', `DB-backed Order confirmation sent for: ${orderNumber}`);

        // ── ขั้นตอนพิเศษ: ส่งข้อความยืนยันสั่งซื้อจาก Chatbot (ถ้าเปิดใช้งาน) ──
        if (chatbotConfig && chatbotConfig.isOrderConfirmEnabled && chatbotConfig.orderConfirm) {
            await sendText(senderId, chatbotConfig.orderConfirm, token);
            await saveOutboundMessage(senderId, chatbotConfig.orderConfirm);
        }

        // Update DB to include PSID so admin can reply directly later
        try {
            await prisma.ecommerceOrder.update({
                where: { orderNumber },
                data: { facebookPsid: senderId }
            });
        } catch (updateErr) {
            logger.warn('Webhook:Meta', `Could not update PSID for order ${orderNumber}: ${updateErr}`);
        }

    } catch (err) {
        logger.error('Webhook:Meta', `Error in handleCheckoutReferral: ${err}`);
        await sendText(senderId, 'เกิดข้อผิดพลาดในการดึงข้อมูลออเดอร์ กรุณาติดต่อแอดมิน 🙏', token);
    }
}


// ─── Chatbot Helper ──────────────────────────────────────────────

async function sendChatbotGreeting(senderId: string, chatbotConfig: any, token: string, incomingMid?: string) {
    if (!chatbotConfig || !chatbotConfig.greeting) return;
    const greetingMsg = chatbotConfig.greeting as string;
    const greetingOptions = (chatbotConfig.greetingOptions as any[]) || [];

    // ─── Distributed Lock: ป้องกันการส่ง greeting ซ้ำจาก parallel webhooks ───
    if (incomingMid) {
        try {
            // หา conversationId
            const contact = await prisma.contact.findFirst({
                where: { platformContactId: senderId }
            });
            const conv = await prisma.conversation.findFirst({
                where: { contactId: contact?.id, status: 'OPEN' }
            });

            if (conv) {
                // พยายามจองสิทธิ์การส่ง greeting สำหรับ mid นี้
                await prisma.message.create({
                    data: {
                        conversationId: conv.id,
                        direction: 'OUTBOUND',
                        senderName: 'Bot',
                        content: greetingMsg,
                        platformMessageId: `GREET_${incomingMid}`, // Unique key!
                        sendStatus: 'SENT'
                    }
                });
                logger.info('Webhook:Meta', `Lock acquired for greeting (mid: ${incomingMid})`);
            }
        } catch (e: any) {
            if (e.code === 'P2002') {
                logger.info('Webhook:Meta', `Greeting lock already exists for mid: ${incomingMid}, skipping`);
                return; // มีคนอื่นส่งไปแล้ว หรือกำลังส่งอยู่
            }
            logger.warn('Webhook:Meta', `Greeting lock error: ${e.message}`);
        }
    }

    if (greetingOptions.length > 0) {
        const hasImage = greetingOptions.some(opt => typeof opt === 'object' && opt.imageUrl);
        const hasUrl = greetingOptions.some(opt => typeof opt === 'object' && opt.url);

        if (hasImage) {
            await sendText(senderId, greetingMsg, token);
            const elements = greetingOptions.slice(0, 10).map(opt => {
                const label = typeof opt === 'string' ? opt : opt.label;
                const url = typeof opt === 'string' ? '' : (opt.url || '');
                const imageUrl = typeof opt === 'string' ? '' : (opt.imageUrl || '');
                const btnTitle = url ? 'ดูรายละเอียด' : label.substring(0, 20);
                const btn = url
                    ? { type: 'web_url', url: url, title: btnTitle }
                    : { type: 'postback', title: btnTitle, payload: `FAQ_${label}` };
                const element: any = { title: label.substring(0, 80), buttons: [btn] };
                if (imageUrl) element.image_url = imageUrl;
                return element;
            });
            await sendGenericTemplate(senderId, elements, token);
        } else if (hasUrl) {
            if (greetingOptions.length <= 3) {
                const buttons = greetingOptions.map(opt => {
                    const label = typeof opt === 'string' ? opt : opt.label;
                    const url = typeof opt === 'string' ? '' : (opt.url || '');
                    return url
                        ? { type: 'web_url', url: url, title: label.substring(0, 20) }
                        : { type: 'postback', title: label.substring(0, 20), payload: `FAQ_${label}` };
                });
                await sendButtons(senderId, greetingMsg, buttons, token);
            } else {
                await sendText(senderId, greetingMsg, token);
                const elements = [];
                const mainTitle = chatbotConfig.carouselMainTitle || 'Please select an option / กรุณาเลือกรายการ 👇';
                const moreTitleTpl = chatbotConfig.carouselMoreTitle || 'More options / เพิ่มเติม ({number}) 👇';

                for (let i = 0; i < greetingOptions.length; i += 3) {
                    const chunk = greetingOptions.slice(i, i + 3);
                    elements.push({
                        title: i === 0 ? mainTitle : moreTitleTpl.replace('{number}', String(Math.floor(i/3) + 1)),
                        buttons: chunk.map(opt => {
                            const label = typeof opt === 'string' ? opt : opt.label;
                            const url = typeof opt === 'string' ? '' : (opt.url || '');
                            return url
                                ? { type: 'web_url', url: url, title: label.substring(0, 20) }
                                : { type: 'postback', title: label.substring(0, 20), payload: `FAQ_${label}` };
                        })
                    });
                }
                await sendGenericTemplate(senderId, elements.slice(0, 10), token);
            }
        } else {
            const stringOpts = greetingOptions.map(opt => typeof opt === 'string' ? opt : opt.label);
            await sendQuickReplies(senderId, greetingMsg, stringOpts, token);
        }
    } else {
        await sendText(senderId, greetingMsg, token);
    }

    // ถ้าไม่มี incomingMid (เช่นส่งจากหลังบ้าน) ค่อยเซฟแบบปกติ
    if (!incomingMid) {
        await saveOutboundMessage(senderId, greetingMsg);
    }
}

// ─── Raw Event Handler (referral, postback) ──────────────────
// Returns a Set of senderIds that already received a greeting (to avoid duplicate sends)
async function handleRawEvents(body: any, token: string, chatbotConfig?: any): Promise<Set<string>> {
    const greetingSentTo = new Set<string>();
    if (body.object !== 'page') return greetingSentTo;

    for (const entry of body.entry || []) {
        for (const event of entry.messaging || []) {
            const senderId = event.sender?.id;
            if (!senderId) continue;

            // ── Postback (first-time user / button click) ──
            // Handle BEFORE referral to avoid double-handling when postback also carries referral.ref
            if (event.postback) {
                const payload = event.postback.payload || '';
                const postbackRef = event.postback.referral?.ref || '';
                logger.info('Webhook:Meta', `Postback: ${payload}, ref: ${postbackRef.substring(0, 60)}`);

                if (postbackRef.startsWith('checkout_')) {
                    await handleCheckoutReferral(senderId, postbackRef, token, chatbotConfig);
                    continue; // skip referral block – already handled
                } else if (postbackRef.startsWith('tempcart_')) {
                    await handleCartReferral(senderId, postbackRef, token);
                    continue; // skip referral block – already handled
                } else if (postbackRef.startsWith('address_confirmed_')) {
                    const orderNum = postbackRef.replace('address_confirmed_', '');
                    await sendText(senderId, await getAddressConfirm({ orderNumber: orderNum }), token);
                    continue;
                } else if (payload === 'EDIT_ORDER') {
                    await sendText(senderId, `กรุณากลับไปที่หน้าร้านเพื่อแก้ไขออเดอร์ 🛒\n${getShopBaseUrl()}`, token);
                } else if (payload === 'CONFIRM_ORDER') {
                    await sendText(senderId, '✅ ขอบคุณที่ยืนยันออเดอร์!\n\nกรุณาเลือกวิธีจัดส่งและชำระเงิน แอดมินจะติดต่อกลับโดยเร็วครับ 🙏', token);
                } else if (payload.toUpperCase() === 'GET_STARTED' || payload.toUpperCase() === 'START') {
                    if (chatbotConfig && chatbotConfig.isGreetingEnabled && chatbotConfig.greeting) {
                        const mid = event.postback.mid || `GET_STARTED_${senderId}_${Date.now()}`;
                        await sendChatbotGreeting(senderId, chatbotConfig, token, mid);
                    } else {
                        await sendText(senderId, 'สวัสดีครับ! ยินดีต้อนรับ 🙏\nสอบถามสินค้าหรือส่งออเดอร์ได้เลยครับ 🛒', token);
                    }
                    greetingSentTo.add(senderId); // mark greeting sent → suppress duplicate from message loop
                }
                continue; // postback handled – do not fall through to referral processing
            }

            // ── Referral (กลับมาที่ Messenger ที่เคยคุยแล้ว — ไม่ใช่ first-open) ──
            // Only fires when event has ONLY referral (no postback)
            if (event.referral) {
                const ref = event.referral.ref || '';
                logger.info('Webhook:Meta', `Referral event: ${ref.substring(0, 60)}`);
                if (ref.startsWith('checkout_')) {
                    await handleCheckoutReferral(senderId, ref, token, chatbotConfig);
                } else if (ref.startsWith('tempcart_')) {
                    await handleCartReferral(senderId, ref, token);
                } else if (ref.startsWith('address_confirmed_')) {
                    const orderNum = ref.replace('address_confirmed_', '');
                    await sendText(senderId, getAddressConfirmWithNote({ orderNumber: orderNum }), token);
                }
            }
        }
    }

    return greetingSentTo;
}

// ═══════════════════════════════════════════════════════════════
// GET — Webhook Verification
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const mode = searchParams.get('hub.mode');
        const token = searchParams.get('hub.verify_token');
        const challenge = searchParams.get('hub.challenge');

        // ลำดับ: DB config → env var
        let verifyToken = process.env.META_VERIFY_TOKEN || process.env.VERIFY_TOKEN || '';
        try {
            const channel = await prisma.channel.findFirst({
                where: { type: 'MESSENGER', isActive: true },
            });
            const config = channel?.config as Record<string, unknown> | null;
            if (config?.verifyToken) verifyToken = config.verifyToken as string;
        } catch {
            // ใช้ env fallback
        }

        if (mode === 'subscribe' && token === verifyToken && challenge) {
            logger.info('Webhook:Meta', 'Verification successful');
            return new Response(challenge, { status: 200 });
        }

        logger.warn('Webhook:Meta', `Verification failed - mode: ${mode}, tokenMatch: ${token === verifyToken}`);
        return errorResponse('Verification failed', 403);
    } catch (error) {
        return handleApiError(error);
    }
}

// ═══════════════════════════════════════════════════════════════
// POST — Receive Messages
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const channelType = (body as Record<string, unknown>).object === 'instagram' ? 'INSTAGRAM' : 'MESSENGER';
        logger.info('Webhook:Meta', `Received ${channelType} webhook`);

        // Log webhook
        try {
            await prisma.webhookLog.create({
                data: {
                    channelType: channelType as 'MESSENGER' | 'INSTAGRAM',
                    direction: 'INBOUND',
                    payload: body as object,
                },
            });
        } catch (logErr) {
            logger.warn('Webhook:Meta', `WebhookLog write failed: ${logErr}`);
        }

        // Get channel config from DB
        const pageId = (body as any)?.entry?.[0]?.id;
        const allChannels = await prisma.channel.findMany({
            where: { type: channelType as 'MESSENGER' | 'INSTAGRAM', isActive: true },
            orderBy: { updatedAt: 'desc' },
        }).catch(() => []);

        const dbChannel = pageId 
            ? allChannels.find(c => (c.config as any)?.pageId === pageId)
            : allChannels[0];

        const dbConfig = dbChannel?.config as Record<string, unknown> | null;
        const token = await getPageAccessToken(dbConfig);

        // Get chatbot config from DB
        let chatbotConfig: any = null;
        try {
            const dbShop = await prisma.shop.findFirst({ where: { pageId: String(pageId) }, orderBy: { createdAt: 'asc' } })
                ?? await prisma.shop.findFirst({ orderBy: { createdAt: 'asc' } });
            if (dbShop?.chatbotConfig) {
                chatbotConfig = typeof dbShop.chatbotConfig === 'string' ? JSON.parse(dbShop.chatbotConfig) : dbShop.chatbotConfig;
            }
        } catch (e) {
            logger.warn('Webhook:Meta', `Failed to load chatbot config: ${e}`);
        }

        // ── ขั้นตอนที่ 1: จัดการ raw events (referral, postback หาก Messenger) ──
        const greetingSentTo = new Set<string>();
        if (channelType === 'MESSENGER') {
            const sent = await handleRawEvents(body, token, chatbotConfig);
            sent.forEach(id => greetingSentTo.add(id));
        }

        // ── ขั้นตอนที่ 2: บันทึกข้อความเข้า Unified Chat (สำหรับข้อความปกติ) ──
        const adapter = getAdapterWithConfig(channelType as 'MESSENGER' | 'INSTAGRAM', dbConfig);
        const messages = adapter.parseInboundMessages(body);

        for (const msg of messages) {
            // ─── READ RECEIPT ───
            if (msg.type === 'READ') {
                const contact = await prisma.contact.findFirst({
                    where: { platformContactId: msg.platformContactId }
                });
                if (contact) {
                    const conversation = await prisma.conversation.findFirst({
                        where: { contactId: contact.id, status: { in: ['OPEN', 'ASSIGNED'] } }
                    });
                    if (conversation) {
                        logger.info('Webhook:Meta', `Read event for conversation ${conversation.id}, watermark: ${msg.readWatermark}`);
                        
                        // 1. Update DB (Persistent)
                        try {
                            await prisma.message.updateMany({
                                where: {
                                    conversationId: conversation.id,
                                    direction: 'OUTBOUND',
                                    sendStatus: { not: 'READ' },
                                    createdAt: { lte: new Date(msg.readWatermark!) }
                                },
                                data: { sendStatus: 'READ' }
                            });
                        } catch (dbErr) {
                            logger.warn('Webhook:Meta', `Failed to update READ status in DB: ${dbErr}`);
                        }

                        // 2. Broadcast Realtime (Instant UI update)
                        await broadcastMessage(`chat:${conversation.id}`, 'message_read', {
                            conversationId: conversation.id,
                            watermark: msg.readWatermark,
                        });
                    }
                }
                continue; // Skip the rest of message processing for READ events
            }

            // Create channel if not exists
            let channel = dbChannel;
            if (!channel) {
                channel = await prisma.channel.create({
                    data: {
                        type: channelType as 'MESSENGER' | 'INSTAGRAM',
                        name: `${channelType} Channel (Auto)`,
                    },
                });
            }

            // Find or create contact
            let contact = await prisma.contact.findFirst({
                where: { channelId: channel.id, platformContactId: msg.platformContactId },
            });

            // ⚡ Auto-heal check: if name is literally the PSID, we need to fix it.
            let isBrokenName = contact && contact.displayName === contact.platformContactId;
            let isMissingAvatar = contact && !contact.avatarUrl;

            if (!contact || isBrokenName || isMissingAvatar) {
                let finalDisplayName = msg.contactDisplayName || msg.platformContactId;
                let finalAvatarUrl: string | null = contact?.avatarUrl || null;

                if (token && channelType === 'MESSENGER') {
                    // Try standard /psid fetch first
                    try {
                        const r = await fetch(`https://graph.facebook.com/v19.0/${msg.platformContactId}?fields=name,first_name,last_name,profile_pic&access_token=${token}`);
                        if (r.ok) {
                            const profile = await r.json();
                            const fetchedName = profile.name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
                            if (fetchedName) finalDisplayName = fetchedName;
                            if (profile.profile_pic) finalAvatarUrl = profile.profile_pic;
                        }
                    } catch (err) {
                        logger.warn('Webhook:Meta', 'Profile fetch failed in webhook: ' + err);
                    }

                    // ⚡ Fallback: If still broken (Cross-App PSID restriction), query /conversations
                    if (finalDisplayName === msg.platformContactId) {
                        try {
                            const pageId = (body as any)?.entry?.[0]?.id || process.env.FACEBOOK_PAGE_ID;
                            if (pageId) {
                                const cRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/conversations?fields=participants&limit=5&access_token=${token}`);
                                if (cRes.ok) {
                                    const cData = await cRes.json();
                                    for (const conv of cData.data || []) {
                                        const p = conv.participants?.data?.find((x: any) => x.id === msg.platformContactId);
                                        if (p && p.name && p.name !== msg.platformContactId && p.name !== pageId) {
                                            finalDisplayName = p.name;
                                            break;
                                        }
                                    }
                                }
                            }
                        } catch (err) {
                            logger.warn('Webhook:Meta', 'Fallback /conversations fetch failed: ' + err);
                        }
                    }
                }

                if (!contact) {
                    contact = await prisma.contact.create({
                        data: {
                            channelId: channel.id,
                            platformContactId: msg.platformContactId,
                            displayName: finalDisplayName,
                            avatarUrl: finalAvatarUrl,
                        },
                    });
                } else if ((isBrokenName && finalDisplayName !== msg.platformContactId) || (isMissingAvatar && finalAvatarUrl)) {
                    // Update name if broken, or avatar if missing
                    const updateData: Record<string, any> = {};
                    if (isBrokenName && finalDisplayName !== msg.platformContactId) {
                        updateData.displayName = finalDisplayName;
                    }
                    if (isMissingAvatar && finalAvatarUrl) {
                        updateData.avatarUrl = finalAvatarUrl;
                    }
                    if (Object.keys(updateData).length > 0) {
                        contact = await prisma.contact.update({
                            where: { id: contact.id },
                            data: updateData,
                        });
                    }
                }
            }

            // Find or create conversation
            let conversation = await prisma.conversation.findFirst({
                where: {
                    channelId: channel.id,
                    contactId: contact.id,
                    status: { in: ['OPEN', 'ASSIGNED'] },
                },
            });

            if (!conversation) {
                conversation = await prisma.conversation.create({
                    data: {
                        channelId: channel.id,
                        contactId: contact.id,
                        status: 'OPEN',
                        lastMessageAt: msg.timestamp,
                        lastMessagePreview: msg.content?.substring(0, 100) || '[รูปภาพ]',
                        unreadCount: 1,
                    },
                });
            } else {
                await prisma.conversation.update({
                    where: { id: conversation.id },
                    data: {
                        lastMessageAt: msg.timestamp,
                        lastMessagePreview: msg.content?.substring(0, 100) || '[รูปภาพ]',
                        unreadCount: { increment: 1 },
                    },
                });
            }

            // ── Dedup: บล็อกเฉพาะการ SAVE ซ้ำ (Facebook ส่ง retry เร็วมาก) ──
            // ⚠️ ยังต้องรัน auto-reply ต่อ (first call อาจ timeout ก่อนส่ง greeting)
            let isAlreadySaved = false;
            if (msg.platformMessageId) {
                const existingMsg = await prisma.message.findFirst({
                    where: { platformMessageId: msg.platformMessageId },
                });
                if (existingMsg) {
                    logger.info('Webhook:Meta', `Dedup: mid ${msg.platformMessageId} already in DB — skipping save, will check auto-reply`);
                    isAlreadySaved = true;
                }
            }

            let newMessage: any = null;
            if (!isAlreadySaved) {
                // Save message with error handling for parallel race conditions
                try {
                    newMessage = await prisma.message.create({
                        data: {
                            conversationId: conversation.id,
                            direction: 'INBOUND',
                            type: msg.type as 'TEXT' | 'IMAGE' | 'FILE' | 'NOTE',
                            content: msg.content || '',
                            imageUrl: msg.imageUrl || null,
                            platformMessageId: msg.platformMessageId,
                            sendStatus: 'SENT',
                            senderName: contact.displayName,
                            rawPayload: msg.rawPayload as object ?? undefined,
                        },
                    });

                    // Supabase Realtime Broadcast
                    try {
                        await broadcastMessage(`chat:${conversation.id}`, 'new_message', {
                            message: {
                                id: newMessage.id,
                                direction: 'INBOUND',
                                type: newMessage.type,
                                content: newMessage.content,
                                imageUrl: newMessage.imageUrl,
                                sendStatus: newMessage.sendStatus,
                                senderName: newMessage.senderName,
                                senderAgentId: null,
                                createdAt: newMessage.createdAt.toISOString(),
                                senderAgent: null,
                            },
                        });
                        await broadcastMessage('inbox:updates', 'new_message', {
                            conversationId: conversation.id,
                            // ⚡ ส่งข้อมูล inbox item เต็ม — client ไม่ต้อง refetch ทั้ง list
                            inboxItem: {
                                id: conversation.id,
                                contactName: contact.displayName,
                                contactAvatar: contact.avatarUrl,
                                channelType: channel.type,
                                status: conversation.status,
                                lastMessage: newMessage.content?.substring(0, 100) || '[รูปภาพ]',
                                lastMessageAt: newMessage.createdAt.toISOString(),
                                unreadCount: (conversation.unreadCount ?? 0) + 1,
                                assignedAgent: null,
                                tags: [],
                            },
                        });
                    } catch (broadcastErr) {
                        logger.warn('Webhook:Meta', `Broadcast failed: ${broadcastErr}`);
                    }

                    logger.info('Webhook:Meta', `Message saved for conversation ${conversation.id}`);
                } catch (saveErr: any) {
                    if (saveErr.code === 'P2002') {
                        logger.info('Webhook:Meta', `Dedup: Race condition hit for mid ${msg.platformMessageId}, already saved by parallel call.`);
                        isAlreadySaved = true;
                    } else {
                        throw saveErr;
                    }
                }
            }

            // ── ขั้นตอนที่ 2.5: จัดการ AI Chatbot Auto-Reply (เฉพาะ Messenger และเฉพาะสถานะ OPEN) ──
            if (chatbotConfig && chatbotConfig.isAutoReplyEnabled && channelType === 'MESSENGER' && conversation.status === 'OPEN' && msg.type === 'TEXT') {
                const text = (msg.content || '').trim().toLowerCase();
                const senderId = msg.platformContactId;
                let replySent = false;

                // 0. Out of Hours check (เช็คเวลาเปิด-ปิดร้าน)
                if (chatbotConfig.isOutOfHoursEnabled && chatbotConfig.hours && chatbotConfig.outOfHours) {
                    const now = new Date();
                    const bangkokTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
                    const currentHour = bangkokTime.getHours();
                    const currentMin = bangkokTime.getMinutes();
                    const currentTimeVal = (currentHour * 100) + currentMin;

                    const [startH, startM] = (chatbotConfig.hours.start || '09:00').split(':').map(Number);
                    const [endH, endM] = (chatbotConfig.hours.end || '18:00').split(':').map(Number);
                    const startTimeVal = (startH * 100) + startM;
                    const endTimeVal = (endH * 100) + endM;

                    const isOutOfHours = currentTimeVal < startTimeVal || currentTimeVal >= endTimeVal;
                    if (isOutOfHours) {
                        // ส่งข้อความแจ้งนอกเวลา (จำกัด 1 ครั้งต่อ 30 นาที เพื่อไม่ให้สแปม)
                        // หมายเหตุ: ในที่นี้เราส่งเลย เพราะการเช็ค 30 นาทีต้องใช้ DB lookup เพิ่มเติม
                        await sendText(senderId, chatbotConfig.outOfHours, token);
                        await saveOutboundMessage(senderId, chatbotConfig.outOfHours);
                        replySent = true;
                    }
                }

                // 1. FAQs Match (เช็คจากคำถาม)
                if (!replySent) {
                    const faqs = (chatbotConfig.faq as { q: string, a: string }[]) || [];
                    const matchedFaq = faqs.find(f => text.includes(f.q.toLowerCase()));
                    if (matchedFaq) {
                        await sendText(senderId, matchedFaq.a, token);
                        await saveOutboundMessage(senderId, matchedFaq.a);
                        replySent = true;
                    }
                }

                // 2. Greeting (ข้อความแรก หรือพิมพ์คำทักทาย)
                if (!replySent && chatbotConfig.isGreetingEnabled && !greetingSentTo.has(senderId)) {
                    const greetingKeywords = ['สวัสดี', 'ดีครับ', 'ดีค่ะ', 'hi', 'hello', 'สอบถาม', 'start', 'test'];
                    const isGreetingKeyword = greetingKeywords.some(k => text.includes(k));

                    const msgCount = await prisma.message.count({
                        where: { conversationId: conversation.id, direction: 'INBOUND' },
                    });
                    const isVeryFirstMessage = msgCount === 1;

                    if (isVeryFirstMessage || isGreetingKeyword) {
                        // Guard: ตรวจว่า bot เพิ่งส่งไปใน 60 วินาทีที่ผ่านมาไหม
                        // ถ้ามี → first call สำเร็จ ไม่ต้องส่งซ้ำ
                        // ถ้าไม่มี → first call อาจ timeout ก่อนส่ง → ส่งตอนนี้
                        const recentBotReply = await prisma.message.findFirst({
                            where: {
                                conversationId: conversation.id,
                                direction: 'OUTBOUND',
                                senderName: 'Bot',
                                createdAt: { gte: new Date(Date.now() - 60_000) },
                            },
                        });

                        if (recentBotReply) {
                            logger.info('Webhook:Meta', `Guard: bot already replied in last 60s, skipping duplicate greeting`);
                        } else {
                            // ใช้ mid จริงๆ ในการ lock เพื่อกัน parallel calls
                            await sendChatbotGreeting(senderId, chatbotConfig, token, msg.platformMessageId);
                            greetingSentTo.add(senderId);
                        }
                    }
                }
            } else if (chatbotConfig) {
                logger.info('Webhook:Meta', `Auto-reply skipped: isAutoReply=${chatbotConfig.isAutoReplyEnabled}, status=${conversation.status}, type=${msg.type}, channel=${channelType}`);
            } else {
                logger.warn('Webhook:Meta', `chatbotConfig is null — check if shop has chatbot settings saved`);
            }
        }

        // ── ขั้นตอนที่ 3: บันทึกข้อความ echo (ที่เพจส่งออกจาก Facebook Inbox) ──
        if (adapter.parseEchoMessages) {
            const echoMessages = adapter.parseEchoMessages(body);
            for (const echo of echoMessages) {
                try {
                    // ตรวจสอบว่าข้อความนี้ถูกเก็บไว้แล้วหรือยัง (จาก admin dashboard send)
                    if (echo.platformMessageId) {
                        const existingMsg = await prisma.message.findFirst({
                            where: { platformMessageId: echo.platformMessageId },
                        });
                        if (existingMsg) {
                            logger.info('Webhook:Meta', `Echo already saved (mid: ${echo.platformMessageId}), skipping`);
                            continue;
                        }
                    }

                    // หา channel
                    let channel = dbChannel;
                    if (!channel) continue;

                    // หา contact โดยใช้ recipientId (= PSID ของลูกค้า)
                    const contact = await prisma.contact.findFirst({
                        where: { channelId: channel.id, platformContactId: echo.recipientId },
                    });
                    if (!contact) {
                        logger.info('Webhook:Meta', `Echo - contact not found for ${echo.recipientId}, skipping`);
                        continue;
                    }

                    // หา conversation
                    let conversation = await prisma.conversation.findFirst({
                        where: {
                            channelId: channel.id,
                            contactId: contact.id,
                            status: { in: ['OPEN', 'ASSIGNED'] },
                        },
                    });

                    if (!conversation) {
                        // สร้าง conversation ใหม่ถ้ายังไม่มี
                        conversation = await prisma.conversation.create({
                            data: {
                                channelId: channel.id,
                                contactId: contact.id,
                                status: 'OPEN',
                                lastMessageAt: echo.timestamp,
                                lastMessagePreview: echo.content?.substring(0, 100) || '[รูปภาพ]',
                                unreadCount: 0,
                            },
                        });
                    } else {
                        await prisma.conversation.update({
                            where: { id: conversation.id },
                            data: {
                                lastMessageAt: echo.timestamp,
                                lastMessagePreview: echo.content?.substring(0, 100) || '[รูปภาพ]',
                            },
                        });
                    }

                    // บันทึกเป็น OUTBOUND message
                    const newMessage = await prisma.message.create({
                        data: {
                            conversationId: conversation.id,
                            direction: 'OUTBOUND',
                            type: echo.type as 'TEXT' | 'IMAGE' | 'FILE',
                            content: echo.content || '',
                            imageUrl: echo.imageUrl || null,
                            platformMessageId: echo.platformMessageId,
                            sendStatus: 'SENT',
                            senderName: 'Admin (Facebook)',
                        },
                    });

                    // Broadcast สำหรับ realtime update
                    try {
                        await broadcastMessage(`chat:${conversation.id}`, 'new_message', {
                            message: {
                                id: newMessage.id,
                                direction: 'OUTBOUND',
                                type: newMessage.type,
                                content: newMessage.content,
                                imageUrl: newMessage.imageUrl,
                                sendStatus: 'SENT',
                                senderName: 'Admin (Facebook)',
                                senderAgentId: null,
                                createdAt: newMessage.createdAt.toISOString(),
                                senderAgent: null,
                            },
                        });
                        await broadcastMessage('inbox:updates', 'new_message', { conversationId: conversation.id });
                    } catch { /* silent */ }

                    logger.info('Webhook:Meta', `Echo message saved for conversation ${conversation.id} (mid: ${echo.platformMessageId})`);
                } catch (echoErr) {
                    logger.warn('Webhook:Meta', `Failed to save echo message: ${echoErr}`);
                }
            }
        }

        return successResponse({ received: true });
    } catch (error) {
        logger.error('Webhook:Meta', 'Error processing webhook', error);
        return handleApiError(error);
    }
}
