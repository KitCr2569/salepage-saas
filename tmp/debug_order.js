const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  // Check chat order
  const chatOrder = await prisma.order.findFirst({ where: { orderNumber: 'ORD-1775623258893' } });
  if (chatOrder) {
    console.log("=== CHAT ORDER ===");
    console.log("paymentToken:", chatOrder.paymentToken);
    console.log("orderNumber:", chatOrder.orderNumber);
    console.log("status:", chatOrder.status);
    console.log("customerName:", chatOrder.customerName);
    console.log("customerPhone:", chatOrder.customerPhone);
    console.log("customerAddress:", chatOrder.customerAddress);
    console.log("paymentSlipUrl:", chatOrder.paymentSlipUrl ? "YES" : "NO");
  } else {
    console.log("No chat order found");
  }
  
  // Check ecommerce order
  const ecomOrder = await prisma.ecommerceOrder.findFirst({ where: { orderNumber: 'ORD-1775623258893' } });
  if (ecomOrder) {
    console.log("\n=== ECOMMERCE ORDER ===");
    console.log("orderNumber:", ecomOrder.orderNumber);
    console.log("status:", ecomOrder.status);
    console.log("customerData:", JSON.stringify(ecomOrder.customerData));
    console.log("paymentSlipUrl:", ecomOrder.paymentSlipUrl ? "YES" : "NO");
  } else {
    console.log("No ecommerce order found");
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
