// Manual: send cancellation notification for ORD-20260414-654
import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = "postgresql://postgres.risjtwvjmgiwynjygcvx:CqFqr3lfRSMG8xe8@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true";
const PAGE_ACCESS_TOKEN = "EAADhsxfbE8sBRH1jIAhHmXWTAyhipKPPvKZA1X2UlgQDlzCzu48hdH4dReT3aCUN8sDZARIyfjuUbUwiXZCNr5WnoSgva0aXvSWCgxtT7epEA7PXxXYmZA6z6veZAoqjiOjnckcG8rgOZCIjXMe8bDVOPhwloydYVyYmG0tL61vQ9N4d68Ile6gxZCMl9dp9QZCum6UMyUwZD";

const ORDER_NUMBER = "ORD-20260414-654";

async function main() {
    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    const res = await client.query(
        `SELECT * FROM ecommerce_orders WHERE order_number = $1`,
        [ORDER_NUMBER]
    );

    if (res.rows.length === 0) {
        console.log("❌ Order not found:", ORDER_NUMBER);
        await client.end();
        return;
    }

    const order = res.rows[0];
    console.log("📦 Order:", order.order_number);
    console.log("📊 Status:", order.status);
    console.log("👤 PSID:", order.facebook_psid || "NO PSID");
    console.log("👤 FB Name:", order.facebook_name);

    const customerData = typeof order.customer_data === 'string' ? JSON.parse(order.customer_data) : (order.customer_data || {});
    console.log("👤 Customer Name:", customerData.name);

    let psid = order.facebook_psid;

    // If no PSID on the order, try to find from contacts
    if (!psid) {
        const searchName = order.facebook_name || customerData.name || '';
        console.log("\n🔍 Searching contacts by name:", searchName);
        const contactRes = await client.query(
            `SELECT platform_contact_id, display_name FROM contacts WHERE display_name ILIKE $1 LIMIT 5`,
            [`%${searchName}%`]
        );
        if (contactRes.rows.length > 0) {
            console.log("Found contacts:");
            contactRes.rows.forEach(c => console.log(`  - ${c.display_name} → PSID: ${c.platform_contact_id}`));
            psid = contactRes.rows[0].platform_contact_id;
            console.log(`\n✅ Using PSID: ${psid}`);
        } else {
            console.log("❌ No contacts found — cannot send notification");
            await client.end();
            return;
        }
    }

    // Build the message
    const items = typeof order.items_data === 'string' ? JSON.parse(order.items_data) : (order.items_data || []);
    const fmt = (n) => new Intl.NumberFormat('th-TH').format(n);
    const itemLines = items.map(item =>
        `   • ${item.name}${item.variantName ? ` (${item.variantName})` : ''} x${item.quantity || 1}`
    ).join('\n');

    const msg = [
        `━━━━━━━━━━━━━━━━━━`,
        `❌  แจ้งยกเลิกคำสั่งซื้อ`,
        `━━━━━━━━━━━━━━━━━━`,
        ``,
        `📦 ออเดอร์: #${order.order_number}`,
        `👤 ชื่อ: ${customerData.name || order.facebook_name || 'ลูกค้า'}`,
        `📅 วันที่สั่ง: ${new Date(order.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        ``,
        `📋 รายการสินค้า:`,
        itemLines,
        ``,
        `💰 ยอดรวม: ${fmt(Number(order.total || 0))} บาท`,
        `🚫 สถานะ: ยกเลิกเรียบร้อยแล้ว`,
        ``,
        `━━━━━━━━━━━━━━━━━━`,
        `หากมีข้อสงสัย สามารถทักแชท`,
        `สอบถามได้ตลอดเวลาเลยนะครับ 🙏`,
        ``,
        `🛒 สั่งซื้อสินค้าใหม่ได้ที่:`,
        `https://www.hdgwrapskin.com`,
    ].join('\n');

    console.log("\n📨 Sending notification to PSID:", psid);

    const response = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messaging_type: 'UPDATE',
            recipient: { id: psid },
            message: { text: msg },
        }),
    });

    const result = await response.json();
    if (result.error) {
        console.error("❌ Failed:", JSON.stringify(result.error, null, 2));
    } else {
        console.log("✅ Notification sent successfully!", result);
    }

    await client.end();
}

main().catch(console.error);
