// ═══════════════════════════════════════════════════════════════
// Centralized Notification Templates
// ═══════════════════════════════════════════════════════════════
// แก้ไขข้อความ template ทั้งหมดได้ที่นี่ที่เดียว
// ใช้ placeholder {variable} → ระบบแทนค่าให้อัตโนมัติ
//
// Placeholders ที่ใช้ได้:
//   {orderNumber}  — เลขที่คำสั่งซื้อ
//   {total}        — ยอดรวม (formatted)
//   {itemLines}    — รายการสินค้า
//   {customerName} — ชื่อลูกค้า
//   {address}      — ที่อยู่จัดส่ง
//   {phone}        — เบอร์โทร
//   {note}         — หมายเหตุ
//   {shopUrl}      — URL ร้านค้า
//   {orderDate}    — วันที่สั่งซื้อ
//   {trackingUrl}  — URL ตรวจสอบสถานะ
// ═══════════════════════════════════════════════════════════════

// ──────────────────── 1. แจ้งออเดอร์ (Order Confirmation) ────────────────────
// ส่งให้ลูกค้าเมื่อยืนยันออเดอร์ (ข้อความหลัก)
export const ORDER_CONFIRMATION = `📋 เลขที่การสั่งซื้อ: {orderNumber}
-----------------------------

รอแจ้งหลักฐานการชำระเงิน:
จำนวนเงิน {total} บาท

รายละเอียดสินค้า:
{itemLines}

รายละเอียด:
- ชื่อ: {customerName}
- ที่อยู่: {address}
- เบอร์โทร: {phone}

หมายเหตุ: {note}`;

// ──────────────────── 2. ปุ่มตรวจสอบสถานะ (Tracking Button) ────────────────────
// ส่งพร้อมปุ่ม "ตรวจสอบ/แก้ไข" ใน Messenger
export const TRACKING_BUTTON_MSG = `📋 เลขที่การสั่งซื้อ: {orderNumber}

สามารถตรวจสอบสถานะ หรือ แก้ไข
ที่อยู่ในการจัดส่งได้ที่นี่ 👇`;

export const TRACKING_BUTTON_TITLE = `ตรวจสอบ/แก้ไข`;

// ──────────────────── 3. ยืนยันการชำระเงิน (Payment Confirmation) ────────────────────
// ส่งเมื่อลูกค้าแนบสลิปสำเร็จ
export const PAYMENT_CONFIRMATION = `📋 เลขที่การสั่งซื้อ: {orderNumber}
-----------------------------

ชำระเงินเรียบร้อยแล้ว! 🎉
จำนวนเงิน {total} บาท

รายละเอียดสินค้า:
{itemLines}

รายละเอียด:
- ชื่อ: {customerName}
- ที่อยู่: {address}
- เบอร์โทร: {phone}

หมายเหตุ: {note}`;

// ──────────────────── 4. แจ้ง Admin (Admin Notification) ────────────────────
// ข้อความที่แสดงใน inbox เมื่อลูกค้าชำระเงิน
export const ADMIN_PAYMENT_NOTIFICATION = `💳 ลูกค้าแนบสลิปชำระเงิน #{orderNumber}
✅ ยอด {total} ฿
📎 สลิปแนบเรียบร้อย`;

export const ADMIN_PAYMENT_PREVIEW = `💳 แนบสลิป #{orderNumber}`;

// ──────────────────── 5. ยกเลิกอัตโนมัติ (Auto-Cancel) ────────────────────
// ส่งเมื่อออเดอร์หมดอายุ (ไม่ชำระเงินภายใน 2 ชั่วโมง)
export const AUTO_CANCEL_MSG = `━━━━━━━━━━━━━━━━━━
⏰  แจ้งยกเลิกคำสั่งซื้ออัตโนมัติ
━━━━━━━━━━━━━━━━━━

📦 ออเดอร์: #{orderNumber}
👤 ชื่อ: {customerName}
📅 วันที่สั่ง: {orderDate}

📋 รายการสินค้า:
{itemLines}

💰 ยอดรวม: {total} บาท
🚫 สถานะ: ยกเลิกอัตโนมัติ (ไม่มีการชำระเงินภายใน 2 ชั่วโมง)

━━━━━━━━━━━━━━━━━━
หากต้องการสั่งซื้อใหม่ หรือ
มีข้อสงสัย ทักแชทได้เลยนะครับ 🙏

🛒 สั่งซื้อสินค้าใหม่ได้ที่:
{shopUrl}`;

// ──────────────────── 6. ยืนยันแก้ไขที่อยู่ (Address Update) ────────────────────
export const ADDRESS_UPDATE_CONFIRM = `✅ ลูกค้ายืนยันการแก้ไขที่อยู่จัดส่ง

📋 เลขที่สั่งซื้อ: {orderNumber}
👤 ชื่อ: {customerName}
📞 เบอร์โทร: {phone}
📍 ที่อยู่: {address}`;

export const ADDRESS_UPDATE_CONFIRM_WITH_NOTE = `✅ ยืนยันการแก้ไขที่อยู่จัดส่งเรียบร้อยแล้ว

📋 เลขที่การสั่งซื้อ: {orderNumber}

ขอบคุณที่แจ้งข้อมูลครับ 🙏
แอดมินจะดำเนินการจัดส่งตามที่อยู่ใหม่ค่ะ`;

// ──────────────────── 7. แจ้งเตือนค้างชำระ (Follow-up Reminder) ────────────────────
// ส่งเมื่อลูกค้าสั่งแต่ยังไม่ชำระหลังจาก X ชั่วโมง (ก่อนยกเลิก)
export const FOLLOW_UP_REMINDER = `⏳ ออเดอร์ #{orderNumber} ของคุณยังรอการชำระเงินอยู่นะครับ

💰 ยอดที่ต้องชำระ: {total} บาท

📋 รายการสินค้า:
{itemLines}

📌 กรุณาชำระเงินและแนบสลิปเพื่อยืนยันการสั่งซื้อ
💡 หากไม่ชำระภายในเวลาที่กำหนด ระบบจะยกเลิกออเดอร์อัตโนมัติ

🛒 หากต้องการสั่งใหม่: {shopUrl}`;
// ──────────────────── 8. สรุปออเดอร์ Checkout (Checkout Order Summary) ────────────────────
export const CHECKOUT_ORDER_SUMMARY = `=== สรุปการสั่งซื้อ ===

{itemLines}
-----------------------------
💰 ค่าสินค้า (ไม่รวมค่าส่ง) {subtotal} บาท
-----------------------------
ยอดรวมค่าจัดส่ง
{shippingOptions}`;

export const PAY_ORDER_SUMMARY = `📝 สร้างคำสั่งซื้อ #{orderNumber}

{itemLines}

ยอดสินค้า: {subtotal} บาท
{discountLine}
{shippingLine}
{shippingMethodLine}
{paymentMethodLine}
ยอดสุทธิ: {total} บาท

{paymentLinkSection}
สถานะ: รอชำระเงิน
หมายเหตุ: {note}`;

export const FB_SHOP_ORDER_SUMMARY = `=== สรุปการสั่งซื้อ ===

{itemLines}

🛒 ค่าสินค้า (ไม่รวมค่าส่ง)
{total} บาท

ตัวเลือกในการจัดส่ง
{shipping}`;

// ──────────────────── Utility: แทนค่า placeholders ────────────────────
export function fillTemplate(
    template: string,
    vars: Record<string, string | number | undefined | null>
): string {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value ?? '-'));
    }
    return result;
}
