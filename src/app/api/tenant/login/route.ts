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
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "กรุณากรอก email และ password" },
        { status: 400 }
      );
    }

    // Find tenant
    const tenant = await prisma.tenant.findUnique({
      where: { email },
      include: {
        shops: true,
        subscription: { include: { plan: true } },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "ไม่พบบัญชีนี้ในระบบ" },
        { status: 401 }
      );
    }

    if (!tenant.isActive) {
      return NextResponse.json(
        { success: false, error: "บัญชีนี้ถูกระงับ กรุณาติดต่อผู้ดูแลระบบ" },
        { status: 403 }
      );
    }

    // Check password
    const valid = await bcrypt.compare(password, tenant.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "รหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    // Check subscription status
    const sub = tenant.subscription;
    let planInfo = null;
    if (sub) {
      // Auto-expire if past end date
      if (sub.status === "ACTIVE" && new Date() > sub.endDate) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: "EXPIRED" },
        });
        sub.status = "EXPIRED";
      }
      planInfo = sub.plan
        ? {
            name: sub.plan.name,
            slug: sub.plan.slug,
            maxProducts: sub.plan.maxProducts,
            maxShops: sub.plan.maxShops,
            status: sub.status,
            endDate: sub.endDate,
          }
        : null;
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
        shops: tenant.shops.map((s: any) => ({
          id: s.id,
          slug: s.slug,
          name: s.name,
          logo: s.logo,
          isActive: s.isActive,
        })),
        plan: planInfo,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" },
      { status: 500 }
    );
  }
}
