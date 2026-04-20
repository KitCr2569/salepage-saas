import { NextResponse } from "next/server";
import { getAddressConfirm } from "@/lib/template-loader";
import { getFacebookPageConfig } from '@/lib/facebook';


const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "";

export async function POST(request: Request) {
    try {
        const { orderId, form, psid } = await request.json();

        if (!orderId) {
            return NextResponse.json({ success: false, error: "Missing orderId" }, { status: 400 });
        }

        if (!psid) {
            // No PSID available - just log and return success
            console.log("⚠️ No PSID for order:", orderId, "- skipping Messenger message");
            return NextResponse.json({ success: true, skipped: true });
        }

        const fullAddress = form 
            ? `${form.address || "-"}, ต.${form.subdistrict || "-"}, อ.${form.district || "-"}, จ.${form.province || "-"} ${form.postalCode || ""}`
            : "-";
        
        // Send confirmation message using template
        const confirmMsg = await getAddressConfirm({
            orderNumber: orderId,
            customerName: form?.name || "-",
            phone: form?.phone || "-",
            address: fullAddress,
        });

        const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
        const { pageAccessToken, pageId } = await getFacebookPageConfig();

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                recipient: { id: psid },
                message: { text: confirmMsg },
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("❌ Send confirm error:", result);
            return NextResponse.json({ success: false, error: result }, { status: 500 });
        }

        console.log("✅ Confirm message sent for order:", orderId);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("❌ Confirm order error:", error);
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
}
