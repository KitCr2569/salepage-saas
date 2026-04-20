import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/shop/[pageId]/textures — ดึงลวดลายทั้งหมด
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string }> }
) {
    try {
        const { pageId } = await params;
        const shop = await prisma.shop.findUnique({ where: { pageId } });
        if (!shop) return NextResponse.json({ success: true, data: [] });

        const textures = await prisma.shopTexture.findMany({
            where: { shopId: shop.id },
            orderBy: { sortOrder: "asc" },
        });

        return NextResponse.json({ success: true, data: textures });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

// POST /api/shop/[pageId]/textures — เพิ่ม Texture ใหม่
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string }> }
) {
    try {
        const { pageId } = await params;
        const body = await request.json();
        const { name, series, code, image, isActive } = body;

        let shop = await prisma.shop.findUnique({ where: { pageId } });
        if (!shop) {
            shop = await prisma.shop.create({
                data: { pageId, name: pageId, slug: `shop-${pageId.slice(-8)}-${Date.now().toString(36)}` },
            });
        }

        const maxSort = await prisma.shopTexture.aggregate({
            where: { shopId: shop.id },
            _max: { sortOrder: true },
        });

        const texture = await prisma.shopTexture.create({
            data: {
                shopId: shop.id,
                name,
                series: series || "Default",
                code: code || "",
                image: image || "",
                isActive: isActive ?? true,
                sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
            },
        });

        // --- Auto Sync Texture to All Products ---
        if (texture.isActive) {
            const allProducts = await prisma.shopProduct.findMany({ where: { shopId: shop.id } });
            
            for (const prod of allProducts) {
                const variants = Array.isArray(prod.variants) ? [...prod.variants] : [];
                // Check if already exists
                const exists = variants.find((v: any) => v.name === texture.code);
                if (!exists) {
                    variants.push({
                        id: texture.code,
                        name: texture.code,
                        price: Number(prod.price), // use base price
                        stock: 99,                 // default stock
                        image: texture.image
                    });
                    
                    await prisma.shopProduct.update({
                        where: { id: prod.id },
                        data: { variants }
                    });
                }
            }
        }
        // ------------------------------------------

        return NextResponse.json({ success: true, data: texture });
    } catch (error) {
        console.error("[POST texture] Error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
