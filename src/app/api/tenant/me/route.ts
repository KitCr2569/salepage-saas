import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "tenant-secret-key"
);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "ไม่ได้เข้าสู่ระบบ" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (payload.type !== "tenant" || !payload.tenantId) {
      return NextResponse.json(
        { success: false, error: "Token ไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: payload.tenantId as string },
      include: {
        shops: {
          include: {
            _count: { select: { products: true, categories: true, orders: true } },
          },
        },
        subscription: { include: { plan: true } },
      },
    });

    if (!tenant || !tenant.isActive) {
      return NextResponse.json(
        { success: false, error: "บัญชีไม่พบหรือถูกระงับ" },
        { status: 404 }
      );
    }

    const sub = tenant.subscription;
    let planInfo = null;
    if (sub?.plan) {
      planInfo = {
        name: sub.plan.name,
        slug: sub.plan.slug,
        price: sub.plan.price,
        maxProducts: sub.plan.maxProducts,
        maxShops: sub.plan.maxShops,
        features: sub.plan.features,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        autoRenew: sub.autoRenew,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          email: tenant.email,
          name: tenant.name,
          phone: tenant.phone,
          avatarUrl: tenant.avatarUrl,
          createdAt: tenant.createdAt,
        },
        shops: tenant.shops.map((s: any) => ({
          id: s.id,
          slug: s.slug,
          name: s.name,
          logo: s.logo,
          description: s.description,
          themeColor: s.themeColor,
          isActive: s.isActive,
          productCount: s._count.products,
          categoryCount: s._count.categories,
          orderCount: s._count.orders,
        })),
        plan: planInfo,
      },
    });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json(
      { success: false, error: "Token หมดอายุ กรุณาเข้าสู่ระบบใหม่" },
      { status: 401 }
    );
  }
}
