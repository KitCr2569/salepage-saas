// ═══════════════════════════════════════════════════════════════
// API /api/discounts/validate — Validate a discount code at checkout
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        // Rate limit: max 20 validations per minute per IP (prevent brute-force code guessing)
        const ip = getClientIP(request);
        const rl = checkRateLimit(`discount:${ip}`, 20, 60_000);
        if (!rl.allowed) {
            return NextResponse.json({ success: false, valid: false, discount: 0, message: 'Too many attempts' }, { status: 429 });
        }

        const { code, orderTotal, totalQty } = await request.json();
        
        if (!code) {
            return NextResponse.json({ success: false, valid: false, discount: 0, message: 'Missing code' });
        }

        // Get discounts from shop config
        const shop = await prisma.shop.findFirst({ orderBy: { createdAt: 'asc' } });
        const config = (shop?.paymentConfig as any) || {};
        const discounts = config.discountCodes || [];
        
        const d = discounts.find((d: any) => d.code.toLowerCase() === code.toLowerCase() && d.enabled);

        if (!d) {
            return NextResponse.json({ success: true, valid: false, discount: 0, message: 'โค้ดส่วนลดไม่ถูกต้อง' });
        }

        const now = new Date();
        if (d.startDate && new Date(d.startDate) > now) {
            return NextResponse.json({ success: true, valid: false, discount: 0, message: 'โค้ดยังไม่เริ่มใช้งาน' });
        }
        if (d.endDate && new Date(d.endDate) < now) {
            return NextResponse.json({ success: true, valid: false, discount: 0, message: 'โค้ดหมดอายุแล้ว' });
        }
        if (d.maxUses > 0 && d.usedCount >= d.maxUses) {
            return NextResponse.json({ success: true, valid: false, discount: 0, message: 'โค้ดถูกใช้ครบจำนวนแล้ว' });
        }
        if (d.minOrder > 0 && orderTotal < d.minOrder) {
            return NextResponse.json({ success: true, valid: false, discount: 0, message: `ยอดสั่งซื้อขั้นต่ำ ฿${d.minOrder.toLocaleString()}` });
        }
        if (d.minQty > 0 && totalQty < d.minQty) {
            return NextResponse.json({ success: true, valid: false, discount: 0, message: `ต้องซื้อขั้นต่ำ ${d.minQty} ชิ้น` });
        }

        if (d.type === 'free_shipping') {
            return NextResponse.json({ success: true, valid: true, discount: 0, message: 'ฟรีค่าส่ง!', type: 'free_shipping' });
        }

        if (d.type === 'quantity') {
            const tiers = d.quantityTiers || [];
            const sorted = [...tiers].sort((a: any, b: any) => b.minQty - a.minQty);
            const matchedTier = sorted.find((t: any) => totalQty >= t.minQty);
            if (!matchedTier) {
                const lowestTier = tiers.reduce((min: any, t: any) => t.minQty < min.minQty ? t : min, tiers[0]);
                return NextResponse.json({ success: true, valid: false, discount: 0, message: `ต้องซื้อขั้นต่ำ ${lowestTier?.minQty || 2} ชิ้นขึ้นไป` });
            }
            const discountAmount = Math.round(orderTotal * (matchedTier.discountPercent / 100));
            return NextResponse.json({ success: true, valid: true, discount: Math.min(discountAmount, orderTotal), message: `ซื้อ ${totalQty} ชิ้น ลด ${matchedTier.discountPercent}%`, type: 'quantity' });
        }

        let discountAmount = 0;
        if (d.type === 'percent') {
            discountAmount = Math.round(orderTotal * (d.value / 100));
        } else {
            discountAmount = d.value;
        }

        return NextResponse.json({
            success: true,
            valid: true,
            discount: Math.min(discountAmount, orderTotal),
            message: d.type === 'percent' ? `ลด ${d.value}%` : `ลด ฿${d.value.toLocaleString()}`,
            type: d.type,
        });
    } catch (error) {
        console.error('POST /api/discounts/validate error:', error);
        return NextResponse.json({ success: false, valid: false, discount: 0, message: 'Internal error' }, { status: 500 });
    }
}
