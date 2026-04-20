// ═══════════════════════════════════════════════════════════════
// GET /api/products — Return product catalog for Chat Dashboard
// Shipping & payment loaded from DB (admin-controlled settings)
// ═══════════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic'; // Disable Vercel cache — always read from DB

import { NextRequest, NextResponse } from "next/server";
import { products, categories, shippingMethods as defaultShipping, paymentMethods as defaultPayment } from "@/data";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    // Allow CORS from Chat Dashboard
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };

    // Return simplified product data for order creation
    let productList: any[] = [];
    let categoryList: any[] = [];
    
    // ── Load shipping & payment from DB settings (admin-controlled) ──
    // Fall back to static defaults if DB is unavailable or unconfigured
    let shippingList = defaultShipping.map((s) => ({
        id: s.id,
        name: s.name,
        nameEn: s.nameEn,
        price: s.price,
        days: s.days,
    }));

    let paymentList = defaultPayment.map((p) => ({
        id: p.id,
        name: p.name,
        nameEn: p.nameEn,
        icon: p.icon,
    }));

    try {
        const shop = await prisma.shop.findFirst({ 
            orderBy: { createdAt: "asc" },
            include: {
                categories: { orderBy: { sortOrder: "asc" } },
                products: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
            }
        });
        
        if (shop) {
            if (shop.paymentConfig) {
                const cfg = shop.paymentConfig as any;

                // Override shipping with admin-configured list (filter enabled only)
                if (Array.isArray(cfg.shippingMethods) && cfg.shippingMethods.length > 0) {
                    const enabled = cfg.shippingMethods.filter((s: any) => s.enabled !== false);
                    if (enabled.length > 0) {
                        shippingList = enabled.map((s: any) => ({
                            id: s.id,
                            name: s.name,
                            nameEn: s.nameEn || s.name,
                            price: s.price ?? 0,
                            days: s.days || "",
                        }));
                    }
                }

                // Override payment with admin-configured list (filter enabled only)
                if (Array.isArray(cfg.paymentMethods) && cfg.paymentMethods.length > 0) {
                    const enabled = cfg.paymentMethods.filter((p: any) => p.enabled !== false);
                    if (enabled.length > 0) {
                        paymentList = enabled.map((p: any) => ({
                            id: p.id,
                            name: p.name,
                            nameEn: p.nameEn || p.name,
                            icon: p.icon || "💳",
                        }));
                    }
                }
            }

            // Load products from DB
            categoryList = shop.categories.map((c) => ({
                id: c.id,
                name: c.name,
                nameEn: c.nameEn,
            }));

            productList = shop.products.map((p) => {
                const images = p.images as string[];
                const variants = p.variants as any[];
                return {
                    id: p.id,
                    name: p.name,
                    price: Number(p.price),
                    image: images.length > 0 ? images[0] : null,
                    categoryId: p.categoryId || "all",
                    categoryName: shop.categories.find(c => c.id === p.categoryId)?.name || "",
                    variantCount: variants.length,
                    variants: variants.map((v: any) => ({
                        id: v.id,
                        name: v.name,
                        price: Number(v.price),
                        image: v.image || null,
                        stock: v.stock || 0,
                    })),
                };
            });
        }
    } catch (err) {
        console.error("[api/products] Failed to load from DB:", err);
    }

    // Fallback if DB is completely empty (no products)
    if (productList.length === 0) {
        productList = products.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            image: p.images[0] || null,
            categoryId: p.categoryId,
            categoryName: categories.find((c) => c.id === p.categoryId)?.name || "",
            variantCount: p.variants.length,
            variants: p.variants.map((v) => ({
                id: v.id,
                name: v.name,
                price: v.price,
                image: v.image || null,
                stock: v.stock,
            })),
        }));
        categoryList = categories.filter((c) => c.id !== "all");
    }

    return NextResponse.json(
        {
            success: true,
            products: productList,
            categories: categoryList,
            shippingMethods: shippingList,
            paymentMethods: paymentList,
            shopName: "HDG Wrap Sticker",
        },
        { headers }
    );
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}
