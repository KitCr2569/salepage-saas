const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const msgs = await prisma.message.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { content: true, sendStatus: true } });
    console.log(msgs.map(m => ({status: m.sendStatus, content: m.content.substring(0, 30)})));
}
main().finally(() => prisma.$disconnect());
