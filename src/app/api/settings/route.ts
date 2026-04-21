import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getShopFromRequest, clearShopCache } from '@/lib/tenant';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        const { shop } = await getShopFromRequest(req);
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
        const { shop } = await getShopFromRequest(req);
        
        const updated = await prisma.shop.update({
            where: { id: shop.id },
            data: { paymentConfig: body }
        });

        clearShopCache(); // clear cache after update
        
        return NextResponse.json({ 
            success: true, 
            data: updated.paymentConfig 
        });
    } catch (error) {
        console.error("Error saving settings:", error);
        return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }
}
