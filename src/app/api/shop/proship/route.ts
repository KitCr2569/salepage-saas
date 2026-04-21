import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopFromRequest, clearShopCache } from '@/lib/tenant';

// GET Proship config
export async function GET(request: NextRequest) {
    try {
        const { shop } = await getShopFromRequest(request);
        if (!shop) return NextResponse.json({ success: false, error: "Shop not found" }, { status: 404 });

        const config = (shop.shippingConfig as any)?.proship || {};
        return NextResponse.json({ success: true, config });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

// POST update Proship config
export async function POST(request: NextRequest) {
    try {
        const { shop } = await getShopFromRequest(request);
        if (!shop) return NextResponse.json({ success: false, error: "Shop not found" }, { status: 404 });

        const body = await request.json();
        
        let existingConfig = (shop.shippingConfig as any) || {};
        existingConfig.proship = {
            apiKey: body.apiKey || "",
            shopId: body.shopId || "",
            shippingMethod: body.shippingMethod || "thaipost"
        };

        await prisma.shop.update({
            where: { id: shop.id },
            data: { shippingConfig: existingConfig }
        });

        clearShopCache();
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
