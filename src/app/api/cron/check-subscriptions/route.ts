// ═══════════════════════════════════════════════════════════════
// CRON: /api/cron/check-subscriptions
// Runs daily — checks for expired subscriptions and marks them.
// Also checks for subscriptions expiring within 3 days and could
// trigger notification (future: email/LINE notification).
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Verify cron secret (Vercel cron or manual trigger)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = new Date();

        // ── 1. Expire subscriptions past their endDate ────────
        const expiredSubs = await prisma.subscription.updateMany({
            where: {
                status: { in: ['ACTIVE', 'TRIAL'] },
                endDate: { lt: now },
            },
            data: {
                status: 'EXPIRED',
            },
        });

        // ── 2. Find subs expiring within 3 days (for future notifications) ─
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const expiringSoon = await prisma.subscription.findMany({
            where: {
                status: { in: ['ACTIVE', 'TRIAL'] },
                endDate: {
                    gte: now,
                    lte: threeDaysFromNow,
                },
            },
            include: {
                tenant: { select: { name: true, email: true } },
                plan: { select: { name: true } },
            },
        });

        // ── 3. Auto-renew check (future: integrate payment gateway) ─
        // For now, just log which subs need renewal
        const needsRenewal = await prisma.subscription.findMany({
            where: {
                status: 'EXPIRED',
                autoRenew: true,
            },
            include: {
                tenant: { select: { name: true, email: true } },
                plan: { select: { name: true, price: true } },
            },
        });

        console.log(`[cron/check-subscriptions] ${expiredSubs.count} expired, ${expiringSoon.length} expiring soon, ${needsRenewal.length} need renewal`);

        return NextResponse.json({
            success: true,
            data: {
                expired: expiredSubs.count,
                expiringSoon: expiringSoon.map((s: any) => ({
                    tenant: s.tenant.name,
                    email: s.tenant.email,
                    plan: s.plan.name,
                    endDate: s.endDate,
                })),
                needsRenewal: needsRenewal.map((s: any) => ({
                    tenant: s.tenant.name,
                    email: s.tenant.email,
                    plan: s.plan.name,
                    price: Number(s.plan.price),
                })),
                timestamp: now.toISOString(),
            },
        });
    } catch (error) {
        console.error('[cron/check-subscriptions] Error:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
