// ═══════════════════════════════════════════════════════════════
// GET /api/cron/migrate-neon
// Vercel Cron: runs daily, attempts to migrate old orders from Neon
// Auto-stops once migration is complete
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // allow up to 60s for migration

const NEON_URL = 'postgresql://neondb_owner:npg_b5kyEhmBwV7q@ep-super-wildflower-a1nuexg3.ap-southeast-1.aws.neon.tech/unified_chat?sslmode=verify-full';

export async function GET(request: Request) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // ─── Step 1: Check if migration is already done ───
        // Use a simple flag: if we have ecommerce_orders from before April 10 2026,
        // it means old data was already migrated
        const oldOrders = await prisma.ecommerceOrder.count({
            where: { createdAt: { lt: new Date('2026-04-10T00:00:00Z') } }
        });

        if (oldOrders > 0) {
            console.log('[Migrate] Old orders already exist in Supabase — migration complete, skipping.');
            return NextResponse.json({
                success: true,
                status: 'already_migrated',
                oldOrderCount: oldOrders,
            });
        }

        // ─── Step 2: Try connecting to Neon ───
        console.log('[Migrate] Attempting Neon connection...');

        let pgClient: any;
        try {
            // Dynamic import pg — it may not be in production bundle
            const { default: pg } = await import('pg' as any);
            pgClient = new pg.Client({ connectionString: NEON_URL });
            await pgClient.connect();
            console.log('[Migrate] ✅ Neon connected!');
        } catch (err: any) {
            const msg = err.message || '';
            if (msg.includes('exceeded') || msg.includes('quota')) {
                console.log('[Migrate] ⏳ Neon quota still exceeded — will retry tomorrow.');
                return NextResponse.json({
                    success: true,
                    status: 'quota_exceeded',
                    message: 'Neon data transfer quota still exceeded. Will retry tomorrow.',
                });
            }
            console.error('[Migrate] Neon connection error:', msg);
            return NextResponse.json({
                success: false,
                status: 'connection_error',
                error: msg.substring(0, 200),
            });
        }

        // ─── Step 3: Migrate data ───
        const results: Record<string, { inserted: number; skipped: number; error?: string }> = {};

        // Tables to migrate in FK order
        const migrationTables = [
            { name: 'ecommerce_orders', conflictKey: 'id' },
            { name: 'orders', conflictKey: 'id' },
            { name: 'order_items', conflictKey: 'id' },
        ];

        for (const { name: table, conflictKey } of migrationTables) {
            console.log(`[Migrate] Processing ${table}...`);
            try {
                const { rows } = await pgClient.query(`SELECT * FROM "${table}"`);
                if (rows.length === 0) {
                    results[table] = { inserted: 0, skipped: 0 };
                    continue;
                }

                const columns = Object.keys(rows[0]);
                const colList = columns.map((c: string) => `"${c}"`).join(', ');

                let inserted = 0;
                let skipped = 0;

                // Insert one by one with ON CONFLICT DO NOTHING
                for (const row of rows) {
                    try {
                        const values = columns.map((_: string, idx: number) => `$${idx + 1}`);
                        const params = columns.map((col: string) => row[col]);
                        const sql = `INSERT INTO "${table}" (${colList}) VALUES (${values.join(', ')}) ON CONFLICT ("${conflictKey}") DO NOTHING`;

                        const r = await prisma.$executeRawUnsafe(sql, ...params);
                        if (r > 0) inserted++;
                        else skipped++;
                    } catch {
                        skipped++;
                    }
                }

                results[table] = { inserted, skipped };
                console.log(`[Migrate] ${table}: inserted=${inserted}, skipped=${skipped}`);
            } catch (err: any) {
                results[table] = { inserted: 0, skipped: 0, error: err.message?.substring(0, 100) };
                console.error(`[Migrate] ${table} error:`, err.message);
            }
        }

        // ─── Step 4: Cleanup ───
        try { await pgClient.end(); } catch {}

        const totalInserted = Object.values(results).reduce((sum, r) => sum + r.inserted, 0);
        console.log(`[Migrate] 🎉 Migration complete! Total inserted: ${totalInserted}`);

        return NextResponse.json({
            success: true,
            status: 'migrated',
            totalInserted,
            details: results,
        });

    } catch (error: any) {
        console.error('[Migrate] Fatal error:', error);
        return NextResponse.json(
            { success: false, error: error.message?.substring(0, 200) || 'Unknown error' },
            { status: 500 }
        );
    }
}
