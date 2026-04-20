const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const latest = await prisma.ecommerceOrder.findFirst({
        orderBy: { createdAt: "desc" },
        select: {
            orderNumber: true,
            facebookPsid: true,
            facebookName: true,
            status: true,
            createdAt: true,
        },
    });
    console.log("Latest order:", JSON.stringify(latest, null, 2));
    
    // Also check the 3 most recent orders
    const recent = await prisma.ecommerceOrder.findMany({
        take: 3,
        orderBy: { createdAt: "desc" },
        select: {
            orderNumber: true,
            facebookPsid: true,
            facebookName: true,
        },
    });
    console.log("\nRecent orders PSID:");
    recent.forEach(o => console.log(`  ${o.orderNumber} → PSID: "${o.facebookPsid}" Name: "${o.facebookName}"`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
