const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const dates = await prisma.$queryRaw`
        SELECT date(createdAt) as db_date, count(*) as count 
        FROM Message 
        GROUP BY date(createdAt) 
        ORDER BY date(createdAt) DESC 
        LIMIT 10
    `;
    console.log(dates);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
