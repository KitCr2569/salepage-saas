// ═══════════════════════════════════════════════════════════════
// GET /api/canned-replies — List canned replies
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

const MOCK_CANNED_REPLIES = [
    { id: 'cr-1', title: 'ทักทาย', content: 'สวัสดีค่ะ ยินดีให้บริการค่ะ มีอะไรให้ช่วยเหลือคะ? 😊', shortcut: '/hi', category: 'ทั่วไป' },
    { id: 'cr-2', title: 'ขอบคุณ', content: 'ขอบคุณที่ติดต่อมาค่ะ หากมีคำถามเพิ่มเติม สามารถทักมาได้เลยนะคะ 🙏', shortcut: '/thanks', category: 'ทั่วไป' },
    { id: 'cr-3', title: 'สอบถามรายละเอียด', content: 'รบกวนสอบถามรายละเอียดเพิ่มเติมหน่อยค่ะ\n- ชื่อ-นามสกุล\n- เบอร์โทรศัพท์\n- อีเมล', shortcut: '/info', category: 'ข้อมูล' },
    { id: 'cr-4', title: 'แจ้งราคา', content: 'ราคาสินค้าตามที่สอบถามค่ะ:\n\n📦 [ชื่อสินค้า]: xxx บาท\n🚚 ค่าจัดส่ง: ฟรี!\n\nสนใจสั่งซื้อสามารถแจ้งได้เลยค่ะ', shortcut: '/price', category: 'ขาย' },
    { id: 'cr-5', title: 'รอสักครู่', content: 'รบกวนรอสักครู่นะคะ กำลังตรวจสอบข้อมูลให้ค่ะ ⏳', shortcut: '/wait', category: 'ทั่วไป' },
    { id: 'cr-6', title: 'การจัดส่ง', content: 'สินค้าจะจัดส่งภายใน 1-3 วันทำการค่ะ\nสามารถติดตามสถานะพัสดุได้ที่ลิงก์นี้ค่ะ: [tracking link]', shortcut: '/ship', category: 'จัดส่ง' },
    { id: 'cr-7', title: 'แจ้งจัดส่งสินค้า', content: '📦 แจ้งจัดส่งสินค้า\n──────────────────\n🧾 ออเดอร์: #[เลขออเดอร์]\n👤 ชื่อ: [ชื่อลูกค้า]\n🚚 จัดส่งโดย: [ขนส่ง]\n📦 เลขพัสดุ: [เลข tracking]\n🔍 ติดตามพัสดุ: [ลิ้งติดตาม]\n──────────────────\nขอบคุณที่สั่งซื้อสินค้านะครับ 🙏\nหากมีข้อสงสัย ทักแชทได้เลยครับ', shortcut: '/track', category: 'จัดส่ง' },
];

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return errorResponse('ไม่ได้เข้าสู่ระบบ', 401);
        }

        try {
            const replies = await prisma.cannedReply.findMany({
                orderBy: { title: 'asc' },
            });

            // Auto-seed defaults if DB is empty
            if (replies.length === 0) {
                await prisma.cannedReply.createMany({
                    data: MOCK_CANNED_REPLIES.map(({ id: _id, ...r }) => r),
                    skipDuplicates: true,
                });
                const seeded = await prisma.cannedReply.findMany({ orderBy: { title: 'asc' } });
                return successResponse(seeded);
            }

            // Auto-add /track if missing
            const hasTrack = replies.some((r: any) => r.shortcut === '/track');
            if (!hasTrack) {
                await prisma.cannedReply.create({
                    data: {
                        title: 'แจ้งจัดส่งสินค้า',
                        shortcut: '/track',
                        category: 'จัดส่ง',
                        content: '📦 แจ้งจัดส่งสินค้า\n──────────────────\n🧾 ออเดอร์: #[เลขออเดอร์]\n👤 ชื่อ: [ชื่อลูกค้า]\n🚚 จัดส่งโดย: [ขนส่ง]\n📦 เลขพัสดุ: [เลข tracking]\n🔍 ติดตามพัสดุ: [ลิ้งติดตาม]\n──────────────────\nขอบคุณที่สั่งซื้อสินค้านะครับ 🙏\nหากมีข้อสงสัย ทักแชทได้เลยครับ',
                    },
                });
                const updated = await prisma.cannedReply.findMany({ orderBy: { title: 'asc' } });
                return successResponse(updated);
            }

            return successResponse(replies);
        } catch {
            return successResponse(MOCK_CANNED_REPLIES);
        }
    } catch (error) {
        return handleApiError(error);
    }
}
