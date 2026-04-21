import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFacebookPageConfig } from "@/lib/facebook";

/**
 * Proship Webhook Handler
 * 
 * Proship sends these event types:
 * - ORDER_STATUS_CHANGE_MANUAL     → Admin changes status manually
 * - ORDER_STATUS_CHANGE_SHIPPER_WEBHOOK → Carrier updates status (e.g. picked up, delivered)
 * - WEIGHT_UPDATE                  → Actual weight measured by carrier
 * - PRICE_UPDATE                   → Shipping cost finalized by carrier
 * 
 * Proship status codes:
 *   1 = สร้างแล้ว (Created)
 *   2 = รับพัสดุแล้ว (Picked up)
 *   3 = อยู่ระหว่างจัดส่ง (In transit)
 *   4 = จัดส่งสำเร็จ (Delivered)
 *   5 = ตีกลับ (Returned)
 *   6 = ยกเลิก (Cancelled)
 * 
 * Webhook URL to register in Proship:
 *   https://www.hdgwrapskin.com/api/proship/webhook
 */

// Map Proship numeric status to our order status
function mapProshipStatus(proshipStatus: number): string | null {
    switch (proshipStatus) {
        case 2: return "shipped";      // รับพัสดุแล้ว
        case 3: return "shipped";      // อยู่ระหว่างจัดส่ง
        case 4: return "completed";    // จัดส่งสำเร็จ
        case 5: return "cancelled";    // ตีกลับ
        case 6: return "cancelled";    // ยกเลิก
        default: return null;          // 1 = created, don't change
    }
}

export async function POST(request: NextRequest) {
    try {
        const payload = await request.json();
        console.log("📥 Proship Webhook:", JSON.stringify(payload).substring(0, 500));

        const eventType = payload.type;
        const data = payload.data;

        if (!data) {
            return NextResponse.json({ success: false, error: "No data in webhook" });
        }

        // Handle ORDER_STATUS_CHANGE events
        if (eventType === "ORDER_STATUS_CHANGE_MANUAL" || eventType === "ORDER_STATUS_CHANGE_SHIPPER_WEBHOOK") {
            const proshipOrderId = data.id; // e.g. "order-xxxxxxxxx"
            const trackingNo = data.trackingNo;
            const proshipStatus = data.status; // numeric: 1-6
            const details = data.details || {};

            if (!proshipOrderId) {
                return NextResponse.json({ success: false, error: "No order ID" });
            }

            // Find the order by Proship ID stored in shippingProvider field
            // Format: "Proship|{proshipId}|{carrier}"
            const order = await prisma.ecommerceOrder.findFirst({
                where: {
                    shippingProvider: {
                        contains: proshipOrderId
                    }
                },
                include: {
                    shop: true
                }
            });

            if (!order) {
                console.log(`⚠️ Proship Webhook: Order not found for proshipId=${proshipOrderId}`);
                return NextResponse.json({ success: true, message: "Order not found, skipped" });
            }

            const updateData: any = {};

            // Map status
            const mappedStatus = mapProshipStatus(proshipStatus);
            if (mappedStatus && order.status !== mappedStatus) {
                updateData.status = mappedStatus;
            }

            // Update tracking number if provided
            if (trackingNo && trackingNo !== order.trackingNumber) {
                updateData.trackingNumber = trackingNo;
            }

            // Only update if there's something to change
            if (Object.keys(updateData).length > 0) {
                await prisma.ecommerceOrder.update({
                    where: { id: order.id },
                    data: updateData
                });
                console.log(`✅ Proship Webhook: Order ${order.orderNumber} updated → ${JSON.stringify(updateData)}`);

                // Notify customer via Messenger if delivered
                if (mappedStatus === "completed" && order.facebookPsid) {
                    try {
                        const fakeReq = new Request('http://localhost', { headers: new Headers({ 'x-page-id': order.shop?.pageId || '' }) });
                        const { pageAccessToken } = await getFacebookPageConfig(fakeReq as any);
                        
                        if (pageAccessToken) {
                            const message = `🎉 พัสดุของคุณถึงแล้ว!\n\n📦 ออเดอร์: #${order.orderNumber}\n🚚 เลขพัสดุ: ${trackingNo || order.trackingNumber}\n✅ สถานะ: จัดส่งสำเร็จ\n\nขอบคุณที่สั่งซื้อสินค้ากับเรานะครับ 🙏`;
                            await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    recipient: { id: order.facebookPsid },
                                    message: { text: message },
                                    messaging_type: "UPDATE",
                                }),
                            });
                            console.log(`📨 Delivery notification sent to ${order.facebookPsid}`);
                        }
                    } catch (notifyErr) {
                        console.error("⚠️ Delivery notification failed:", notifyErr);
                    }
                }

                // Notify customer if returned/cancelled
                if (mappedStatus === "cancelled" && order.facebookPsid) {
                    try {
                        const fakeReq = new Request('http://localhost', { headers: new Headers({ 'x-page-id': order.shop?.pageId || '' }) });
                        const { pageAccessToken } = await getFacebookPageConfig(fakeReq as any);
                        
                        if (pageAccessToken) {
                            const message = `⚠️ แจ้งสถานะพัสดุ\n\n📦 ออเดอร์: #${order.orderNumber}\n🚚 เลขพัสดุ: ${trackingNo || order.trackingNumber}\n❌ สถานะ: ${proshipStatus === 5 ? "ตีกลับ" : "ยกเลิก"}\n\nกรุณาติดต่อเราเพื่อดำเนินการต่อครับ 🙏`;
                            await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    recipient: { id: order.facebookPsid },
                                    message: { text: message },
                                    messaging_type: "UPDATE",
                                }),
                            });
                        }
                    } catch (notifyErr) {
                        console.error("⚠️ Return notification failed:", notifyErr);
                    }
                }
            } else {
                console.log(`ℹ️ Proship Webhook: No changes needed for ${order.orderNumber}`);
            }
        }

        // Handle PRICE_UPDATE — log only (optional: store shipping cost)
        if (eventType === "PRICE_UPDATE") {
            const orderId = data.orderId;
            const priceData = data.data;
            console.log(`💰 Proship Price Update: orderId=${orderId}, freight=${priceData?.freightPrice}, cod=${priceData?.codFee}`);
        }

        // Handle WEIGHT_UPDATE — log only
        if (eventType === "WEIGHT_UPDATE") {
            const orderId = data.orderId;
            const weightData = data.data;
            console.log(`⚖️ Proship Weight Update: orderId=${orderId}, weight=${weightData?.weight}g, ${weightData?.length}x${weightData?.width}x${weightData?.height}cm`);
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Proship Webhook Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
