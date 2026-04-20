// Test: fetch avatar via Page Conversations API
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const ch = await p.channel.findFirst({ where: { type: 'MESSENGER', isActive: true } });
    const config = ch?.config;
    const token = config?.pageAccessToken;
    const pageId = config?.pageId || process.env.FACEBOOK_PAGE_ID;

    console.log('Token:', token?.substring(0, 20) + '...');
    console.log('Page ID:', pageId);

    // Method: Use /{page-id}/conversations to get participant profile pics
    console.log('\n--- Method: /{page-id}/conversations ---');
    const url = `https://graph.facebook.com/v19.0/${pageId}/conversations?fields=participants{name,id,profile_pic}&limit=5&access_token=${token}`;
    const r = await fetch(url);
    const d = await r.json();
    
    if (d.error) {
        console.log('Error:', d.error.message);
    } else {
        for (const conv of (d.data || [])) {
            for (const p2 of conv.participants?.data || []) {
                if (p2.id !== pageId) {
                    console.log(`  ${p2.name} (${p2.id}): pic=${p2.profile_pic ? 'YES' : 'no'}`);
                }
            }
        }
    }

    // Method 2: platform-lookaside with page token
    console.log('\n--- Method 2: platform-lookaside ---');
    const testPsid = '25370710479273831';
    const lookaside = `https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=${testPsid}&width=200&access_token=${token}`;
    const r2 = await fetch(lookaside, { redirect: 'manual' });
    console.log('Status:', r2.status, 'Location:', r2.headers.get('location')?.substring(0, 100));

    await p.$disconnect();
}

main().catch(console.error);
