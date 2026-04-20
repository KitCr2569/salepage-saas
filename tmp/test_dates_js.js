const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const counts = await prisma.message.groupBy({
        by: ['createdAt'],
        _count: true
    });
    
    // Group by Date in JS
    const byDate = {};
    for (const item of counts) {
        const d = item.createdAt.toISOString().split('T')[0];
        byDate[d] = (byDate[d] || 0) + item._count;
    }
    
    console.log(byDate);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
