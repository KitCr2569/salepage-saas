import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopFromRequest } from "@/lib/tenant";
import { hashPassword } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const { shop } = await getShopFromRequest(request);
        
        const agents = await prisma.agent.findMany({
            where: { shopId: shop.id },
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                avatarUrl: true,
                isOnline: true,
                createdAt: true,
            }
        });

        return NextResponse.json({ success: true, data: agents });
    } catch (e: any) {
        console.error("GET Staff Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { shop } = await getShopFromRequest(request);
        const body = await request.json();
        
        const { email, password, name, role } = body;
        
        if (!email || !password || !name) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        // Check if email is already taken
        const existing = await prisma.agent.findUnique({
            where: { email }
        });

        if (existing) {
            return NextResponse.json({ success: false, error: "Email already in use" }, { status: 400 });
        }

        const hashedPassword = await hashPassword(password);

        const newAgent = await prisma.agent.create({
            data: {
                shopId: shop.id,
                email,
                name,
                passwordHash: hashedPassword,
                role: role || "AGENT",
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            }
        });

        return NextResponse.json({ success: true, data: newAgent });
    } catch (e: any) {
        console.error("POST Staff Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
