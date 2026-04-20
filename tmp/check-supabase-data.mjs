// Check what data already exists in Supabase
import pg from 'pg';
const { Client } = pg;

const SUPABASE_URL = 'postgresql://postgres.risjtwvjmgiwynjygcvx:CqFqr3lfRSMG8xe8@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function main() {
    const supa = new Client({ connectionString: SUPABASE_URL });
    await supa.connect();
    console.log('✅ Supabase connected\n');

    const tables = [
        'channels', 'agents', 'contacts', 'tags', 
        'conversations', 'conversation_tags', 'notes', 'canned_replies',
        'messages', 'webhook_logs',
        'tenants', 'plans', 'subscriptions', 'invoices',
        'shops', 'shop_categories', 'shop_products',
        'orders', 'order_items', 'ecommerce_orders'
    ];

    console.log('📊 Supabase current data:');
    for (const table of tables) {
        try {
            const { rows } = await supa.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
            console.log(`  ${table.padEnd(25)} ${String(rows[0].cnt).padStart(8)} rows`);
        } catch (e) {
            console.log(`  ${table.padEnd(25)} ❌ NOT FOUND`);
        }
    }

    // Show sample ecommerce orders
    console.log('\n📦 Recent ecommerce_orders in Supabase:');
    try {
        const { rows } = await supa.query(`
            SELECT order_number, status, total, customer_data->>'name' as customer_name, created_at 
            FROM ecommerce_orders 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        for (const r of rows) {
            console.log(`  ${r.order_number} | ${r.status.padEnd(10)} | ฿${Number(r.total).toLocaleString()} | ${r.customer_name} | ${new Date(r.created_at).toLocaleDateString('th-TH')}`);
        }
    } catch (e) {
        console.log('  ❌ Error:', e.message);
    }

    // Show sample orders (chat orders)
    console.log('\n📋 Recent orders (chat) in Supabase:');
    try {
        const { rows } = await supa.query(`
            SELECT order_number, status::text, total, customer_name, created_at
            FROM orders
            ORDER BY created_at DESC
            LIMIT 10
        `);
        for (const r of rows) {
            console.log(`  ${r.order_number} | ${r.status.padEnd(10)} | ฿${Number(r.total).toLocaleString()} | ${r.customer_name} | ${new Date(r.created_at).toLocaleDateString('th-TH')}`);
        }
    } catch (e) {
        console.log('  ❌ Error:', e.message);
    }

    await supa.end();
}

main();
