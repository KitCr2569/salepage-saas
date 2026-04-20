import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const result = await prisma.cannedReply.upsert({
        where: { shortcut: '/track' },
        update: {},
        create: {
            title: 'แจ้งจัดส่งสินค้า',
            shortcut: '/track',
            category: 'จัดส่ง',
            content: '📦 แจ้งจัดส่งสินค้า\n──────────────────\n🧾 ออเดอร์: #[เลขออเดอร์]\n👤 ชื่อ: [ชื่อลูกค้า]\n🚚 จัดส่งโดย: [ขนส่ง]\n📦 เลขพัสดุ: [เลข tracking]\n🔍 ติดตามพัสดุ: [ลิ้งติดตาม]\n──────────────────\nขอบคุณที่สั่งซื้อสินค้านะครับ 🙏\nหากมีข้อสงสัย ทักแชทได้เลยครับ',
        }
    });
    console.log('✅ Done:', result.id, result.title);
    await prisma.$disconnect();
}

main().catch(e => { console.error('❌', e.message); prisma.$disconnect(); });
