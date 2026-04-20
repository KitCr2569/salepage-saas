import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { products as defaultProducts, categories as defaultCategories, shopConfig as defaultShopConfig } from "@/data";

export const dynamic = "force-dynamic";

// GET /api/shop/[pageId] — ดึงข้อมูลร้าน + สินค้า + หมวดหมู่
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string }> }
) {
    const { pageId } = await params;

    try {
        // admin=1 query param → ส่งสินค้าทั้งหมด (รวม inactive)
        const isAdmin = request.nextUrl.searchParams.get('admin') === '1';

        // หา shop ตาม pageId
        let shop = await prisma.shop.findUnique({
            where: { pageId },
            include: {
                categories: { orderBy: { sortOrder: "asc" } },
                products: {
                    where: isAdmin ? {} : { isActive: true },
                    orderBy: { sortOrder: "asc" },
                },
                textures: { orderBy: { sortOrder: "asc" } },
            },
        });

        // ถ้าไม่มี → auto-seed ด้วยข้อมูล default
        if (!shop) {
            shop = await seedDefaultShop(pageId);
        }

        // Format response
        const shopConfig = {
            shopName: shop.name,
            shopLogo: shop.logo || defaultShopConfig.shopLogo,
            currency: shop.currency,
            currencySymbol: shop.currencySymbol,
        };

        const categories = [
            { id: "all", name: "ทั้งหมด", nameEn: "All" },
            ...shop.categories.map((c) => ({
                id: c.id,
                name: c.name,
                nameEn: c.nameEn,
            })),
        ];

        const products = shop.products.map((p) => {
            const allImages = p.images as string[];
            return {
                id: p.id,
                name: p.name,
                description: p.description || "",
                price: Number(p.price),
                images: allImages.length > 0 ? [allImages[0]] : [],
                categoryId: p.categoryId || "all",
                variants: p.variants as any[],
                badge: p.badge || undefined,
                active: p.isActive, // ส่ง active state กลับให้ admin
            };
        });

        const textures = shop.textures.map((t) => ({
            id: t.id,
            series: t.series,
            code: t.code,
            name: t.name,
            image: t.image,
            isActive: t.isActive,
            sortOrder: t.sortOrder,
        }));

        return NextResponse.json({
            success: true,
            data: { shopConfig, categories, products, textures, shopId: shop.id },
        });
    } catch (error) {
        console.error("Error fetching shop (returning fallback):", error);
        // Return fallback default data when DB table doesn't exist
        const fallbackCategories = [
            { id: "all", name: "ทั้งหมด", nameEn: "All" },
            ...defaultCategories.filter(c => c.id !== "all" && c.id !== "sale").map(c => ({
                id: c.id,
                name: c.name,
                nameEn: c.nameEn,
            })),
        ];
        const fallbackProducts = defaultProducts.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description || "",
            price: p.price,
            images: p.images?.length ? [p.images[0]] : [],
            categoryId: p.categoryId || "all",
            variants: p.variants || [],
            badge: p.badge || undefined,
        }));
        return NextResponse.json({
            success: true,
            data: {
                shopConfig: defaultShopConfig,
                categories: fallbackCategories,
                products: fallbackProducts,
                textures: [],
                shopId: null,
            },
        });
    }
}

// POST /api/shop/[pageId] — สร้าง/อัปเดตร้าน
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string }> }
) {
    const { pageId } = await params;

    try {
        const body = await request.json();
        const { name, logo } = body;

        const shop = await prisma.shop.upsert({
            where: { pageId },
            update: { name, logo, updatedAt: new Date() },
            create: {
                pageId,
                slug: `shop-${pageId.slice(-8)}-${Date.now().toString(36)}`,
                name: name || "ร้านค้าใหม่",
                logo: logo || null,
            },
            include: {
                categories: { orderBy: { sortOrder: "asc" } },
                products: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
            },
        });

        // Don't auto-seed products here — only GET handler seeds for HDG page

        return NextResponse.json({ success: true, data: { shopId: shop.id } });
    } catch (error) {
        console.error("Error creating/updating shop:", error);
        return NextResponse.json(
            { success: false, error: "Failed to save shop" },
            { status: 500 }
        );
    }
}

// ─── Helper: Seed default shop ──────────────────────────────────
const HDG_PAGE_ID = "114336388182180";

async function seedDefaultShop(pageId: string) {
    // Generate slug
    const slug = pageId === HDG_PAGE_ID
        ? "hdgwrapskin"
        : `shop-${pageId.slice(-8)}`;

    // Create shop
    const shop = await prisma.shop.create({
        data: {
            pageId,
            slug,
            name: pageId === HDG_PAGE_ID ? defaultShopConfig.shopName : "ร้านค้าใหม่",
            logo: pageId === HDG_PAGE_ID ? defaultShopConfig.shopLogo : null,
            currency: defaultShopConfig.currency,
            currencySymbol: defaultShopConfig.currencySymbol,
        },
    });

    // เฉพาะ HDG page จะ seed สินค้า default — เพจอื่น ๆ เริ่มจากร้านเปล่า
    if (pageId === HDG_PAGE_ID) {
        await seedDefaultProducts(shop.id);
    }

    // Re-fetch with relations
    return await prisma.shop.findUniqueOrThrow({
        where: { id: shop.id },
        include: {
            categories: { orderBy: { sortOrder: "asc" } },
            products: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
            textures: { orderBy: { sortOrder: "asc" } },
        },
    });
}

async function seedDefaultProducts(shopId: string) {
    // Create categories (skip "all" — it's virtual)
    const categoryMap: Record<string, string> = {};

    for (let i = 0; i < defaultCategories.length; i++) {
        const cat = defaultCategories[i];
        if (cat.id === "all" || cat.id === "sale") continue;

        const created = await prisma.shopCategory.create({
            data: {
                shopId,
                name: cat.name,
                nameEn: cat.nameEn,
                sortOrder: i,
            },
        });
        categoryMap[cat.id] = created.id;
    }

    // Create products
    for (let i = 0; i < defaultProducts.length; i++) {
        const prod = defaultProducts[i];
        await prisma.shopProduct.create({
            data: {
                shopId,
                categoryId: categoryMap[prod.categoryId] || null,
                name: prod.name,
                description: prod.description || null,
                price: prod.price,
                images: prod.images || [],
                variants: prod.variants || [],
                badge: prod.badge || null,
                sortOrder: i,
            },
        });
    }
}

