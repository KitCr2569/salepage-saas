const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const orders = await prisma.ecommerceOrder.findMany({
        where: {
            OR: [
                { status: 'pending', paymentSlipUrl: { not: null } },
                { status: 'PAID' }
            ]
        }
    });

    console.log(`Found ${orders.length} orders to fix.`);

    for (const order of orders) {
        await prisma.ecommerceOrder.update({
            where: { id: order.id },
            data: { status: 'confirmed' }
        });
        console.log(`Updated ${order.orderNumber} to confirmed.`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
