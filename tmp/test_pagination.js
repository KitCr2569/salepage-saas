const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const id = '28bbc669-b82c-4a44-af63-b2729623f29a';
    
    // Page 1
    const page1 = await prisma.message.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'desc' },
        take: 31,
    });
    
    console.log(`Page 1 fetched: ${page1.length}`);
    if (page1.length === 0) return;
    
    page1.reverse();
    const cursor = page1[0].createdAt;
    console.log(`Cursor for Page 2: ${cursor}`);
    
    // Page 2
    const page2 = await prisma.message.findMany({
        where: { conversationId: id, createdAt: { lt: new Date(cursor) } },
        orderBy: { createdAt: 'desc' },
        take: 31,
    });
    
    console.log(`Page 2 fetched: ${page2.length}`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
