import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string; textureId: string }> }
) {
    try {
        const { pageId, textureId } = await params;
        const body = await request.json();
        const { name, series, code, image, sortOrder, isActive } = body;

        const shop = await prisma.shop.findUnique({ where: { pageId } });
        if (!shop) return NextResponse.json({ success: false, error: "Shop not found" }, { status: 404 });

        // Update single texture
        const updated = await prisma.shopTexture.update({
            where: { id: textureId, shopId: shop.id },
            data: {
                ...(name !== undefined && { name }),
                ...(series !== undefined && { series }),
                ...(code !== undefined && { code }),
                ...(image !== undefined && { image }),
                ...(sortOrder !== undefined && { sortOrder }),
                ...(isActive !== undefined && { isActive }),
            },
        });

        // --- Auto Sync Texture to All Products ---
        const allProducts = await prisma.shopProduct.findMany({ where: { shopId: shop.id } });
        for (const prod of allProducts) {
            let variants: any[] = Array.isArray(prod.variants) ? [...prod.variants] : [];
            let changed = false;

            if (updated.isActive) {
                // Add or Update
                const existingIdx = variants.findIndex((v: any) => v.name === updated.code || v.id === updated.code);
                if (existingIdx !== -1) {
                    // Update existing
                    variants[existingIdx] = { ...variants[existingIdx], image: updated.image, id: updated.code, name: updated.code };
                    changed = true;
                } else {
                    // Append new
                    variants.push({
                        id: updated.code,
                        name: updated.code,
                        price: Number(prod.price),
                        stock: 99,
                        image: updated.image
                    });
                    changed = true;
                }
            } else {
                // Remove if exists
                const newVariants = variants.filter((v: any) => v.name !== updated.code && v.id !== updated.code);
                if (newVariants.length !== variants.length) {
                    variants = newVariants;
                    changed = true;
                }
            }

            if (changed) {
                await prisma.shopProduct.update({ where: { id: prod.id }, data: { variants } });
            }
        }
        // ------------------------------------------

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        console.error("[PUT texture] Error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string; textureId: string }> }
) {
    try {
        const { pageId, textureId } = await params;

        const shop = await prisma.shop.findUnique({ where: { pageId } });
        if (!shop) return NextResponse.json({ success: false, error: "Shop not found" }, { status: 404 });

        // Admin bulk delete route: Check if query has ids=
        const url = new URL(request.url);
        const ids = url.searchParams.get("ids");
        if (ids) {
            const idsList = ids.split(",");
            
            // Get codes before deleting to remove them from products
            const textures = await prisma.shopTexture.findMany({ where: { id: { in: idsList }, shopId: shop.id } });
            const codes = textures.map(t => t.code);

            await prisma.shopTexture.deleteMany({
                where: {
                    shopId: shop.id,
                    id: { in: idsList },
                },
            });
            
            // Remove from products
            if (codes.length > 0) {
                const allProducts = await prisma.shopProduct.findMany({ where: { shopId: shop.id } });
                for (const prod of allProducts) {
                    if (!Array.isArray(prod.variants)) continue;
                    const variants = prod.variants.filter((v: any) => !codes.includes(v.name) && !codes.includes(v.id));
                    if (variants.length !== prod.variants.length) {
                        await prisma.shopProduct.update({ where: { id: prod.id }, data: { variants } });
                    }
                }
            }
            
            return NextResponse.json({ success: true, deletedCount: idsList.length });
        }

        // Get code before deleting to remove from products
        const texture = await prisma.shopTexture.findUnique({ where: { id: textureId, shopId: shop.id } });

        // Delete single texture
        await prisma.shopTexture.delete({
            where: { id: textureId, shopId: shop.id },
        });
        
        // Remove from products
        if (texture) {
            const allProducts = await prisma.shopProduct.findMany({ where: { shopId: shop.id } });
            for (const prod of allProducts) {
                if (!Array.isArray(prod.variants)) continue;
                const variants = prod.variants.filter((v: any) => v.name !== texture.code && v.id !== texture.code);
                if (variants.length !== prod.variants.length) {
                    await prisma.shopProduct.update({ where: { id: prod.id }, data: { variants } });
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[DELETE texture] Error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
