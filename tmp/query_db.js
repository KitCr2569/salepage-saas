const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.ecommerceOrder.findFirst({ where: { orderNumber: 'ORD-1775622022398' } });
  console.log('Status in DB:', order.status);
  console.log('Slip URL:', order.paymentSlipUrl);
}
main().finally(() => prisma.$disconnect());
