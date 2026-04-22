import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "tenant-secret-key"
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email, password, name, phone, shopName,
      inviteCode, facebookPageId, facebookPageToken,
      facebookUserId, facebookAccessToken,
    } = body;

    // Validate
    if (!email || !password || !name || !shopName) {
      return NextResponse.json(
        { success: false, error: "กรุณากรอกข้อมูลให้ครบ (email, password, name, shopName)" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await prisma.tenant.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "อีเมลนี้ถูกใช้งานแล้ว" },
        { status: 409 }
      );
    }

    // ─── Validate & consume invite code ───
    let planSlug = "free";
    if (inviteCode) {
      const code = await prisma.inviteCode.findUnique({ where: { code: inviteCode } });
      if (!code) {
        return NextResponse.json({ success: false, error: "รหัสเชิญไม่ถูกต้อง" }, { status: 400 });
      }
      if (code.isUsed) {
        return NextResponse.json({ success: false, error: "รหัสเชิญนี้ถูกใช้ไปแล้ว" }, { status: 400 });
      }
      planSlug = code.planSlug;
    }

    // Find plan
    const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
    if (!plan) {
      // Fallback to free plan
      const freePlan = await prisma.plan.findUnique({ where: { slug: "free" } });
      if (!freePlan) {
        return NextResponse.json(
          { success: false, error: "ไม่พบแพ็กเกจ กรุณาติดต่อผู้ดูแลระบบ" },
          { status: 500 }
        );
      }
    }
    const selectedPlan = plan || (await prisma.plan.findUnique({ where: { slug: "free" } }))!;

    // Generate slug from shopName
    let slug = shopName
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙]+/g, "-")
      .replace(/^-|-$/g, "");
    const existingShop = await prisma.shop.findUnique({ where: { slug } });
    if (existingShop) slug = slug + "-" + Date.now().toString(36);

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Determine pageId
    const pageId = facebookPageId || `tenant-${Date.now()}`;

    // Check if pageId already exists
    const existingPage = await prisma.shop.findUnique({ where: { pageId } });
    if (existingPage) {
      return NextResponse.json(
        { success: false, error: "เพจนี้ถูกเชื่อมต่อกับร้านค้าอื่นแล้ว" },
        { status: 409 }
      );
    }

    // Create tenant + shop + subscription
    const now = new Date();
    const endDate = new Date(now);
    if (planSlug === "free") {
      endDate.setFullYear(endDate.getFullYear() + 100);
    } else {
      endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription
    }

    // Build shop config with FB data
    const shopConfig: any = {
      pageId,
      slug,
      name: shopName,
      logo: null,
      themeColor: "#e91e63",
    };

    // Store FB page token in config if available
    if (facebookPageToken || facebookAccessToken) {
      shopConfig.config = {};
    }

    const tenant = await prisma.tenant.create({
      data: {
        email,
        passwordHash,
        name,
        phone: phone || null,
        shops: { create: shopConfig },
        subscription: {
          create: {
            planId: selectedPlan.id,
            status: "ACTIVE",
            startDate: now,
            endDate,
            autoRenew: planSlug !== "free",
          },
        },
      },
      include: {
        shops: true,
        subscription: { include: { plan: true } },
      },
    });

    // Create default categories
    const shop = tenant.shops[0];
    await prisma.shopCategory.createMany({
      data: [
        { shopId: shop.id, name: "ทั้งหมด", nameEn: "All", sortOrder: 0 },
        { shopId: shop.id, name: "สินค้าแนะนำ", nameEn: "Featured", sortOrder: 1 },
        { shopId: shop.id, name: "สินค้าใหม่", nameEn: "New", sortOrder: 2 },
        { shopId: shop.id, name: "ลดราคา", nameEn: "Sale", sortOrder: 3 },
      ],
    });

    // ─── Mark invite code as used ───
    if (inviteCode) {
      await prisma.inviteCode.update({
        where: { code: inviteCode },
        data: { isUsed: true, usedBy: tenant.id, usedAt: new Date() },
      });
    }

    // Generate JWT
    const token = await new SignJWT({
      tenantId: tenant.id,
      email: tenant.email,
      name: tenant.name,
      type: "tenant",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    return NextResponse.json({
      success: true,
      data: {
        token,
        tenant: {
          id: tenant.id,
          email: tenant.email,
          name: tenant.name,
          phone: tenant.phone,
          avatarUrl: tenant.avatarUrl,
        },
        shops: tenant.shops.map(s => ({
          id: s.id, slug: s.slug, name: s.name, logo: s.logo,
          isActive: s.isActive, description: s.description, themeColor: s.themeColor,
        })),
        shop: { id: shop.id, slug: shop.slug, name: shop.name },
        plan: tenant.subscription?.plan
          ? {
              name: tenant.subscription.plan.name,
              slug: tenant.subscription.plan.slug,
              maxProducts: tenant.subscription.plan.maxProducts,
              maxShops: tenant.subscription.plan.maxShops,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการสมัครสมาชิก" },
      { status: 500 }
    );
  }
}
