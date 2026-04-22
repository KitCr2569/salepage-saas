import { NextRequest, NextResponse } from "next/server";
import { getOrderConfirmation, getTrackingButtonMsg, getTrackingButtonTitle } from '@/lib/template-loader';
import { getFacebookPageConfig } from '@/lib/facebook';
import { getOrderUrl } from '@/lib/url-helpers';


export const dynamic = 'force-dynamic';

const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN || "";

// POST: Send order confirmation to customer via Messenger
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { recipientId, orderNumber, total, cartItems, customer, note } = body;

        console.log("📤 send-order called, recipientId:", recipientId);

        if (!recipientId) {
            return NextResponse.json({ error: "recipientId is required" }, { status: 400 });
        }

        if (!PAGE_ACCESS_TOKEN || PAGE_ACCESS_TOKEN === "YOUR_PAGE_ACCESS_TOKEN_HERE") {
            console.error("❌ PAGE_ACCESS_TOKEN not configured");
            return NextResponse.json({ error: "Token not configured" }, { status: 500 });
        }

        // Build item lines
        const itemLines = (cartItems || []).map((item: any) =>
            `- ${item.name} [${item.variant}] x${item.qty}`
        ).join('\n');

        const addr = customer ? [
            customer.address,
            customer.subdistrict ? `ตำบล${customer.subdistrict}` : "",
            customer.district ? `อำเภอ${customer.district}` : "",
            customer.province ? `จังหวัด${customer.province}` : "",
            customer.postalCode || "",
        ].filter(Boolean).join(", ") : "-";

        const vars = {
            orderNumber,
            total: Number(total).toLocaleString("en-US", { minimumFractionDigits: 2 }),
            itemLines,
            customerName: customer?.name || "-",
            address: addr || "-",
            phone: customer?.phone || "-",
            note: note || "-",
        };

        // Send text message
        const msg = await getOrderConfirmation(vars);
        const r1 = await callSendAPI({
            messaging_type: "RESPONSE",
            recipient: { id: recipientId },
            message: { text: msg },
        });
        console.log("📤 Text message result:", JSON.stringify(r1));

        // Send tracking button
        const trackingMsg = await getTrackingButtonMsg(vars);
        const r2 = await callSendAPI({
            messaging_type: "RESPONSE",
            recipient: { id: recipientId },
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "button",
                        text: trackingMsg,
                        buttons: [{
                            type: "web_url",
                            title: getTrackingButtonTitle(),
                            url: getOrderUrl(orderNumber),
                        }],
                    },
                },
            },
        });
        console.log("📤 Button result:", JSON.stringify(r2));

        const fbError = r1?.error?.message || r2?.error?.message;
        if (fbError) {
            return NextResponse.json({ success: false, error: fbError, fbResponse: { r1, r2 } });
        }

        return NextResponse.json({ success: true, orderNumber });
    } catch (error) {
        console.error("❌ send-order error:", error);
        const errMsg = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: "Internal error", detail: errMsg }, { status: 500 });
    }
}

async function callSendAPI(messageData: Record<string, unknown>) {
    try {
        const { pageAccessToken, pageId } = await getFacebookPageConfig();

        const response = await fetch(
            `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(messageData),
            }
        );
        const result = await response.json();
        if (!response.ok) {
            console.error("❌ FB Send API error:", JSON.stringify(result));
        }
        return result;
    } catch (err) {
        console.error("❌ callSendAPI fetch error:", err);
        return { error: { message: String(err) } };
    }
}
