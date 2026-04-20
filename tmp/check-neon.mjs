// Try connecting with minimal data transfer to check Neon status
import pg from 'pg';
const { Client } = pg;

const NEON_URL = 'postgresql://neondb_owner:npg_b5kyEhmBwV7q@ep-super-wildflower-a1nuexg3.ap-southeast-1.aws.neon.tech/unified_chat?sslmode=verify-full';

async function main() {
    const neon = new Client({ connectionString: NEON_URL });
    try {
        console.log('🔌 Connecting to Neon...');
        await neon.connect();
        console.log('✅ Connected!');

        // Very minimal query — just counts
        console.log('\n📊 Neon row counts:');
        const tables = ['orders', 'order_items', 'ecommerce_orders'];
        for (const t of tables) {
            try {
                const { rows } = await neon.query(`SELECT COUNT(*) as cnt FROM "${t}"`);
                console.log(`  ${t}: ${rows[0].cnt} rows`);
            } catch (e) {
                console.log(`  ${t}: ❌ ${e.message.substring(0, 100)}`);
            }
        }
    } catch (err) {
        console.error('❌ Neon error:', err.message);
        
        if (err.message.includes('exceeded') || err.message.includes('quota')) {
            console.log('\n💡 Neon free tier data transfer quota exceeded!');
            console.log('   Options:');
            console.log('   1. Wait for Neon quota to reset (usually monthly)');
            console.log('   2. Upgrade Neon plan temporarily to pull data');
            console.log('   3. Use Neon dashboard to export SQL dump');
            console.log('   4. Check if you have a local backup or pg_dump');
        }
    } finally {
        try { await neon.end(); } catch {}
    }
}

main();
