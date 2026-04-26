import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import ShopClient from "./ShopClient";
import { products as defaultProducts, categories as defaultCategories, shopConfig as defaultShopConfig } from "@/data";

export async function generateMetadata({ params }: { params: Promise<{ pageId: string }> }): Promise<Metadata> {
    const { pageId } = await params;
    try {
        const shop = await prisma.shop.findUnique({
            where: { pageId },
            select: { name: true, logo: true },
        });
        const shopName = shop?.name || "Shop";
        return {
            title: `${shopName} — ร้านค้าออนไลน์`,
            description: `ร้านค้าออนไลน์ ${shopName} — สินค้าคุณภาพ สั่งซื้อง่าย จัดส่งทั่วประเทศ`,
            openGraph: {
                title: shopName,
                description: `สั่งซื้อสินค้าจาก ${shopName}`,
                type: "website",
                ...(shop?.logo ? { images: [{ url: shop.logo, width: 400, height: 400, alt: shopName }] } : {}),
            },
        };
    } catch {
        return { title: "Shop" };
    }
}

async function getSettings() {
    try {
        let shop = await prisma.shop.findFirst({
            orderBy: { createdAt: 'asc' }
        });
        
        if (!shop) {
            shop = await prisma.shop.create({
                data: {
                    pageId: process.env.FACEBOOK_PAGE_ID || "",
                    slug: process.env.NEXT_PUBLIC_SHOP_SLUG || "default",
                    name: process.env.NEXT_PUBLIC_SHOP_NAME || "Shop",
                    currency: "THB",
                    currencySymbol: "฿",
                }
            });
        }
        return shop.paymentConfig || {};
    } catch (error) {
        console.error("Database connection failed in getSettings:", error);
        return {};
    }
}

// Reuse the same logic as the API shop endpoint
async function getShopData(pageId: string) {
    try {
        let shop = await prisma.shop.findUnique({
            where: { pageId },
            include: {
                categories: { orderBy: { sortOrder: "asc" } },
                products: {
                    where: { isActive: true },
                    orderBy: { sortOrder: "asc" },
                },
                textures: { orderBy: { sortOrder: "asc" } },
            },
        });

        if (!shop) {
            // Because we don't want to redefine seedDefaultShop here, we'll return a minimal fallback 
            // that matches what the client previously received.
            // On the client Side (if seed is needed), they can still hit POST/PUT endpoints if needed.
            // For SSR we safely fallback if shop is not found (which shouldn't happen for the main site)
            return {
                shopConfig: defaultShopConfig,
                categories: [
                    { id: "all", name: "ทั้งหมด", nameEn: "All" },
                    ...defaultCategories.filter(c => c.id !== "all" && c.id !== "sale").map(c => ({
                        id: c.id, name: c.name, nameEn: c.nameEn
                    }))
                ],
                products: defaultProducts.map(p => ({
                    id: p.id, name: p.name, description: p.description || "",
                    price: p.price, images: p.images?.length ? [p.images[0]] : [],
                    categoryId: p.categoryId || "all", variants: p.variants || [],
                    badge: p.badge || undefined,
                })),
                textures: [],
            };
        }

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
                active: p.isActive,
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

        return { shopConfig, categories, products, textures };
    } catch (error) {
        console.error("Error fetching shop data for SSR:", error);
        return null;
    }
}

export default async function PageById(props: { params: Promise<{ pageId: string }> }) {
    const { pageId } = await props.params;

    // Fetch data simultaneously on the server
    const [initialSettings, initialShopData] = await Promise.all([
        getSettings(),
        getShopData(pageId)
    ]);

    return (
        <ShopClient 
            pageId={pageId} 
            initialSettings={initialSettings} 
            initialShopData={initialShopData} 
        />
    );
}
