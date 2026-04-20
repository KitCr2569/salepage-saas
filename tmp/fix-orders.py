import sys

def main():
    file_path = 'src/app/api/orders/route.ts'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    marker = '// ─── Notify customer about new order via Messenger (for Webhooks) ─────────'
    idx = content.find(marker)
    if idx == -1:
        print("Marker not found")
        sys.exit(1)

    # We will replace everything from the marker to the end of the file.
    new_content = content[:idx] + '''// ─── Notify customer about new order via Messenger (for Webhooks) ─────────
async function notifyCustomerNewOrder(
    psid: string,
    dbOrder: any,
    items: Array<{ name: string; variantName?: string; quantity: number; price: number }>
) {
    const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN;
    if (!PAGE_ACCESS_TOKEN) {
        console.log("⚠️ Missing PAGE_ACCESS_TOKEN, skipping customer notification");
        return;
    }

    try {
        const fmt = (n: number) => new Intl.NumberFormat("th-TH").format(n);
        const itemLines = items.map((item) =>
            `• ${item.name} ${item.variantName ? `[${item.variantName}] ` : ''}x${item.quantity} = ${fmt((item.price || 0) * item.quantity)} ฿`
        ).join('\\n');
        
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.hdgwrapskin.com";
        const paymentLink = `${baseUrl}/pay/${dbOrder.orderNumber}`;

        const summaryMsg = [
            `🧾 สร้างคำสั่งซื้อ #${dbOrder.orderNumber}`,
            `------------------`,
            itemLines,
            `------------------`,
            `ยอดสินค้า: ${fmt(dbOrder.subtotal || dbOrder.total)} บาท`,
            ...(dbOrder.discount > 0 ? [`ส่วนลด: -${fmt(dbOrder.discount)} บาท`] : []),
            dbOrder.shippingCost > 0 ? `ค่าจัดส่ง: +${fmt(dbOrder.shippingCost)} บาท` : '',
            dbOrder.shipping ? `จัดส่ง: ${dbOrder.shipping}` : '',
            dbOrder.payment ? `ชำระ: ${dbOrder.payment}` : '',
            `ยอดสุทธิ: ${fmt(dbOrder.total)} บาท`,
            ``,
            (dbOrder.payment === "โอนเงินผ่านธนาคาร" || dbOrder.payment === "พร้อมเพย์" || dbOrder.payment === "โอนเงิน")
                ? `แนบสลิปได้ที่:\\n${paymentLink}`
                : '',
            `สถานะ: รอชำระเงิน`,
        ].filter(Boolean).join('\\n');

        const sendMsg = async (payload: any) => {
            return fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            }).then(r => r.json());
        };

        // Send text summary
        const r1 = await sendMsg({
            messaging_type: "RESPONSE",
            recipient: { id: psid },
            message: { text: summaryMsg },
        });

        if (r1.error) {
            console.error("❌ Customer notification error:", r1.error);
        } else {
            console.log("✅ Customer notified about order:", dbOrder.orderNumber);
        }
    } catch (err) {
        console.error("❌ Customer notification fetch error:", err);
    }
}
'''
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print("Success")

if __name__ == "__main__":
    main()
