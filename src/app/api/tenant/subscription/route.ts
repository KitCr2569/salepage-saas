import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth || !(auth as any).tenantId) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const tenantId = (auth as any).tenantId;

        // Fetch subscription and plan
        let sub = await prisma.subscription.findUnique({
            where: { tenantId },
            include: { plan: true }
        });

        // If no subscription exists, auto-assign Free/Starter plan
        if (!sub) {
            const freePlan = await prisma.plan.findFirst({ orderBy: { sortOrder: "asc" } });
            if (freePlan) {
                sub = await prisma.subscription.create({
                    data: {
                        tenantId,
                        planId: freePlan.id,
                        status: "TRIAL",
                        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
                    },
                    include: { plan: true }
                });
            }
        }

        // Fetch usage stats
        const shopCount = await prisma.shop.count({ where: { tenantId } });
        // Products count requires knowing all shops
        const shops = await prisma.shop.findMany({ where: { tenantId }, select: { id: true } });
        const productCount = await prisma.shopProduct.count({ 
            where: { shopId: { in: shops.map((s: any) => s.id) } } 
        });

        // Fetch recent invoices
        const invoices = await prisma.invoice.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" },
            take: 5
        });

        return NextResponse.json({
            success: true,
            data: {
                subscription: sub,
                usage: {
                    shops: shopCount,
                    products: productCount
                },
                invoices
            }
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth || !(auth as any).tenantId) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const tenantId = (auth as any).tenantId;
        const { planId } = await request.json();

        if (!planId) return NextResponse.json({ success: false, error: "Missing planId" }, { status: 400 });

        const plan = await prisma.plan.findUnique({ where: { id: planId } });
        if (!plan) return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });

        // Check if there is an existing subscription
        const existingSub = await prisma.subscription.findUnique({ where: { tenantId } });

        if (existingSub) {
            await prisma.subscription.update({
                where: { tenantId },
                data: {
                    planId: plan.id,
                    status: "ACTIVE",
                    // Reset end date to +30 days for demo
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            });
        } else {
            await prisma.subscription.create({
                data: {
                    tenantId,
                    planId: plan.id,
                    status: "ACTIVE",
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            });
        }

        // Mock invoice creation
        if (Number(plan.price) > 0) {
            await prisma.invoice.create({
                data: {
                    tenantId,
                    invoiceNumber: `INV-${Date.now()}`,
                    amount: plan.price,
                    status: "PAID", // Auto-paid for demo
                    description: `Upgrade to ${plan.name} Plan`,
                    dueDate: new Date(),
                    paidAt: new Date()
                }
            });
        }

        return NextResponse.json({ success: true, message: "Subscription upgraded successfully" });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
