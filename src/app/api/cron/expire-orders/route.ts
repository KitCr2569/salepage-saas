// ═══════════════════════════════════════════════════════════════
// GET /api/cron/expire-orders
// Vercel Cron: runs every 1 minute
// 1. ส่ง Follow-up reminder ให้ order ที่ค้างชำระเกิน X ชม.
// 2. Auto-cancel order ที่ไม่ชำระภายใน 2 ชม.
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAutoCancelMsg, getFollowUpReminder } from '@/lib/template-loader';
import { getFacebookPageConfig } from '@/lib/facebook';


export const dynamic = 'force-dynamic';

// ── Load follow-up settings from DB ──────────────────────────
async function loadFollowUpSettings() {
    try {
        const shop = await prisma.shop.findFirst({ orderBy: { createdAt: 'asc' } });
        const config = (shop?.paymentConfig as Record<string, any>) || {};
        return {
            enabled: config.followUpEnabled ?? false,
            hours: Number(config.followUpHours ?? 1),
            minutes: Number(config.followUpMinutes ?? 0),
        };
    } catch {
        return { enabled: false, hours: 1, minutes: 0 };
    }
}

export async function GET(request: Request) {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = request.headers.get('authorization');
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = Date.now();
        const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
        const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN;

        // ── STEP 1: Follow-up reminders ─────────────────────────
        const followUp = await loadFollowUpSettings();
        let remindedCount = 0;

        if (followUp.enabled && PAGE_ACCESS_TOKEN) {
            const followUpMs = (followUp.hours * 60 + followUp.minutes) * 60 * 1000;
            const followUpThreshold = new Date(now - followUpMs);

            // Orders that: pending, no slip, not paid, old enough for reminder, reminder NOT sent yet
            const pendingOrders = await prisma.ecommerceOrder.findMany({
                where: {
                    status: 'pending',
                    OR: [{ paymentSlipUrl: null }, { paymentSlipUrl: '' }],
                    paidAt: null,
                    followUpSentAt: null,      // ยังไม่เคย remind
                    createdAt: {
                        lt: followUpThreshold,  // เลยเวลา remind แล้ว
                        gte: twoHoursAgo,       // แต่ยังไม่ถึงเวลายกเลิก
                    },
                    facebookPsid: { not: null },
                },
            });

            console.log(`[Cron] Follow-up: ${pendingOrders.length} orders need reminding`);

            for (const order of pendingOrders) {
                try {
                    await sendFollowUpReminder(order, PAGE_ACCESS_TOKEN);
                    // Mark as reminded
                    await prisma.ecommerceOrder.update({
                        where: { id: order.id },
                        data: { followUpSentAt: new Date() },
                    });
                    remindedCount++;
                    console.log(`[Cron] Follow-up sent: ${order.orderNumber}`);
                } catch (err) {
                    console.error(`[Cron] Follow-up failed for ${order.orderNumber}:`, err);
                }
            }
        }

        // ── STEP 2: Cancel expired orders ───────────────────────
        const expiredOrders = await prisma.ecommerceOrder.findMany({
            where: {
                status: 'pending',
                OR: [{ paymentSlipUrl: null }, { paymentSlipUrl: '' }],
                paidAt: null,
                createdAt: { lt: twoHoursAgo },
            },
        });

        if (expiredOrders.length === 0 && remindedCount === 0) {
            return NextResponse.json({ success: true, reminded: 0, cancelled: 0 });
        }

        console.log(`[Cron] Expire: ${expiredOrders.length} orders to cancel`);

        let cancelledCount = 0;
        for (const order of expiredOrders) {
            try {
                const result = await prisma.ecommerceOrder.updateMany({
                    where: { id: order.id, status: 'pending' },
                    data: { status: 'cancelled' },
                });

                if (result.count > 0) {
                    cancelledCount++;
                    console.log(`[Cron] Cancelled: ${order.orderNumber}`);

                    if (order.facebookPsid && PAGE_ACCESS_TOKEN) {
                        await notifyExpiredOrder(order, PAGE_ACCESS_TOKEN);
                    }
                }
            } catch (err) {
                console.error(`[Cron] Cancel failed for ${order.orderNumber}:`, err);
            }
        }

        return NextResponse.json({
            success: true,
            reminded: remindedCount,
            cancelled: cancelledCount,
            total: expiredOrders.length,
        });
    } catch (error) {
        console.error('[Cron] expire-orders error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// ── Helpers ──────────────────────────────────────────────────

async function sendFollowUpReminder(order: any, token: string) {
    const fmt = (n: number) => new Intl.NumberFormat('th-TH').format(n);
    const items: any[] = typeof order.itemsData === 'string'
        ? JSON.parse(order.itemsData)
        : (order.itemsData || []);

    const itemLines = items.map((item: any) =>
        `   • ${item.name}${item.variantName ? ` (${item.variantName})` : ''} x${item.quantity || 1}`
    ).join('\n');

    const shopUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.hdgwrapskin.com';

    const msg = await getFollowUpReminder({
        orderNumber: order.orderNumber,
        total: fmt(Number(order.total || 0)),
        itemLines,
        shopUrl,
    });

    const { pageAccessToken, pageId } = await getFacebookPageConfig();


    const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messaging_type: 'UPDATE',
            recipient: { id: order.facebookPsid },
            message: { text: msg },
        }),
    });

    const result = await res.json();
    if (result.error) {
        throw new Error(`FB API error: ${JSON.stringify(result.error)}`);
    }
}

async function notifyExpiredOrder(order: any, token: string) {
    try {
        const fmt = (n: number) => new Intl.NumberFormat('th-TH').format(n);
        const items: any[] = typeof order.itemsData === 'string'
            ? JSON.parse(order.itemsData)
            : (order.itemsData || []);
        const customerData: any = typeof order.customerData === 'string'
            ? JSON.parse(order.customerData)
            : (order.customerData || {});

        const itemLines = items.map((item: any) =>
            `   • ${item.name}${item.variantName ? ` (${item.variantName})` : ''} x${item.quantity || 1}`
        ).join('\n');

        const shopUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.hdgwrapskin.com';
        const orderDate = new Date(order.createdAt).toLocaleDateString('th-TH', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok',
        });

        const msg = await getAutoCancelMsg({
            orderNumber: order.orderNumber,
            customerName: customerData.name || order.facebookName || 'ลูกค้า',
            orderDate,
            itemLines,
            total: fmt(Number(order.total || 0)),
            shopUrl,
        });

        const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messaging_type: 'UPDATE',
                recipient: { id: order.facebookPsid },
                message: { text: msg },
            }),
        });

        const result = await res.json();
        if (result.error) {
            console.error(`[Cron] Cancel notify failed for ${order.orderNumber}:`, result.error);
        } else {
            console.log(`[Cron] Cancel notify sent: ${order.orderNumber}`);
        }
    } catch (err) {
        console.error(`[Cron] Notify error for ${order.orderNumber}:`, err);
    }
}
