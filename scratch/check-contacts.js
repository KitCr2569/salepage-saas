const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const contacts = await prisma.contact.findMany({
    where: { displayName: { contains: 'kittichai', mode: 'insensitive' } },
    include: { channel: true }
  });
  console.log(JSON.stringify(contacts, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
