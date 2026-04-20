import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "tenant-secret-key"
);

// POST — Create upgrade request (invoice)
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== "tenant" || !payload.tenantId) {
      return NextResponse.json({ success: false, error: "Token ไม่ถูกต้อง" }, { status: 401 });
    }

    const tenantId = payload.tenantId as string;
    const body = await req.json();
    const { planSlug } = body;

    if (!planSlug) {
      return NextResponse.json({ success: false, error: "กรุณาเลือกแพ็กเกจ" }, { status: 400 });
    }

    // Get target plan
    const targetPlan = await prisma.plan.findUnique({ where: { slug: planSlug } });
    if (!targetPlan || !targetPlan.isActive) {
      return NextResponse.json({ success: false, error: "ไม่พบแพ็กเกจนี้" }, { status: 404 });
    }

    // Check if same plan
    const currentSub = await prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (currentSub?.planId === targetPlan.id) {
      return NextResponse.json(
        { success: false, error: "คุณใช้แพ็กเกจนี้อยู่แล้ว" },
        { status: 400 }
      );
    }

    const amount = Number(targetPlan.price);

    // Free plan — instant activation
    if (amount === 0) {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setFullYear(endDate.getFullYear() + 100);

      if (currentSub) {
        await prisma.subscription.update({
          where: { id: currentSub.id },
          data: { planId: targetPlan.id, status: "ACTIVE", startDate: now, endDate },
        });
      } else {
        await prisma.subscription.create({
          data: { tenantId, planId: targetPlan.id, status: "ACTIVE", startDate: now, endDate },
        });
      }

      return NextResponse.json({
        success: true,
        data: { activated: true, plan: targetPlan.name },
      });
    }

    // Paid plan — create invoice
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3); // 3 days to pay

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        tenantId,
        amount: targetPlan.price,
        description: `อัปเกรดเป็นแพ็กเกจ ${targetPlan.name} (รายเดือน)`,
        dueDate,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        activated: false,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          dueDate: invoice.dueDate,
          planName: targetPlan.name,
        },
      },
    });
  } catch (error) {
    console.error("Upgrade error:", error);
    return NextResponse.json({ success: false, error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
