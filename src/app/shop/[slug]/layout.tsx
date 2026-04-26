import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    
    try {
        const shop = await prisma.shop.findUnique({
            where: { slug },
            select: { name: true, logo: true, description: true },
        });

        if (!shop) {
            return {
                title: "ไม่พบร้านค้า",
                description: "ร้านค้านี้อาจยังไม่ได้เปิดให้บริการ",
            };
        }

        const shopName = shop.name || slug;
        const description = shop.description || `ร้านค้าออนไลน์ ${shopName} — สินค้าคุณภาพ สั่งซื้อง่าย จัดส่งทั่วประเทศ`;

        return {
            title: `${shopName} — ร้านค้าออนไลน์`,
            description,
            openGraph: {
                title: shopName,
                description,
                type: "website",
                ...(shop.logo ? { images: [{ url: shop.logo, width: 400, height: 400, alt: shopName }] } : {}),
            },
            twitter: {
                card: "summary",
                title: shopName,
                description,
                ...(shop.logo ? { images: [shop.logo] } : {}),
            },
        };
    } catch {
        return {
            title: slug,
            description: `ร้านค้าออนไลน์ ${slug}`,
        };
    }
}

export default function ShopSlugLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
