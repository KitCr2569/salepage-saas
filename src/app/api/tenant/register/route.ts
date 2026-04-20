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
    const { email, password, name, phone, shopName } = body;

    // Validate
    if (!email || !password || !name || !shopName) {
      return NextResponse.json(
        {
          success: false,
          error: "กรุณากรอกข้อมูลให้ครบ (email, password, name, shopName)",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" },
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

    // Generate slug from shopName
    let slug = shopName
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙]+/g, "-")
      .replace(/^-|-$/g, "");

    // Ensure slug is unique
    const existingShop = await prisma.shop.findUnique({ where: { slug } });
    if (existingShop) {
      slug = slug + "-" + Date.now().toString(36);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Get free plan
    const freePlan = await prisma.plan.findUnique({
      where: { slug: "free" },
    });
    if (!freePlan) {
      return NextResponse.json(
        { success: false, error: "ไม่พบแพ็กเกจฟรี กรุณาติดต่อผู้ดูแลระบบ" },
        { status: 500 }
      );
    }

    // Create tenant + shop + subscription in transaction
    const now = new Date();
    const endDate = new Date(now);
    endDate.setFullYear(endDate.getFullYear() + 100); // Free plan = no expiry

    const tenant = await prisma.tenant.create({
      data: {
        email,
        passwordHash,
        name,
        phone: phone || null,
        shops: {
          create: {
            pageId: `tenant-${Date.now()}`, // auto-generated pageId
            slug,
            name: shopName,
            logo: null,
            themeColor: "#e91e63",
          },
        },
        subscription: {
          create: {
            planId: freePlan.id,
            status: "ACTIVE",
            startDate: now,
            endDate,
            autoRenew: false,
          },
        },
      },
      include: {
        shops: true,
        subscription: { include: { plan: true } },
      },
    });

    // Create default categories for the new shop
    const shop = tenant.shops[0];
    const defaultCategories = [
      { name: "ทั้งหมด", nameEn: "All", sortOrder: 0 },
      { name: "สินค้าแนะนำ", nameEn: "Featured", sortOrder: 1 },
      { name: "สินค้าใหม่", nameEn: "New", sortOrder: 2 },
      { name: "ลดราคา", nameEn: "Sale", sortOrder: 3 },
    ];

    await prisma.shopCategory.createMany({
      data: defaultCategories.map((c) => ({ shopId: shop.id, ...c })),
    });

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
        shop: {
          id: shop.id,
          slug: shop.slug,
          name: shop.name,
        },
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
