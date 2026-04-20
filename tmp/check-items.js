const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    // Check the real OpenClaw orders (not TEST-)
    const orders = await prisma.ecommerceOrder.findMany({
        where: { orderNumber: { startsWith: "ORD-" } },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { orderNumber: true, itemsData: true, note: true },
    });
    orders.forEach(o => {
        console.log(`\n=== ${o.orderNumber} ===`);
        console.log("Note:", o.note);
        console.log("Items:", JSON.stringify(o.itemsData, null, 2));
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
