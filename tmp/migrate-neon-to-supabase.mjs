// ═══════════════════════════════════════════════════════════════
// Migrate data from Neon → Supabase
// Tables: orders, order_items, ecommerce_orders
// ═══════════════════════════════════════════════════════════════

import pg from 'pg';
const { Client } = pg;

const NEON_URL = 'postgresql://neondb_owner:npg_b5kyEhmBwV7q@ep-super-wildflower-a1nuexg3.ap-southeast-1.aws.neon.tech/unified_chat?sslmode=require';
const SUPABASE_URL = 'postgresql://postgres.risjtwvjmgiwynjygcvx:CqFqr3lfRSMG8xe8@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function main() {
    const neon = new Client({ connectionString: NEON_URL });
    const supa = new Client({ connectionString: SUPABASE_URL });

    try {
        console.log('🔌 Connecting to Neon...');
        await neon.connect();
        console.log('✅ Neon connected');

        console.log('🔌 Connecting to Supabase...');
        await supa.connect();
        console.log('✅ Supabase connected');

        // ─── Step 1: Check what exists in Neon ───
        console.log('\n━━━ Step 1: Neon Data Check ━━━');

        const neonTables = await neon.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        console.log('📋 Neon tables:', neonTables.rows.map(r => r.table_name).join(', '));

        // Count rows in key tables
        const tables = ['orders', 'order_items', 'ecommerce_orders', 'contacts', 'conversations', 'messages', 'channels', 'agents', 'canned_replies', 'tags', 'conversation_tags', 'notes', 'webhook_logs', 'shops', 'shop_products', 'shop_categories', 'tenants', 'plans', 'subscriptions', 'invoices'];

        console.log('\n📊 Row counts (Neon vs Supabase):');
        const migrationPlan = [];

        for (const table of tables) {
            try {
                const neonCount = await neon.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
                let supaCount;
                try {
                    supaCount = await supa.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
                } catch {
                    supaCount = { rows: [{ cnt: 'TABLE NOT FOUND' }] };
                }
                const nc = neonCount.rows[0].cnt;
                const sc = supaCount.rows[0].cnt;
                const diff = typeof sc === 'number' || !isNaN(sc) ? nc - sc : nc;
                const status = nc == sc ? '✅' : nc > sc ? '⚠️ MISSING' : '✅';
                console.log(`  ${status} ${table.padEnd(25)} Neon: ${String(nc).padStart(6)} | Supabase: ${String(sc).padStart(6)} | Diff: ${diff}`);
                
                if (Number(nc) > 0 && (typeof sc === 'string' || Number(nc) > Number(sc))) {
                    migrationPlan.push({ table, neonCount: Number(nc), supaCount: Number(sc) || 0 });
                }
            } catch (e) {
                console.log(`  ⏭️  ${table.padEnd(25)} Not found in Neon`);
            }
        }

        if (migrationPlan.length === 0) {
            console.log('\n✅ All data already in Supabase! Nothing to migrate.');
            return;
        }

        console.log(`\n━━━ Step 2: Migration Plan ━━━`);
        console.log(`Tables to migrate: ${migrationPlan.map(t => t.table).join(', ')}`);

        // ─── Step 2: Migrate each table ───
        // Order matters due to foreign keys!
        // Priority order: channels → agents → contacts → tags → conversations → conversation_tags → notes → messages → webhook_logs → orders → order_items → ecommerce_orders
        const migrationOrder = [
            'channels', 'agents', 'contacts', 'tags', 'conversations', 
            'conversation_tags', 'notes', 'canned_replies',
            'messages', 'webhook_logs',
            'tenants', 'plans', 'subscriptions', 'invoices',
            'shops', 'shop_categories', 'shop_products',
            'orders', 'order_items', 'ecommerce_orders'
        ];

        for (const table of migrationOrder) {
            const plan = migrationPlan.find(p => p.table === table);
            if (!plan) continue;

            console.log(`\n🔄 Migrating ${table} (${plan.neonCount} rows in Neon, ${plan.supaCount} in Supabase)...`);
            
            try {
                // Get all records from Neon
                const { rows } = await neon.query(`SELECT * FROM "${table}"`);
                if (rows.length === 0) {
                    console.log(`   ⏭️  No data to migrate`);
                    continue;
                }

                // Get column names
                const columns = Object.keys(rows[0]);
                const colList = columns.map(c => `"${c}"`).join(', ');
                
                // Build batch insert with ON CONFLICT DO NOTHING
                let inserted = 0;
                let skipped = 0;
                const batchSize = 50;

                for (let i = 0; i < rows.length; i += batchSize) {
                    const batch = rows.slice(i, i + batchSize);
                    const values = [];
                    const params = [];
                    let paramIdx = 1;

                    for (const row of batch) {
                        const placeholders = columns.map(col => {
                            params.push(row[col]);
                            return `$${paramIdx++}`;
                        });
                        values.push(`(${placeholders.join(', ')})`);
                    }

                    // Determine primary key for conflict resolution
                    let conflictKey = 'id';
                    if (table === 'conversation_tags') {
                        conflictKey = 'conversation_id, tag_id';
                    }

                    const sql = `INSERT INTO "${table}" (${colList}) VALUES ${values.join(', ')} ON CONFLICT (${conflictKey}) DO NOTHING`;
                    
                    try {
                        const result = await supa.query(sql, params);
                        inserted += result.rowCount;
                        skipped += batch.length - result.rowCount;
                    } catch (err) {
                        console.log(`   ❌ Batch error at row ${i}: ${err.message.substring(0, 150)}`);
                        
                        // Fallback: try one by one
                        for (const row of batch) {
                            try {
                                const singleParams = columns.map(col => row[col]);
                                const singlePlaceholders = columns.map((_, idx) => `$${idx + 1}`);
                                const singleSql = `INSERT INTO "${table}" (${colList}) VALUES (${singlePlaceholders.join(', ')}) ON CONFLICT (${conflictKey}) DO NOTHING`;
                                const r = await supa.query(singleSql, singleParams);
                                inserted += r.rowCount;
                                if (r.rowCount === 0) skipped++;
                            } catch (singleErr) {
                                skipped++;
                                // Only log unique errors
                                if (i === 0) console.log(`   ⚠️  Row skip: ${singleErr.message.substring(0, 100)}`);
                            }
                        }
                    }
                }

                console.log(`   ✅ Inserted: ${inserted}, Skipped (already exists): ${skipped}`);
            } catch (err) {
                console.log(`   ❌ Error: ${err.message}`);
            }
        }

        // ─── Step 3: Verify ───
        console.log('\n━━━ Step 3: Verification ━━━');
        for (const table of migrationOrder) {
            try {
                const nc = await neon.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
                const sc = await supa.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
                const match = nc.rows[0].cnt === sc.rows[0].cnt;
                console.log(`  ${match ? '✅' : '⚠️'} ${table.padEnd(25)} Neon: ${String(nc.rows[0].cnt).padStart(6)} | Supabase: ${String(sc.rows[0].cnt).padStart(6)}`);
            } catch {
                // skip
            }
        }

        console.log('\n🎉 Migration complete!');

    } catch (err) {
        console.error('❌ Fatal error:', err.message);
        console.error(err.stack);
    } finally {
        try { await neon.end(); } catch {}
        try { await supa.end(); } catch {}
    }
}

main();
