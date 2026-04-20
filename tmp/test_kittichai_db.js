const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const c = await prisma.contact.findFirst({
        where: { displayName: { contains: 'Kittichai' } },
        include: { conversations: { include: { _count: { select: { messages: true } } } } }
    });
    console.log(JSON.stringify(c, null, 2));
}
run().catch(console.error).finally(()=>prisma.$disconnect());
