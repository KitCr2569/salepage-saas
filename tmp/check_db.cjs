const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const contact = await prisma.contact.findFirst({
        where: { platformContactId: '34866173753028776' }
    });
    console.log('--- CONTACT ---');
    console.log(contact);

    const conversations = await prisma.conversation.findMany({
        where: { contactId: contact.id },
        include: { messages: true }
    });
    console.log('\n--- CONVERSATIONS ---');
    console.log(`Found ${conversations.length} conversations`);
    
    // Check webhook logs
    const webhookLogs = await prisma.webhookLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
    });
    console.log('\n--- WEBHOOK LOGS ---');
    for (const log of webhookLogs) {
        console.log(JSON.stringify(log.payload, null, 2));
    }
}
main().finally(() => prisma.$disconnect());
