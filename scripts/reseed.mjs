import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SHOP_ID = "d7700fc4-767b-4912-a81e-b0eefa8b3160";

async function main() {
  // ลบ products + categories + shop เดิม
  await prisma.shopProduct.deleteMany({ where: { shopId: SHOP_ID } });
  await prisma.shopCategory.deleteMany({ where: { shopId: SHOP_ID } });
  await prisma.shop.delete({ where: { id: SHOP_ID } });
  console.log("✅ ลบ shop เดิมเรียบร้อย — เปิด http://localhost:3001/114336388182180 เพื่อ seed ใหม่");
}

main().catch(console.error).finally(() => prisma.$disconnect());
