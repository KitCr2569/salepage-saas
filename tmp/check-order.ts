import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const lastOrder = await prisma.ecommerceOrder.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  console.log("=== LATEST ECOMMERCE ORDER ===");
  console.log(JSON.stringify(lastOrder, null, 2));
  
  const lastUnifiedOrder = await prisma.order.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  console.log("=== LATEST UNIFIED ORDER ===");
  console.log(JSON.stringify(lastUnifiedOrder, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
