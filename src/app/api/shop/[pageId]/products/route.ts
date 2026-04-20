import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/shop/[pageId]/products — ดึงสินค้าทั้งหมด
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string }> }
) {
    try {
        const { pageId } = await params;
        const shop = await prisma.shop.findUnique({ where: { pageId } });
        if (!shop) return NextResponse.json({ success: true, data: [] });

        const products = await prisma.shopProduct.findMany({
            where: { shopId: shop.id },
            include: { category: true },
            orderBy: { sortOrder: "asc" },
        });

        return NextResponse.json({ success: true, data: products });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

// POST /api/shop/[pageId]/products — เพิ่มสินค้าใหม่
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string }> }
) {
    try {
        const { pageId } = await params;
        const body = await request.json();
        const { name, description, price, images, categoryId, variants, badge } = body;

        // Find or create shop
        let shop = await prisma.shop.findUnique({ where: { pageId } });
        if (!shop) {
            shop = await prisma.shop.create({
                data: { pageId, name: pageId, slug: `shop-${pageId.slice(-8)}-${Date.now().toString(36)}` },
            });
        }

        // Get max sortOrder
        const maxSort = await prisma.shopProduct.aggregate({
            where: { shopId: shop.id },
            _max: { sortOrder: true },
        });

        // Validate categoryId — must be a real ShopCategory UUID for this shop
        let validCategoryId: string | null = null;
        if (categoryId && categoryId !== "all" && !categoryId.startsWith("cat-")) {
            const cat = await prisma.shopCategory.findFirst({
                where: { id: categoryId, shopId: shop.id },
            });
            validCategoryId = cat ? cat.id : null;
        }

        // Ensure price is a valid number for Decimal field
        const numericPrice = typeof price === "string" ? parseFloat(price) : Number(price);
        if (isNaN(numericPrice)) {
            return NextResponse.json(
                { success: false, error: `Invalid price value: ${price}` },
                { status: 400 }
            );
        }

        const product = await prisma.shopProduct.create({
            data: {
                shopId: shop.id,
                name,
                description: description || null,
                price: numericPrice,
                images: images || [],
                variants: variants || [],
                badge: badge || null,
                categoryId: validCategoryId,
                sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
            },
        });

        return NextResponse.json({ success: true, data: product });
    } catch (error) {
        console.error("[POST product] Error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
