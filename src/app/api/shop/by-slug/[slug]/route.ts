import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    const shop = await prisma.shop.findUnique({
      where: { slug },
      include: {
        categories: { orderBy: { sortOrder: "asc" } },
        products: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
        tenant: {
          include: {
            subscription: { include: { plan: true } },
          },
        },
      },
    });

    if (!shop || !shop.isActive) {
      return NextResponse.json(
        { success: false, error: "ไม่พบร้านค้านี้" },
        { status: 404 }
      );
    }

    // Check subscription
    const sub = shop.tenant?.subscription;
    if (sub && sub.status !== "ACTIVE" && sub.status !== "TRIAL") {
      return NextResponse.json(
        { success: false, error: "ร้านค้านี้หยุดให้บริการชั่วคราว" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        shop: {
          id: shop.id,
          slug: shop.slug,
          name: shop.name,
          description: shop.description,
          logo: shop.logo,
          bannerImages: shop.bannerImages,
          themeColor: shop.themeColor,
          currency: shop.currency,
          currencySymbol: shop.currencySymbol,
          socialLinks: shop.socialLinks,
          paymentConfig: shop.paymentConfig,
          shippingConfig: shop.shippingConfig,
        },
        categories: shop.categories.map((c) => ({
          id: c.id,
          name: c.name,
          nameEn: c.nameEn,
        })),
        products: shop.products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          images: p.images,
          variants: p.variants,
          badge: p.badge,
          categoryId: p.categoryId,
        })),
      },
    });
  } catch (error) {
    console.error("Shop by slug error:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}
