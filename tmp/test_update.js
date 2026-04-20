const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const t = "ORD-1775622022398";
  
  // 1. Fetch current order
  const order = await prisma.ecommerceOrder.findFirst({ where: { orderNumber: t } });
  console.log("OLD:", order);
  
  if (!order) return;
  
  // 2. Perform same update logic
  let updateData = { 
    paymentSlipUrl: "https://placehold.co/100x100", 
    status: 'PAID', 
    paidAt: new Date() 
  };
  const customerData = {
    name: "Test Fake", phone: "123", address: "ABC"
  };
  
  const currentData = typeof order.customerData === 'object' && order.customerData !== null ? order.customerData : {};
  updateData.customerData = {
      ...currentData,
      ...customerData
  };
  
  console.log("UPDATE PAYLOAD:", updateData);
  
  try {
    const updated = await prisma.ecommerceOrder.update({
        where: { id: order.id },
        data: updateData,
    });
    console.log("SUCCESS:", updated);
  } catch(e) {
    console.log("ERROR:", e);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
