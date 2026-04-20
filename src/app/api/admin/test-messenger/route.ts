import { NextRequest, NextResponse } from 'next/server';
import { getOrderConfirmation, getTrackingButtonMsg, getTrackingButtonTitle } from '@/lib/template-loader';
import { getFacebookPageConfig } from '@/lib/facebook';


const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN || '';

async function callSendAPI(payload: object) {
    const { pageAccessToken, pageId } = await getFacebookPageConfig();

    const res = await fetch(
        `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );
    return res.json();
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, psid, orderNumber, orderData } = body;

        if (!PAGE_ACCESS_TOKEN) {
            return NextResponse.json({ success: false, error: 'META_PAGE_ACCESS_TOKEN not configured' }, { status: 500 });
        }

        // ── Action: ping — ทดสอบว่า token ใช้งานได้ไหม ──
        if (action === 'ping') {
            const res = await fetch(
                `https://graph.facebook.com/v19.0/me?access_token=${PAGE_ACCESS_TOKEN}`
            );
            const data = await res.json() as { name?: string; id?: string; error?: { message: string } };
            if (data.error) {
                return NextResponse.json({ success: false, error: data.error.message, tokenStatus: 'INVALID' });
            }
            return NextResponse.json({ success: true, tokenStatus: 'VALID', page: { name: data.name, id: data.id } });
        }

        // ── Action: send_test — ส่งข้อความทดสอบไปหา PSID ──
        if (action === 'send_test') {
            if (!psid) return NextResponse.json({ success: false, error: 'psid required' }, { status: 400 });
            const result = await callSendAPI({
                messaging_type: 'RESPONSE',
                recipient: { id: psid },
                message: { text: `✅ ทดสอบระบบ Messenger สำเร็จ!\n\nส่งโดย Admin HDG Wrap\nเวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}` },
            });
            return NextResponse.json({ success: !result.error, result });
        }

        // ── Action: resend_order — ส่งข้อความยืนยันออเดอร์ซ้ำไปหา PSID ──
        if (action === 'resend_order') {
            if (!psid || !orderNumber) {
                return NextResponse.json({ success: false, error: 'psid and orderNumber required' }, { status: 400 });
            }

            const total = orderData?.total || 0;
            const items: Array<{ name: string; variantName: string; quantity: number }> = orderData?.items || [];

            const itemLines = items.map(item =>
                `- ${item.name} [${item.variantName}] x${item.quantity}`
            ).join('\n');

            const vars = {
                orderNumber,
                total: Number(total).toLocaleString('en-US', { minimumFractionDigits: 2 }),
                itemLines,
                customerName: orderData?.customer || '-',
                address: orderData?.address || '-',
                phone: orderData?.phone || '-',
                note: orderData?.note || '-',
            };

            const msg = await getOrderConfirmation(vars);
            const r1 = await callSendAPI({
                messaging_type: 'RESPONSE',
                recipient: { id: psid },
                message: { text: msg },
            });

            const trackingMsg = await getTrackingButtonMsg(vars);
            const trackingUrl = `https://www.hdgwrapskin.com/order/${orderNumber}?psid=${psid}`;
            const r2 = await callSendAPI({
                messaging_type: 'RESPONSE',
                recipient: { id: psid },
                message: {
                    attachment: {
                        type: 'template',
                        payload: {
                            template_type: 'button',
                            text: trackingMsg,
                            buttons: [{ type: 'web_url', title: getTrackingButtonTitle(), url: trackingUrl }],
                        },
                    },
                },
            });

            const hasError = r1?.error || r2?.error;
            return NextResponse.json({
                success: !hasError,
                error: hasError ? (r1?.error?.message || r2?.error?.message) : undefined,
                r1, r2,
            });
        }

        // ── Action: trigger_human_agent — ส่งข้อความด้วย HUMAN_AGENT tag เพื่อเคลียร์ App Review ──
        if (action === 'trigger_human_agent') {
            if (!psid) return NextResponse.json({ success: false, error: 'psid required' }, { status: 400 });
            const result = await callSendAPI({
                messaging_type: 'MESSAGE_TAG',
                tag: 'HUMAN_AGENT',
                recipient: { id: psid },
                message: { text: `🔔 ทดสอบระบบ HUMAN_AGENT Tag (สำหรับ App Review)\n\nข้อความนี้ถูกส่งโดยใช้ tag HUMAN_AGENT เพื่อยืนยันว่าแอปพลิเคชันมีการใช้งานฟีเจอร์การตอบกลับโดยมนุษย์นอกหน้าต่าง 24 ชม.\n\nเวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}` },
            });
            return NextResponse.json({ success: !result.error, result });
        }

        // ── Action: trigger_marketing_messages — ส่ง opt-in template ──
        if (action === 'trigger_marketing_messages') {
            if (!psid) return NextResponse.json({ success: false, error: 'psid required' }, { status: 400 });
            
            // ส่ง notification_messages opt-in template
            // ใช้ messaging_type: 'RESPONSE' (ต้องอยู่ใน 24h window)
            const result = await callSendAPI({
                messaging_type: 'RESPONSE',
                recipient: { id: psid },
                message: {
                    attachment: {
                        type: 'template',
                        payload: {
                            template_type: 'notification_messages',
                            title: `📢 รับสิทธิพิเศษและโปรโมชั่น (${Math.floor(Math.random() * 1000)})`,
                            image_url: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=800&q=80',
                            payload: `hdg_marketing_optin_${Date.now()}`,
                        },
                    },
                },
            });
            return NextResponse.json({ success: !result.error, result });
        }

        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
