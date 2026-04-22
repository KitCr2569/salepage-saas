import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Cron job: ตรวจสอบ subscription ที่หมดอายุ
// ควร setup ใน Vercel Cron: /api/cron/expire-subscriptions (รันทุกวัน)
export async function GET() {
  try {
    const now = new Date();

    // Find expired active subscriptions
    const expired = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        endDate: { lt: now },
      },
      include: { tenant: { select: { id: true, name: true, email: true } } },
    });

    if (expired.length === 0) {
      return NextResponse.json({ success: true, data: { expired: 0 } });
    }

    // Mark them as EXPIRED
    const ids = expired.map(s => s.id);
    await prisma.subscription.updateMany({
      where: { id: { in: ids } },
      data: { status: "EXPIRED" },
    });

    // Optionally deactivate tenant shops
    const tenantIds = expired.map(s => s.tenantId);
    await prisma.shop.updateMany({
      where: { tenantId: { in: tenantIds } },
      data: { isActive: false },
    });

    console.log(`[Cron] Expired ${expired.length} subscriptions:`,
      expired.map(s => `${s.tenant.email} (${s.tenant.name})`).join(", "));

    return NextResponse.json({
      success: true,
      data: {
        expired: expired.length,
        tenants: expired.map(s => ({
          id: s.tenant.id,
          name: s.tenant.name,
          email: s.tenant.email,
        })),
      },
    });
  } catch (error) {
    console.error("[Cron] Expire subscriptions error:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
