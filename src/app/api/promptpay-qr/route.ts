// ═══════════════════════════════════════════════════════════════
// GET /api/promptpay-qr — Generate PromptPay QR code
//
// Query params:
//   phone=0891234567  (PromptPay phone number or citizen ID)
//   amount=350        (optional — amount to pre-fill)
//
// Returns: { success, qrDataUrl, payload }
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const phone = searchParams.get("phone") || searchParams.get("id");
        const amountStr = searchParams.get("amount");

        if (!phone) {
            return NextResponse.json(
                { success: false, error: "Missing phone/id parameter" },
                { status: 400 }
            );
        }

        // Clean phone number — remove dashes, spaces
        const cleanPhone = phone.replace(/[-\s]/g, "");

        // Generate PromptPay payload
        const amount = amountStr ? parseFloat(amountStr) : undefined;
        const payload = generatePayload(cleanPhone, { amount });

        // Generate QR as data URL (base64 PNG)
        const qrDataUrl = await QRCode.toDataURL(payload, {
            errorCorrectionLevel: "M",
            type: "image/png",
            width: 400,
            margin: 2,
            color: {
                dark: "#1a1a2e",
                light: "#ffffff",
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                qrDataUrl,
                payload,
                phone: cleanPhone,
                amount: amount || null,
            },
        });
    } catch (error: any) {
        console.error("[promptpay-qr] Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "QR generation failed" },
            { status: 500 }
        );
    }
}
