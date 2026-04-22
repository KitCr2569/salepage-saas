import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "tenant-secret-key"
);

// Only allow platform owner (first tenant or specific email)
const PLATFORM_ADMIN_EMAILS = ["admin@hdg.com"];

async function checkPlatformAdmin(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  try {
    const { payload } = await jwtVerify(authHeader.slice(7), JWT_SECRET);
    return (
      payload.type === "tenant" &&
      PLATFORM_ADMIN_EMAILS.includes(payload.email as string)
    );
  } catch {
    return false;
  }
}

// GET — Platform admin dashboard data
export async function GET(req: NextRequest) {
  if (!(await checkPlatformAdmin(req))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "overview";

  switch (action) {
    case "overview": {
      const [tenantCount, shopCount, orderCount, revenue, plans, recentTenants] =
        await Promise.all([
          prisma.tenant.count(),
          prisma.shop.count(),
          prisma.ecommerceOrder.count(),
          prisma.invoice.aggregate({
            where: { status: "PAID" },
            _sum: { amount: true },
          }),
          prisma.plan.findMany({
            include: { _count: { select: { subscriptions: true } } },
            orderBy: { sortOrder: "asc" },
          }),
          prisma.tenant.findMany({
            take: 10,
            orderBy: { createdAt: "desc" },
            include: {
              shops: { select: { id: true, name: true, slug: true } },
              subscription: { include: { plan: { select: { name: true, slug: true } } } },
            },
          }),
        ]);

      // Calculate monthly revenue from active subscriptions
      const monthlyRevenue = plans.reduce((sum: number, p: any) => {
        return sum + (Number(p.price) * p._count.subscriptions);
      }, 0);

      return NextResponse.json({
        success: true,
        data: {
          stats: {
            tenants: tenantCount,
            shops: shopCount,
            orders: orderCount,
            revenue: Number(revenue._sum.amount || 0),
            monthlyRevenue,
          },
          plans: plans.map((p: any) => ({
            name: p.name,
            slug: p.slug,
            price: p.price,
            subscribers: p._count.subscriptions,
          })),
          recentTenants: recentTenants.map((t: any) => ({
            id: t.id,
            name: t.name,
            email: t.email,
            isActive: t.isActive,
            createdAt: t.createdAt,
            plan: t.subscription?.plan?.name || "ไม่มี",
            planSlug: t.subscription?.plan?.slug || "none",
            shopCount: t.shops.length,
            shops: t.shops,
          })),
        },
      });
    }

    case "tenants": {
      const tenants = await prisma.tenant.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          shops: { select: { id: true, name: true, slug: true, isActive: true } },
          subscription: { include: { plan: true } },
          _count: { select: { invoices: true } },
        },
      });

      return NextResponse.json({
        success: true,
        data: tenants.map((t: any) => ({
          id: t.id,
          name: t.name,
          email: t.email,
          phone: t.phone,
          isActive: t.isActive,
          createdAt: t.createdAt,
          plan: t.subscription?.plan?.name || "ไม่มี",
          planSlug: t.subscription?.plan?.slug || "none",
          subscriptionStatus: t.subscription?.status || "NONE",
          subscriptionEnd: t.subscription?.endDate,
          shops: t.shops,
          invoiceCount: t._count.invoices,
        })),
      });
    }

    case "invoices": {
      const invoices = await prisma.invoice.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          tenant: { select: { name: true, email: true } },
        },
      });

      return NextResponse.json({ success: true, data: invoices });
    }

    default:
      return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  }
}

// PATCH — Admin actions (activate/suspend tenant, approve invoice)
export async function PATCH(req: NextRequest) {
  if (!(await checkPlatformAdmin(req))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { action, targetId } = body;

  switch (action) {
    case "toggle_tenant": {
      const tenant = await prisma.tenant.findUnique({ where: { id: targetId } });
      if (!tenant) return NextResponse.json({ success: false, error: "ไม่พบ tenant" }, { status: 404 });

      await prisma.tenant.update({
        where: { id: targetId },
        data: { isActive: !tenant.isActive },
      });

      return NextResponse.json({
        success: true,
        data: { isActive: !tenant.isActive },
      });
    }

    case "approve_invoice": {
      const invoice = await prisma.invoice.findUnique({ where: { id: targetId } });
      if (!invoice) return NextResponse.json({ success: false, error: "ไม่พบ invoice" }, { status: 404 });

      await prisma.invoice.update({
        where: { id: targetId },
        data: { status: "PAID", paidAt: new Date() },
      });

      // Activate subscription
      const planMatch = invoice.description?.match(/แพ็กเกจ (.+?) \(/);
      if (planMatch) {
        const plan = await prisma.plan.findFirst({ where: { name: planMatch[1] } });
        if (plan) {
          const now = new Date();
          const endDate = new Date(now);
          endDate.setMonth(endDate.getMonth() + 1);

          const existing = await prisma.subscription.findUnique({
            where: { tenantId: invoice.tenantId },
          });
          if (existing) {
            await prisma.subscription.update({
              where: { id: existing.id },
              data: { planId: plan.id, status: "ACTIVE", startDate: now, endDate },
            });
          } else {
            await prisma.subscription.create({
              data: {
                tenantId: invoice.tenantId,
                planId: plan.id,
                status: "ACTIVE",
                startDate: now,
                endDate,
              },
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        data: { message: "อนุมัติการชำระเงินเรียบร้อย" },
      });
    }

    case "upgrade_tenant": {
      const { planSlug } = body;
      const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
      if (!plan) return NextResponse.json({ success: false, error: "ไม่พบแพ็กเกจ" }, { status: 404 });

      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      const sub = await prisma.subscription.findUnique({ where: { tenantId: targetId } });
      if (sub) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { planId: plan.id, status: "ACTIVE", startDate: now, endDate },
        });
      } else {
        await prisma.subscription.create({
          data: { tenantId: targetId, planId: plan.id, status: "ACTIVE", startDate: now, endDate },
        });
      }
      return NextResponse.json({ success: true, data: { message: `เปลี่ยนเป็น ${plan.name} แล้ว` } });
    }

    case "delete_tenant": {
      // Delete shops, subscription, invoices first
      await prisma.invoice.deleteMany({ where: { tenantId: targetId } });
      await prisma.subscription.deleteMany({ where: { tenantId: targetId } });
      const shops = await prisma.shop.findMany({ where: { tenantId: targetId } });
      for (const shop of shops) {
        await prisma.shopProduct.deleteMany({ where: { shopId: shop.id } });
        await prisma.shopCategory.deleteMany({ where: { shopId: shop.id } });
      }
      await prisma.shop.deleteMany({ where: { tenantId: targetId } });
      await prisma.tenant.delete({ where: { id: targetId } });
      return NextResponse.json({ success: true, data: { message: "ลบบัญชีเรียบร้อย" } });
    }

    default:
      return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  }
}
