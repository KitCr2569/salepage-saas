import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        maxProducts: true,
        maxShops: true,
        features: true,
        sortOrder: true,
      },
    });

    return NextResponse.json({ success: true, data: plans });
  } catch (error) {
    console.error("Plans error:", error);
    return NextResponse.json(
      { success: false, error: "ไม่สามารถดึงข้อมูลแพ็กเกจได้" },
      { status: 500 }
    );
  }
}
