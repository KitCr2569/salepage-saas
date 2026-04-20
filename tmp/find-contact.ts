import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const contacts = await prisma.contact.findMany({
        where: { displayName: { contains: 'kittichai', mode: 'insensitive' } },
        select: { id: true, displayName: true, platformContactId: true }
    });

    if (!contacts.length) {
        const all = await prisma.contact.findMany({
            select: { id: true, displayName: true, platformContactId: true },
            take: 10,
            orderBy: { updatedAt: 'desc' }
        });
        console.log('ไม่พบ Kittichai — contacts ล่าสุด 10 คน:');
        all.forEach(c => console.log(`  ${c.displayName} | PSID: ${c.platformContactId}`));
    } else {
        contacts.forEach(c => console.log(`  ${c.displayName} | PSID: ${c.platformContactId}`));
    }
    await prisma.$disconnect();
}
main().catch(console.error);
