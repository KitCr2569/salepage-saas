import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopFromRequest } from "@/lib/tenant";
import { hashPassword } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { shop } = await getShopFromRequest(request);
        const { id } = params;
        const body = await request.json();
        
        // Ensure the agent belongs to the current shop
        const existing = await prisma.agent.findFirst({
            where: { id, shopId: shop.id }
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: "Staff member not found or access denied" }, { status: 404 });
        }

        const updateData: any = {};
        if (body.name) updateData.name = body.name;
        if (body.role) updateData.role = body.role;
        if (body.password) {
            updateData.passwordHash = await hashPassword(body.password);
        }

        const updatedAgent = await prisma.agent.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                updatedAt: true,
            }
        });

        return NextResponse.json({ success: true, data: updatedAgent });
    } catch (e: any) {
        console.error("PATCH Staff Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { shop } = await getShopFromRequest(request);
        const { id } = params;
        
        // Ensure the agent belongs to the current shop
        const existing = await prisma.agent.findFirst({
            where: { id, shopId: shop.id }
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: "Staff member not found or access denied" }, { status: 404 });
        }

        await prisma.agent.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: "Staff member deleted" });
    } catch (e: any) {
        console.error("DELETE Staff Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
