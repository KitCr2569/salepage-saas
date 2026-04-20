const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const orderNum = 'ORD-1775626700315';
  
  const chatOrder = await prisma.order.findFirst({ 
    where: { orderNumber: orderNum } 
  });
  console.log("=== CHAT ORDER TABLE ===");
  if (chatOrder) {
    console.log("Status:", chatOrder.status);
    console.log("Slip:", chatOrder.paymentSlipUrl ? "YES" : "NO");
    console.log("Name:", chatOrder.customerName);
    console.log("Phone:", chatOrder.customerPhone);
    console.log("Token:", chatOrder.paymentToken);
  } else {
    console.log("Not found in chat order table");
  }

  const ecomOrder = await prisma.ecommerceOrder.findFirst({ 
    where: { orderNumber: orderNum } 
  });
  console.log("\n=== ECOMMERCE ORDER TABLE ===");
  if (ecomOrder) {
    console.log("Status:", ecomOrder.status);
    console.log("Data:", JSON.stringify(ecomOrder.customerData, null, 2));
  } else {
    console.log("Not found in ecommerce table");
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
