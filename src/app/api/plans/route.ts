import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const plans = await prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: "asc" }
        });
        return NextResponse.json({ success: true, data: plans });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
