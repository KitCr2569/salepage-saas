import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "tenant-secret-key"
);

async function getTenantId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const { payload } = await jwtVerify(authHeader.slice(7), JWT_SECRET);
    return payload.type === "tenant" ? (payload.tenantId as string) : null;
  } catch {
    return null;
  }
}

// GET — List invoices
export async function GET(req: NextRequest) {
  const tenantId = await getTenantId(req);
  if (!tenantId) {
    return NextResponse.json({ success: false, error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  }

  const invoices = await prisma.invoice.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ success: true, data: invoices });
}

// POST — Submit payment slip
export async function POST(req: NextRequest) {
  const tenantId = await getTenantId(req);
  if (!tenantId) {
    return NextResponse.json({ success: false, error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  }

  const body = await req.json();
  const { invoiceId, paymentMethod, paymentSlip } = body;

  if (!invoiceId) {
    return NextResponse.json({ success: false, error: "ไม่ระบุ invoiceId" }, { status: 400 });
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
  });

  if (!invoice) {
    return NextResponse.json({ success: false, error: "ไม่พบใบเรียกเก็บเงินนี้" }, { status: 404 });
  }

  if (invoice.status === "PAID") {
    return NextResponse.json({ success: false, error: "ชำระเงินแล้ว" }, { status: 400 });
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      paymentMethod: paymentMethod || "bank_transfer",
      paymentSlip: paymentSlip || null,
      status: "PAID",
      paidAt: new Date(),
    },
  });

  // Auto-activate subscription
  // Find the plan from the invoice description
  const planMatch = invoice.description?.match(/แพ็กเกจ (.+?) \(/);
  if (planMatch) {
    const planName = planMatch[1];
    const plan = await prisma.plan.findFirst({ where: { name: planName } });
    if (plan) {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1); // 1 month

      const existing = await prisma.subscription.findUnique({ where: { tenantId } });
      if (existing) {
        await prisma.subscription.update({
          where: { id: existing.id },
          data: { planId: plan.id, status: "ACTIVE", startDate: now, endDate },
        });
      } else {
        await prisma.subscription.create({
          data: { tenantId, planId: plan.id, status: "ACTIVE", startDate: now, endDate },
        });
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: { message: "ชำระเงินสำเร็จ เปิดใช้งานแพ็กเกจแล้ว" },
  });
}
