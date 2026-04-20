const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { conversation: true }
    });
    console.log("Recent Orders in DB:", orders.length);
    orders.forEach(o => {
        console.log(`- ${o.orderNumber}: total=${o.total}, conv=${o.conversationId}`);
    });
    
    // Also check ecommerce orders
    const ecoms = await prisma.ecommerceOrder.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log("\nRecent Ecommerce Orders:");
    ecoms.forEach(o => {
        console.log(`- ${o.orderNumber}: total=${o.total}`);
    });

}
main().catch(console.error).finally(() => prisma.$disconnect());
