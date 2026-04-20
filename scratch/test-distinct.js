const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const contacts = await prisma.contact.findMany({
      distinct: ['platformContactId'],
      orderBy: [
         { platformContactId: 'desc' }, // Must match distinct in Postgres
         { updatedAt: 'desc' }
      ],
      include: { channel: true },
      take: 5
    });
    console.log(JSON.stringify(contacts.map(c => c.displayName), null, 2));
  } catch (err) {
    console.error(err);
  }
}

main().finally(() => prisma.$disconnect());
