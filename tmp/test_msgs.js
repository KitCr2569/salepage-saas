const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const msgs = await prisma.message.findMany({ 
        orderBy: { createdAt: 'desc' }, 
        take: 100 
    });
    console.log('Total messages in DB:', msgs.length);
    if (msgs.length > 0) {
        console.log('Newest:', msgs[0].createdAt);
        console.log('Oldest in sample:', msgs[msgs.length-1].createdAt);
    }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
