import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key";

export async function POST(request: NextRequest) {
    try {
        const shop = await prisma.shop.findFirst({ orderBy: { createdAt: 'asc' } });

        if (!shop) return NextResponse.json({ success: false, error: "Shop not found" }, { status: 404 });

        const config = (shop.shippingConfig as any)?.proship || {};
        const { orderId } = await request.json();
        // Use ecommerceOrder instead of order
        const order = await prisma.ecommerceOrder.findUnique({
            where: { orderNumber: orderId },
        });

        if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });

        // DETERMINE CONFIG: Prioritize per-carrier config from shippingMethods
        let apiKey = config.apiKey;
        let shopId = config.shopId;
        let shippingMethod = config.shippingMethod || "thaipost";

        try {
            const shopSettingsRaw = await prisma.shop.findFirst({ orderBy: { createdAt: 'asc' } });
            if (shopSettingsRaw?.paymentConfig) {
                const cfg: any = shopSettingsRaw.paymentConfig;
                if (cfg.shippingMethods) {
                    const methods: any[] = Array.isArray(cfg.shippingMethods) 
                        ? cfg.shippingMethods 
                        : JSON.parse(cfg.shippingMethods as string || "[]");
                    
                    const matchedMethod = methods.find(m => m.name === order.shipping || m.id === order.shipping);
                    if (matchedMethod) {
                        if (matchedMethod.proshipCarrierCode) shippingMethod = matchedMethod.proshipCarrierCode;
                        if (matchedMethod.proshipApiKey) apiKey = matchedMethod.proshipApiKey;
                        if (matchedMethod.proshipShopId) shopId = matchedMethod.proshipShopId;
                        console.log(`🎯 Using Dynamic Config for "${order.shipping}": Carrier=${shippingMethod}, HasKey=${!!apiKey}`);
                    }
                }
            }
        } catch (err) {
            console.error("Error matching dynamic config:", err);
        }

        if (!apiKey || !shopId) {
            return NextResponse.json({ success: false, error: "กรุณาตั้งค่า API Key และ Shop ID สำหรับขนส่งนี้ก่อน" }, { status: 400 });
        }

        const customerData: any = typeof order.customerData === 'string' ? JSON.parse(order.customerData) : order.customerData || {};
        const itemsData: any = typeof order.itemsData === 'string' ? JSON.parse(order.itemsData) : order.itemsData || [];

        // Parse Address
        const addressMatch = customerData.address?.match(/(.+)\s(ตำบล|ต\.)(.+)\s(อำเภอ|เขต|อ\.)(.+)\s(จังหวัด|จ\.)(.+)\s(\d{5})/);
        
        let addressStr = customerData.address || "";
        let province = "";
        let district = "";
        let subDistrict = "";
        let zipcode = "";

        if (addressMatch) {
            addressStr = addressMatch[1].trim();
            subDistrict = addressMatch[3].trim();
            district = addressMatch[5].trim();
            province = addressMatch[7].trim();
            zipcode = addressMatch[8].trim();
        } else {
            // Unstructured fallback for demo
            addressStr = order.shippingAddress || "N/A";
            province = "Bangkok";
            district = "Phaya Thai";
            subDistrict = "Samsen Nai";
            zipcode = "10400";
        }


        // Prepare Proship Payload
        const proshipPayload = {
            user: "ADMIN",
            shippingMethod: shippingMethod,
            weight: itemsData.reduce((sum: number, item: any) => sum + 1000 * (item.quantity || 1), 0), // Default 1kg per item from itemsData
            shopId: shopId,
            customer: {
                name: customerData.name || "Customer",
                address: {
                    address: addressStr,
                    province: province,
                    district: district,
                    subDistrict: subDistrict,
                    zipcode: parseInt(zipcode) || 10110
                },
                phoneNo: customerData.phone || "0000000000",
                salesChannel: "web"
            },
            productItems: itemsData.map((i: any) => ({
                sku: `${i.name}${i.variantName ? ` (${i.variantName})` : ''}`,
                qty: i.quantity || 1
            })),
            codAmount: order.payment === "พัสดุเก็บเงินปลายทาง (COD)" ? Number(order.total) : 0,
            remarks: order.note || ""
        };

        const res = await fetch("https://api.proship.me/orders/v1/orders", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(proshipPayload)
        });

        const data = await res.json();
        
        if (!res.ok || !data.message || data.message !== "Success") {
            const errorMsg = data.message || data.error || JSON.stringify(data);
            return NextResponse.json({ success: false, error: `Proship: ${errorMsg}` }, { status: 400 });
        }

        // Successfully created! Now grab the tracking number if returned, or we need to GET it.
        // Documentation says response contains id e.g. "order-xxxxx|yyyyyy", and trackingNo comes via GET.
        // If the Tracking is attached directly in some cases, we might capture it.
        
        const proshipOrderId = data.id || data.orderId || data.data?.id;
        
        console.log("📦 Created Proship Order ID:", proshipOrderId);

        let trackingNumber = data.trackingNo || data.data?.trackingNo || "";
        
        // If no tracking yet, retry fetching up to 3 times with 2s delay
        if (!trackingNumber && proshipOrderId) {
            for (let i = 0; i < 3; i++) {
                console.log(`⏳ Retrieval attempt ${i+1} for tracking...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                const getRes = await fetch(`https://api.proship.me/orders/v1/orders/${proshipOrderId}`, {
                    headers: { "Authorization": `Bearer ${apiKey}` }
                });
                if (getRes.ok) {
                    const getData = await getRes.json();
                    if (getData.trackingNo) {
                        trackingNumber = getData.trackingNo;
                        break;
                    }
                }
            }
        }

        // Even if tracking is still empty, we return success so UI can show the Proship ID was created
        if (trackingNumber) {
            await prisma.ecommerceOrder.update({
                where: { orderNumber: orderId },
                data: {
                    trackingNumber,
                    shippingProvider: `Proship|${proshipOrderId}|${shippingMethod}`
                }
            });
        }

        return NextResponse.json({ 
            success: true, 
            trackingNumber: trackingNumber || "กำลังรอเลขจากระบบ...", 
            proshipId: proshipOrderId 
        });
    } catch (e: any) {
        console.error("Proship Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
