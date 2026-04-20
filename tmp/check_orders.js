const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const orders = await prisma.ecommerceOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(orders.map(o => ({
    id: o.orderNumber,
    name: typeof o.customerData === 'string' ? JSON.parse(o.customerData).name : o.customerData?.name,
    status: o.status,
    slip: o.paymentSlipUrl ? 'Yes' : 'No',
    date: o.createdAt
  })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
