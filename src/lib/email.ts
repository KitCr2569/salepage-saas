// ═══════════════════════════════════════════════════════════════
// Email Notification System — Lightweight HTML email builder
// Uses Resend API (or any SMTP-compatible service)
// Set RESEND_API_KEY + RESEND_FROM_EMAIL in env vars to enable
// ═══════════════════════════════════════════════════════════════

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

function isConfigured(): boolean {
    return !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
    if (!isConfigured()) {
        console.log('[Email] Not configured (set RESEND_API_KEY + RESEND_FROM_EMAIL)');
        return false;
    }

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: process.env.RESEND_FROM_EMAIL,
                to,
                subject,
                html,
            }),
        });

        if (!res.ok) {
            console.error('[Email] Send failed:', await res.text());
            return false;
        }

        console.log(`[Email] ✅ Sent to ${to}: "${subject}"`);
        return true;
    } catch (err) {
        console.error('[Email] Error:', err);
        return false;
    }
}

// ─── Email Templates ─────────────────────────────────────────

function baseTemplate(content: string): string {
    return `<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:24px;margin-bottom:24px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
${content}
</table>
</body></html>`;
}

function headerRow(emoji: string, title: string, color: string = '#7c3aed'): string {
    return `<tr><td style="background:linear-gradient(135deg,${color},#ec4899);padding:32px 24px;text-align:center;">
<div style="font-size:48px;margin-bottom:8px;">${emoji}</div>
<h1 style="color:#fff;font-size:24px;margin:0;font-weight:700;">${title}</h1>
</td></tr>`;
}

function footerRow(): string {
    return `<tr><td style="padding:24px;text-align:center;background:#f9fafb;border-top:1px solid #e5e7eb;">
<p style="color:#9ca3af;font-size:12px;margin:0;">ข้อความนี้ส่งอัตโนมัติ กรุณาอย่าตอบกลับ</p>
</td></tr>`;
}

// ─── Order Confirmation ──────────────────────────────────────

export async function sendOrderConfirmation(
    email: string,
    orderNumber: string,
    customerName: string,
    items: { name: string; quantity: number; price: number }[],
    total: number,
    trackingUrl?: string,
): Promise<boolean> {
    const itemRows = items.map(item => 
        `<tr>
            <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">${item.name}</td>
            <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;text-align:center;">x${item.quantity}</td>
            <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;text-align:right;font-weight:600;">฿${(item.price * item.quantity).toLocaleString()}</td>
        </tr>`
    ).join('');

    const html = baseTemplate(`
        ${headerRow('🎉', 'ยืนยันคำสั่งซื้อ')}
        <tr><td style="padding:32px 24px;">
            <p style="font-size:16px;color:#374151;margin:0 0 8px;">สวัสดีคุณ <strong>${customerName}</strong></p>
            <p style="font-size:14px;color:#6b7280;margin:0 0 24px;">ขอบคุณสำหรับคำสั่งซื้อ! เราได้รับออเดอร์ของคุณเรียบร้อยแล้ว</p>
            
            <div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:24px;">
                <p style="font-size:12px;color:#9ca3af;margin:0 0 4px;">หมายเลขออเดอร์</p>
                <p style="font-size:20px;font-weight:700;color:#7c3aed;margin:0;font-family:monospace;">${orderNumber}</p>
            </div>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr style="border-bottom:2px solid #e5e7eb;">
                    <th style="text-align:left;padding:8px 0;font-size:12px;color:#9ca3af;font-weight:600;">สินค้า</th>
                    <th style="text-align:center;padding:8px 0;font-size:12px;color:#9ca3af;font-weight:600;">จำนวน</th>
                    <th style="text-align:right;padding:8px 0;font-size:12px;color:#9ca3af;font-weight:600;">ราคา</th>
                </tr>
                ${itemRows}
            </table>

            <div style="text-align:right;padding:16px 0;border-top:2px solid #7c3aed;">
                <span style="font-size:14px;color:#6b7280;">ยอดรวม: </span>
                <span style="font-size:24px;font-weight:700;color:#7c3aed;">฿${total.toLocaleString()}</span>
            </div>

            ${trackingUrl ? `<a href="${trackingUrl}" style="display:block;background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;margin-top:16px;">📦 ติดตามสถานะออเดอร์</a>` : ''}
        </td></tr>
        ${footerRow()}
    `);

    return sendEmail({ to: email, subject: `✅ ยืนยันออเดอร์ #${orderNumber}`, html });
}

// ─── Shipping Notification ───────────────────────────────────

export async function sendShippingNotification(
    email: string,
    orderNumber: string,
    customerName: string,
    trackingNumber: string,
    provider: string,
    trackingUrl?: string,
): Promise<boolean> {
    const html = baseTemplate(`
        ${headerRow('🚚', 'จัดส่งสินค้าแล้ว!', '#8b5cf6')}
        <tr><td style="padding:32px 24px;">
            <p style="font-size:16px;color:#374151;margin:0 0 8px;">สวัสดีคุณ <strong>${customerName}</strong></p>
            <p style="font-size:14px;color:#6b7280;margin:0 0 24px;">สินค้าของคุณถูกจัดส่งเรียบร้อยแล้ว!</p>

            <div style="background:linear-gradient(135deg,#f5f3ff,#fdf4ff);border:1px solid #e9d5ff;border-radius:12px;padding:20px;margin-bottom:24px;">
                <table width="100%">
                    <tr>
                        <td style="padding:4px 0;font-size:13px;color:#6b7280;">ออเดอร์</td>
                        <td style="padding:4px 0;font-size:13px;color:#374151;font-weight:600;text-align:right;">${orderNumber}</td>
                    </tr>
                    <tr>
                        <td style="padding:4px 0;font-size:13px;color:#6b7280;">ขนส่ง</td>
                        <td style="padding:4px 0;font-size:13px;color:#374151;font-weight:600;text-align:right;">${provider}</td>
                    </tr>
                    <tr>
                        <td style="padding:4px 0;font-size:13px;color:#6b7280;">เลขพัสดุ</td>
                        <td style="padding:4px 0;font-size:16px;color:#7c3aed;font-weight:700;text-align:right;font-family:monospace;">${trackingNumber}</td>
                    </tr>
                </table>
            </div>

            ${trackingUrl ? `<a href="${trackingUrl}" style="display:block;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#fff;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">📍 ติดตามพัสดุ</a>` : ''}
        </td></tr>
        ${footerRow()}
    `);

    return sendEmail({ to: email, subject: `🚚 จัดส่งแล้ว! ออเดอร์ #${orderNumber} — เลขพัสดุ: ${trackingNumber}`, html });
}

export { isConfigured as isEmailConfigured };
