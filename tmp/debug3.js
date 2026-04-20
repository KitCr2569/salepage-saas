const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.ecommerceOrder.findFirst({ 
    where: { orderNumber: 'ORD-1775626700315' } 
  });
  if (order) {
    console.log("=== ECOMMERCE ORDER ===");
    console.log("OrderNumber:", order.orderNumber);
    console.log("Status:", order.status);
    console.log("customerData:", JSON.stringify(order.customerData, null, 2));
    console.log("Slip:", order.paymentSlipUrl ? "YES" : "NO");
  } else {
    console.log("Not found in ecommerce table");
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
