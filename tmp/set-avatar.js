const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const res = await prisma.agent.updateMany({
        where: { avatarUrl: null },
        data: { avatarUrl: '/hdg_app_icon.png' }
    });
    console.log(`Updated ${res.count} agents with default avatar.`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
