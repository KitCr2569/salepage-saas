import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PUT /api/shop/[pageId]/products/[productId] — แก้ไขสินค้า (supports partial updates)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string; productId: string }> }
) {
    try {
        const { pageId, productId } = await params;
        const body = await request.json();

        // Validate productId exists in DB
        const existing = await prisma.shopProduct.findUnique({ where: { id: productId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: `Product not found: ${productId}` },
                { status: 404 }
            );
        }

        // Build update data dynamically — only include fields that were sent
        const updateData: Record<string, any> = {};

        if ('name' in body) updateData.name = body.name;
        if ('description' in body) updateData.description = body.description || null;
        if ('images' in body) updateData.images = body.images || [];
        if ('variants' in body) updateData.variants = body.variants || [];
        if ('badge' in body) updateData.badge = body.badge || null;
        if ('sortOrder' in body) updateData.sortOrder = body.sortOrder;

        // Handle active/isActive toggle
        if ('active' in body) updateData.isActive = body.active;
        if ('isActive' in body) updateData.isActive = body.isActive;

        // Handle price — validate only if provided
        if ('price' in body) {
            const numericPrice = typeof body.price === "string" ? parseFloat(body.price) : Number(body.price);
            if (isNaN(numericPrice)) {
                return NextResponse.json(
                    { success: false, error: `Invalid price value: ${body.price}` },
                    { status: 400 }
                );
            }
            updateData.price = numericPrice;
        }

        // Handle categoryId — validate if provided
        if ('categoryId' in body) {
            const { categoryId } = body;
            if (categoryId && categoryId !== "all" && !categoryId.startsWith("cat-")) {
                const shop = await prisma.shop.findUnique({ where: { pageId } });
                if (shop) {
                    const cat = await prisma.shopCategory.findFirst({
                        where: { id: categoryId, shopId: shop.id },
                    });
                    updateData.categoryId = cat ? cat.id : null;
                }
            } else {
                updateData.categoryId = null;
            }
        }

        const product = await prisma.shopProduct.update({
            where: { id: productId },
            data: updateData,
        });

        return NextResponse.json({ success: true, data: product });
    } catch (error) {
        console.error("[PUT product] Error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

// DELETE /api/shop/[pageId]/products/[productId] — ลบสินค้า
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string; productId: string }> }
) {
    try {
        const { productId } = await params;
        await prisma.shopProduct.delete({ where: { id: productId } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
