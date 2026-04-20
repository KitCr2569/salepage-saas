import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

// Helper to get or create the primary shop
async function getPrimaryShop() {
    let shop = await prisma.shop.findFirst({
        orderBy: { createdAt: 'asc' }
    });
    
    if (!shop) {
        shop = await prisma.shop.create({
            data: {
                pageId: "114336388182180",
                slug: "hdgwrapskin",
                name: "HDG Wrap",
                currency: "THB",
                currencySymbol: "฿",
            }
        });
    }
    return shop;
}

export async function GET() {
    try {
        const shop = await getPrimaryShop();
        return NextResponse.json({
            success: true,
            data: shop.paymentConfig || {}
        });
    } catch (error) {
        console.error("Error fetching settings:", error);
        return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const auth = await getAuthFromRequest(req);
        if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const shop = await getPrimaryShop();
        
        const updated = await prisma.shop.update({
            where: { id: shop.id },
            data: { paymentConfig: body }
        });
        
        return NextResponse.json({ 
            success: true, 
            data: updated.paymentConfig 
        });
    } catch (error) {
        console.error("Error saving settings:", error);
        return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }
}
