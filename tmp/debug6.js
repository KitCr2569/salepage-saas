const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Search by order number shown on success page
  const orderNum = 'ORD-20260408-137';
  
  console.log("=== Searching for", orderNum, "===\n");

  const chatOrder = await prisma.order.findFirst({ where: { orderNumber: orderNum } });
  if (chatOrder) {
    console.log("--- CHAT ORDER ---");
    console.log("Status:", chatOrder.status);
    console.log("Name:", chatOrder.customerName);
    console.log("Phone:", chatOrder.customerPhone);
    console.log("Slip:", chatOrder.paymentSlipUrl ? "YES" : "NO");
    console.log("Token:", chatOrder.paymentToken);
  } else {
    console.log("NOT in chat order table");
  }

  const ecom = await prisma.ecommerceOrder.findFirst({ where: { orderNumber: orderNum } });
  if (ecom) {
    console.log("\n--- ECOMMERCE ORDER ---");
    console.log("Status:", ecom.status);
    console.log("Slip:", ecom.paymentSlipUrl ? "YES" : "NO");
    console.log("CustomerData:", JSON.stringify(ecom.customerData, null, 2));
  } else {
    console.log("NOT in ecommerce order table");
  }

  // Also check the latest 3 orders in both tables
  console.log("\n=== LATEST 3 CHAT ORDERS ===");
  const latest = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 3, select: { orderNumber: true, status: true, paymentToken: true, customerName: true } });
  latest.forEach(o => console.log(o.orderNumber, "| status:", o.status, "| token:", o.paymentToken?.substring(0,12) + "..."));
  
  console.log("\n=== LATEST 3 ECOM ORDERS ===");
  const latestE = await prisma.ecommerceOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 3, select: { orderNumber: true, status: true, paymentSlipUrl: true } });
  latestE.forEach(o => console.log(o.orderNumber, "| status:", o.status, "| slip:", o.paymentSlipUrl ? "YES" : "NO"));
}

main().catch(console.error).finally(() => prisma.$disconnect());
