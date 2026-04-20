import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { orderId, targetProshipId } = body;

        const shop = await prisma.shop.findFirst({ orderBy: { createdAt: 'asc' } });
        if (!shop) return NextResponse.json({ success: false, error: "Shop not found" }, { status: 404 });

        const config = (shop.shippingConfig as any)?.proship || {};
        
        const order = await prisma.ecommerceOrder.findUnique({
            where: { orderNumber: orderId },
        });

        if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });

        // DETERMINE CONFIG: Prioritize per-carrier config from shippingMethods
        let apiKey = config.apiKey;

        try {
            if (shop.paymentConfig) {
                const cfg: any = shop.paymentConfig;
                if (cfg.shippingMethods) {
                    const methods: any[] = Array.isArray(cfg.shippingMethods) 
                        ? cfg.shippingMethods 
                        : JSON.parse(cfg.shippingMethods as string || "[]");
                    
                    const matchedMethod = methods.find(m => m.name === order.shipping || m.id === order.shipping);
                    if (matchedMethod && matchedMethod.proshipApiKey) {
                        apiKey = matchedMethod.proshipApiKey;
                    }
                }
            }
        } catch (err) {
            console.error("Error matching dynamic config:", err);
        }

        if (!apiKey) {
            return NextResponse.json({ success: false, error: "กรุณาตั้งค่า Proship API Key ก่อนทำการพิมพ์" }, { status: 400 });
        }

        const printReqBody = {
            orders: [targetProshipId],
            size: "normal",
            printer: "proship",
            base64: false
        };

        const printRes = await fetch("https://api.proship.me/print/v1/print-label", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(printReqBody)
        });

        const printData = await printRes.json();
        
        if (printData.url) {
            return NextResponse.json({ success: true, url: printData.url });
        } else {
            return NextResponse.json({ success: false, error: printData.message || JSON.stringify(printData) }, { status: 400 });
        }
    } catch (e: any) {
        console.error("Proship Print Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
