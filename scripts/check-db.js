const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
    // Check contacts
    const contacts = await p.contact.findMany({ take: 5, select: { displayName: true, avatarUrl: true } });
    console.log('=== CONTACTS ===');
    console.log(JSON.stringify(contacts, null, 2));

    // Check image messages
    const msgs = await p.message.findMany({ take: 3, where: { type: 'IMAGE' }, select: { content: true, imageUrl: true, type: true } });
    console.log('\n=== IMAGE MESSAGES ===');
    console.log(JSON.stringify(msgs, null, 2));

    // Count stats
    const totalContacts = await p.contact.count();
    const withAvatar = await p.contact.count({ where: { avatarUrl: { not: null } } });
    const totalMsgs = await p.message.count();
    const imgMsgs = await p.message.count({ where: { type: 'IMAGE' } });
    
    console.log(`\n=== STATS ===`);
    console.log(`Contacts: ${totalContacts} (${withAvatar} with avatar)`);
    console.log(`Messages: ${totalMsgs} (${imgMsgs} images)`);

    await p.$disconnect();
})();
