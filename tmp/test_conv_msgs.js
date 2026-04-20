const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const convs = await prisma.conversation.findMany({
        include: {
            _count: {
                select: { messages: true }
            }
        },
        orderBy: {
            messages: { _count: 'desc' }
        },
        take: 5
    });
    
    for (const c of convs) {
        console.log(`Conv: ${c.id}, Total msgs: ${c._count.messages}`);
    }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
