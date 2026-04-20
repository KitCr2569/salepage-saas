import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting to fix contact names...");
    try {
        const channel = await prisma.channel.findFirst({
            where: { type: 'MESSENGER', isActive: true },
        });

        if (!channel) {
             console.log("No MESSENGER channel found");
             return;
        }

        const config = channel.config as any;
        const envToken = (process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN || '').trim();
        const token = config?.pageAccessToken || envToken;

        if (!token) {
            console.log("No page access token found");
            return;
        }

        // Find all contacts where displayName contains only numbers
        const contactsToFix = await prisma.contact.findMany({
            where: {
                channelId: channel.id,
                // Simple check for numbers or displayName equals platformContactId
            }
        });

        // Filter in memory for regex match
        const badContacts = contactsToFix.filter(
            c => /^\d+$/.test(c.displayName) || c.displayName === c.platformContactId || c.displayName.startsWith("User ")
        );

        console.log(`Found ${badContacts.length} contacts with numeric/default names.`);

        let fixedCount = 0;
        for (const contact of badContacts) {
            const url = `https://graph.facebook.com/v19.0/${contact.platformContactId}?fields=name,first_name,last_name,profile_pic&access_token=${token}`;
            try {
                const res = await fetch(url);
                if (!res.ok) continue;
                const profile = await res.json();
                
                const fetchedName = profile.name || (profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : null);
                
                if (fetchedName && fetchedName !== contact.displayName) {
                    await prisma.contact.update({
                        where: { id: contact.id },
                        data: {
                            displayName: fetchedName,
                            avatarUrl: profile.profile_pic || contact.avatarUrl
                        }
                    });
                    console.log(`Fixed: ${contact.platformContactId} -> ${fetchedName}`);
                    fixedCount++;
                }
            } catch (err) {
                 console.log(`Failed to update ${contact.platformContactId}: ${err}`);
            }
            
            // small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log(`Successfully fixed ${fixedCount} contacts.`);
        
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
