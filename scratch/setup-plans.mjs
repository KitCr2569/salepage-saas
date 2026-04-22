import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // ลบแพ็กเกจเก่าทั้งหมด (ถ้ายังไม่มีคนใช้)
  const plans = await prisma.plan.findMany();
  console.log('แพ็กเกจปัจจุบัน:', plans.length, 'รายการ');
  plans.forEach(p => console.log(`  - ${p.slug}: ${p.name} (${p.price} บาท, สินค้าสูงสุด ${p.maxProducts})`));

  // ─── กำหนด 2 แพ็กเกจใหม่ ───
  const PLANS = [
    {
      slug: 'starter',
      name: 'Starter',
      price: 990,
      maxProducts: 50,
      maxShops: 1,
      sortOrder: 1,
      features: JSON.stringify([
        'สร้างร้านค้า 1 ร้าน',
        'สินค้าสูงสุด 50 รายการ',
        'ระบบชำระเงิน QR PromptPay',
        'แชทลูกค้าผ่าน Messenger',
        'ระบบออเดอร์ + แจ้ง Tracking',
        'หน้าเว็บร้านค้า (Sale Page)',
        'รองรับ 2 ภาษา (TH/EN)',
      ]),
    },
    {
      slug: 'pro',
      name: 'Pro',
      price: 2490,
      maxProducts: 500,
      maxShops: 3,
      sortOrder: 2,
      features: JSON.stringify([
        'ทุกฟีเจอร์ของ Starter',
        'สร้างร้านค้าได้สูงสุด 3 ร้าน',
        'สินค้าสูงสุด 500 รายการ',
        'AI Chatbot ตอบอัตโนมัติ',
        'Broadcast ส่งข้อความหาลูกค้า',
        'วิเคราะห์ลูกค้า (Customer Analysis)',
        'Retarget ลูกค้าเก่า',
        'ระบบ Discount Code',
        'ระบบ Cross-sell อัตโนมัติ',
        'Meta Pixel Integration',
        'Export ออเดอร์ Excel',
        'สต๊อกสินค้า',
        'พนักงาน (Staff) หลายคน',
      ]),
    },
  ];

  for (const plan of PLANS) {
    const existing = await prisma.plan.findUnique({ where: { slug: plan.slug } });
    if (existing) {
      await prisma.plan.update({
        where: { slug: plan.slug },
        data: {
          name: plan.name,
          price: plan.price,
          maxProducts: plan.maxProducts,
          maxShops: plan.maxShops,
          features: plan.features,
          sortOrder: plan.sortOrder,
          isActive: true,
        },
      });
      console.log(`✅ อัปเดต: ${plan.name} (${plan.price} บาท/เดือน)`);
    } else {
      await prisma.plan.create({ data: plan });
      console.log(`✅ สร้างใหม่: ${plan.name} (${plan.price} บาท/เดือน)`);
    }
  }

  // ปิดแพ็กเกจอื่นที่ไม่ใช่ starter/pro
  await prisma.plan.updateMany({
    where: { slug: { notIn: ['starter', 'pro'] } },
    data: { isActive: false },
  });
  console.log('🔒 ปิดแพ็กเกจอื่นทั้งหมด (free, premium ฯลฯ)');

  // แสดงผลสุดท้าย
  const final = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  console.log('\n📦 แพ็กเกจที่ใช้งาน:');
  final.forEach(p => {
    console.log(`  ${p.name} — ฿${p.price}/เดือน | สินค้า ${p.maxProducts} | ร้าน ${p.maxShops}`);
    const features = JSON.parse(p.features);
    features.forEach(f => console.log(`    ✓ ${f}`));
  });
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
