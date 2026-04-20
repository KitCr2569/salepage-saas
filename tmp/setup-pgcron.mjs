// Setup pg_cron via Supabase Management API
const SUPABASE_URL = "https://risjtwvjmgiwynjygcvx.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpc2p0d3ZqbWdpd3luanlnY3Z4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU5MjI3NCwiZXhwIjoyMDg3MTY4Mjc0fQ.m8blblksk3oHqIMP7L_2XckB-NVi5C7TQyDTaonCaEw";

async function runSQL(sql, label) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🔄 ${label}...`);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
    });

    // Try raw SQL via the pg endpoint
    const res2 = await fetch(`${SUPABASE_URL}/pg/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
    });

    // Fallback: use direct DB connection
    return null;
}

// Use direct PostgreSQL connection instead
import pg from 'pg';
const { Client } = pg;

// Use DIRECT_URL (not pgbouncer) for DDL operations
const DIRECT_URL = "postgresql://postgres.risjtwvjmgiwynjygcvx:CqFqr3lfRSMG8xe8@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";

async function main() {
    const client = new Client({ connectionString: DIRECT_URL });
    await client.connect();
    console.log("✅ Connected to Supabase PostgreSQL (direct)\n");

    // Step 1: Enable extensions
    console.log("📦 Step 1: Enabling pg_cron + pg_net extensions...");
    try {
        await client.query('CREATE EXTENSION IF NOT EXISTS pg_cron');
        console.log("  ✅ pg_cron enabled");
    } catch (err) {
        console.log("  ⚠️ pg_cron:", err.message);
    }

    try {
        await client.query('CREATE EXTENSION IF NOT EXISTS pg_net');
        console.log("  ✅ pg_net enabled");
    } catch (err) {
        console.log("  ⚠️ pg_net:", err.message);
    }

    // Step 2: Remove old cron job if exists
    console.log("\n🗑️ Step 2: Removing old cron job if exists...");
    try {
        await client.query(`SELECT cron.unschedule('expire-orders-cron')`);
        console.log("  ✅ Old job removed");
    } catch (err) {
        console.log("  ℹ️ No existing job (expected for first run)");
    }

    // Step 3: Create the cron job
    console.log("\n⏰ Step 3: Creating cron job (every 1 minute)...");
    try {
        const result = await client.query(`
            SELECT cron.schedule(
                'expire-orders-cron',
                '* * * * *',
                $$
                SELECT net.http_get(
                    url := 'https://www.hdgwrapskin.com/api/cron/expire-orders',
                    headers := '{"Content-Type": "application/json"}'::jsonb
                );
                $$
            )
        `);
        console.log("  ✅ Cron job created!", result.rows);
    } catch (err) {
        console.error("  ❌ Failed:", err.message);
    }

    // Step 4: Verify
    console.log("\n📋 Step 4: Verifying cron jobs...");
    try {
        const jobs = await client.query(`SELECT jobid, jobname, schedule, command FROM cron.job`);
        console.log("  Active cron jobs:");
        jobs.rows.forEach(j => {
            console.log(`    - [${j.jobid}] "${j.jobname}" → ${j.schedule}`);
            console.log(`      Command: ${j.command.trim().substring(0, 100)}...`);
        });
    } catch (err) {
        console.error("  ❌ Verify failed:", err.message);
    }

    await client.end();
    console.log("\n🎉 Done! pg_cron is now running every minute automatically.");
}

main().catch(console.error);
