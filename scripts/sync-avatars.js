// Fast avatar sync — fetch profile pics from DB token (same as webhook)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const CONCURRENCY = 10;

async function main() {
    console.log('🖼️ Avatar Sync — Starting...');
    
    // Get token from DB channel config (same source as webhook)
    const channel = await prisma.channel.findFirst({
        where: { type: 'MESSENGER', isActive: true },
    });
    const config = channel?.config;
    const token = config?.pageAccessToken || config?.accessToken || process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN || '';
    
    if (!token) {
        console.error('❌ No page access token found in DB or env!');
        await prisma.$disconnect();
        return;
    }
    console.log(`Token: ${token.substring(0, 20)}...${token.substring(token.length - 10)} (${token.length} chars)`);

    const t0 = Date.now();

    // Get all contacts without avatars
    const contacts = await prisma.contact.findMany({
        where: { avatarUrl: null },
        select: { id: true, platformContactId: true, displayName: true },
    });
    console.log(`📋 ${contacts.length} contacts without avatar\n`);

    if (contacts.length === 0) {
        console.log('✅ All contacts already have avatars!');
        await prisma.$disconnect();
        return;
    }

    // Test with first contact
    const test = contacts[0];
    const testUrl = `https://graph.facebook.com/v19.0/${test.platformContactId}?fields=name,profile_pic&access_token=${token}`;
    console.log(`🧪 Testing with PSID: ${test.platformContactId} (${test.displayName})`);
    const r = await fetch(testUrl);
    const body = await r.json();
    console.log(`Response: ${JSON.stringify(body).substring(0, 300)}\n`);

    if (body.error) {
        console.error(`❌ API Error: ${body.error.message}`);
        console.log('Token might be expired or missing permissions. Check DB channel config.');
        await prisma.$disconnect();
        return;
    }

    let updated = 0, errors = 0;

    for (let i = 0; i < contacts.length; i += CONCURRENCY) {
        const batch = contacts.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
            batch.map(async (contact) => {
                try {
                    const res = await fetch(
                        `https://graph.facebook.com/v19.0/${contact.platformContactId}?fields=profile_pic&access_token=${token}`
                    );
                    if (!res.ok) return null;
                    const data = await res.json();
                    if (data.profile_pic) {
                        await prisma.contact.update({
                            where: { id: contact.id },
                            data: { avatarUrl: data.profile_pic },
                        });
                        return true;
                    }
                    return null;
                } catch { return null; }
            })
        );
        for (const r of results) {
            if (r.status === 'fulfilled' && r.value) updated++;
            else if (r.status === 'rejected') errors++;
        }
        const done = Math.min(i + CONCURRENCY, contacts.length);
        if (done % 50 === 0 || done === contacts.length) {
            console.log(`[${done}/${contacts.length}] ${updated} avatars updated`);
        }
    }

    console.log(`\n✅ Done in ${((Date.now()-t0)/1000).toFixed(1)}s — ${updated} avatars, ${errors} errors`);
    await prisma.$disconnect();
}

main().catch(console.error);
