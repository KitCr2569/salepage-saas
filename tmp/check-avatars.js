const { PrismaClient } = require('@prisma/client');

async function main() {
    const p = new PrismaClient();
    const contacts = await p.contact.findMany({
        take: 5,
        select: { displayName: true, avatarUrl: true },
        orderBy: { updatedAt: 'desc' }
    });
    console.log(JSON.stringify(contacts, null, 2));
    
    // Test if avatar URLs are actually reachable
    for (const c of contacts) {
        if (c.avatarUrl) {
            try {
                const res = await fetch(c.avatarUrl, { method: 'HEAD' });
                console.log(`${c.displayName}: ${res.status} ${res.statusText} - ${c.avatarUrl.substring(0, 80)}...`);
            } catch (e) {
                console.log(`${c.displayName}: FAILED - ${e.message}`);
            }
        } else {
            console.log(`${c.displayName}: NO AVATAR`);
        }
    }
    
    await p.$disconnect();
}

main();
