const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    // Check for duplicate orders
    const orders = await prisma.ecommerceOrder.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { orderNumber: true, note: true, total: true, createdAt: true },
    });
    orders.forEach(o => {
        console.log(`${o.orderNumber} | total: ${o.total} | note: ${o.note || '-'} | ${o.createdAt.toISOString()}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
