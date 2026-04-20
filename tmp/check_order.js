const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.ecommerceOrder.findFirst({
    where: { orderNumber: { contains: "1775609462427" } }
  });
  console.log("Order found:");
  console.log(JSON.stringify(order.customerData, null, 2));
  console.log("Slip:", order.paymentSlipUrl ? "Yes" : "No");
  console.log("Status:", order.status);
}
main().catch(console.error).finally(() => prisma.$disconnect());
