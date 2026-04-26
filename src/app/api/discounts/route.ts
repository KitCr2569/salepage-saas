// ═══════════════════════════════════════════════════════════════
// API /api/discounts — CRUD for discount codes (DB-backed via Shop.paymentConfig)
// Stores discount codes in the shop's paymentConfig JSON to avoid migration
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getShop() {
    return prisma.shop.findFirst({ orderBy: { createdAt: 'asc' } });
}

async function getDiscounts(shop: any): Promise<any[]> {
    const config = (shop?.paymentConfig as any) || {};
    return config.discountCodes || [];
}

async function saveDiscounts(shopId: string, discounts: any[]) {
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    const config = (shop?.paymentConfig as any) || {};
    config.discountCodes = discounts;
    await prisma.shop.update({
        where: { id: shopId },
        data: { paymentConfig: config },
    });
}

// GET — List all discount codes
export async function GET() {
    try {
        const shop = await getShop();
        if (!shop) return NextResponse.json({ success: false, error: 'No shop found' }, { status: 404 });
        const discounts = await getDiscounts(shop);
        return NextResponse.json({ success: true, data: discounts });
    } catch (error) {
        console.error('GET /api/discounts error:', error);
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
    }
}

// POST — Create a new discount code
export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const shop = await getShop();
        if (!shop) return NextResponse.json({ success: false, error: 'No shop found' }, { status: 404 });
        
        const body = await request.json();
        const discounts = await getDiscounts(shop);
        
        // Validate required fields
        if (!body.code || !body.type) {
            return NextResponse.json({ success: false, error: 'Missing code or type' }, { status: 400 });
        }

        // Check duplicate code
        if (discounts.some((d: any) => d.code.toLowerCase() === body.code.toLowerCase())) {
            return NextResponse.json({ success: false, error: 'โค้ดนี้มีอยู่แล้ว' }, { status: 400 });
        }

        const newDiscount = {
            id: `dc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            name: body.name || body.code,
            code: body.code.toUpperCase(),
            type: body.type, // percent, fixed, free_shipping, quantity
            value: Number(body.value) || 0,
            quantityTiers: body.quantityTiers || [],
            minOrder: Number(body.minOrder) || 0,
            minQty: Number(body.minQty) || 0,
            maxUses: Number(body.maxUses) || 0,
            usedCount: 0,
            startDate: body.startDate || '',
            endDate: body.endDate || '',
            enabled: body.enabled !== false,
            createdAt: Date.now(),
        };

        discounts.push(newDiscount);
        await saveDiscounts(shop.id, discounts);

        return NextResponse.json({ success: true, data: newDiscount });
    } catch (error) {
        console.error('POST /api/discounts error:', error);
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
    }
}

// PUT — Update an existing discount code
export async function PUT(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const shop = await getShop();
        if (!shop) return NextResponse.json({ success: false, error: 'No shop found' }, { status: 404 });
        
        const body = await request.json();
        const discounts = await getDiscounts(shop);
        const index = discounts.findIndex((d: any) => d.id === body.id);
        
        if (index === -1) {
            return NextResponse.json({ success: false, error: 'Discount not found' }, { status: 404 });
        }

        discounts[index] = { ...discounts[index], ...body, updatedAt: Date.now() };
        await saveDiscounts(shop.id, discounts);

        return NextResponse.json({ success: true, data: discounts[index] });
    } catch (error) {
        console.error('PUT /api/discounts error:', error);
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
    }
}

// DELETE — Remove a discount code
export async function DELETE(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const shop = await getShop();
        if (!shop) return NextResponse.json({ success: false, error: 'No shop found' }, { status: 404 });
        
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        
        if (!id) {
            return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
        }

        const discounts = await getDiscounts(shop);
        const filtered = discounts.filter((d: any) => d.id !== id);
        
        if (filtered.length === discounts.length) {
            return NextResponse.json({ success: false, error: 'Discount not found' }, { status: 404 });
        }

        await saveDiscounts(shop.id, filtered);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/discounts error:', error);
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
    }
}
