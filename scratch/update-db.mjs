import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Update Script Starting ---');
    const NEW_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
    const NEW_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;

    if (!NEW_PAGE_ID || !NEW_TOKEN) {
        console.error('Error: Variables missing from environment');
        process.exit(1);
    }

    console.log(`Target Page ID: ${NEW_PAGE_ID}`);

    // 1. Update Channel
    const channels = await prisma.channel.findMany({
        where: { type: 'MESSENGER' }
    });

    console.log(`Found ${channels.length} MESSENGER channel(s).`);
    
    for (const channel of channels) {
        let config = {};
        try {
            config = typeof channel.config === 'string' ? JSON.parse(channel.config) : channel.config || {};
        } catch(e) {}
        
        config.pageId = NEW_PAGE_ID;
        config.pageAccessToken = NEW_TOKEN;
        config.verifyToken = process.env.META_VERIFY_TOKEN;

        await prisma.channel.update({
            where: { id: channel.id },
            data: { config }
        });
        console.log(`[+] Updated Channel ID: ${channel.id}`);
    }

    // 2. Update Shop
    const shop = await prisma.shop.findFirst();
    if (shop) {
        console.log(`Found Shop: ${shop.name} (Current Page ID: ${shop.pageId})`);
        
        if (shop.pageId !== NEW_PAGE_ID) {
            // Update the pageId
            await prisma.shop.update({
                where: { id: shop.id },
                data: { pageId: NEW_PAGE_ID }
            });
            console.log(`[+] Updated Shop Page ID to ${NEW_PAGE_ID}`);
        } else {
            console.log(`[*] Shop already has Page ID: ${NEW_PAGE_ID}`);
        }
    } else {
        console.log('[-] No Shop found in database to update.');
    }

    console.log('--- Database Update Script Finished ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
