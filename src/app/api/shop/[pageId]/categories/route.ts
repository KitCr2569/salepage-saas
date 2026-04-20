import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/shop/[pageId]/categories
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string }> }
) {
    try {
        const { pageId } = await params;
        const shop = await prisma.shop.findUnique({ where: { pageId } });
        if (!shop) return NextResponse.json({ success: true, data: [] });

        const categories = await prisma.shopCategory.findMany({
            where: { shopId: shop.id },
            orderBy: { sortOrder: "asc" },
        });
        return NextResponse.json({ success: true, data: categories });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

// POST /api/shop/[pageId]/categories
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string }> }
) {
    try {
        const { pageId } = await params;
        const { name, nameEn } = await request.json();

        let shop = await prisma.shop.findUnique({ where: { pageId } });
        if (!shop) {
            shop = await prisma.shop.create({
                data: { pageId, name: pageId, slug: `shop-${pageId.slice(-8)}-${Date.now().toString(36)}` },
            });
        }

        const maxSort = await prisma.shopCategory.aggregate({
            where: { shopId: shop.id },
            _max: { sortOrder: true },
        });

        const cat = await prisma.shopCategory.create({
            data: {
                shopId: shop.id,
                name,
                nameEn: nameEn || name,
                sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
            },
        });

        return NextResponse.json({ success: true, data: cat });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

// DELETE /api/shop/[pageId]/categories?id=xxx
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string }> }
) {
    try {
        const { pageId } = await params;
        const catId = request.nextUrl.searchParams.get("id");
        if (!catId) {
            return NextResponse.json({ success: false, error: "Missing category id" }, { status: 400 });
        }

        const shop = await prisma.shop.findUnique({ where: { pageId } });
        if (!shop) {
            return NextResponse.json({ success: false, error: "Shop not found" }, { status: 404 });
        }

        // Verify category belongs to this shop
        const cat = await prisma.shopCategory.findFirst({
            where: { id: catId, shopId: shop.id },
        });
        if (!cat) {
            return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
        }

        // Set products in this category to null (uncategorized)
        await prisma.shopProduct.updateMany({
            where: { categoryId: catId, shopId: shop.id },
            data: { categoryId: null },
        });

        // Delete the category
        await prisma.shopCategory.delete({ where: { id: catId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
