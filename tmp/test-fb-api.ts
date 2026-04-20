import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
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

        // Find a contact whose name is just numbers
        const contact = await prisma.contact.findFirst({
            where: {
                channelId: channel.id,
                displayName: {
                    contains: '3469' // from the user's screenshot
                }
            }
        });
        
        let psid = contact?.platformContactId;
        
        if (!psid) {
             // Fallback to finding any long number
             const contacts = await prisma.contact.findMany({
                 where: { channelId: channel.id },
                 take: 100
             });
             const numOnly = contacts.find(c => /^\d+$/.test(c.displayName));
             if (numOnly) {
                 psid = numOnly.platformContactId;
             }
        }

        if (!psid) {
            console.log("Could not find a contact with numerical PSID displayName");
            // Just get a recent contact
             const anyContact = await prisma.contact.findFirst({
                 where: { channelId: channel.id }
             });
             psid = anyContact?.platformContactId;
        }
        
        if (!psid) {
             console.log("No contacts at all");
             return;
        }

        console.log(`Testing with PSID: ${psid}`);

        const url = `https://graph.facebook.com/v19.0/${psid}?fields=name,first_name,last_name,profile_pic&access_token=${token}`;
        console.log(`Fetching from: ${url}`);
        const res = await fetch(url);
        const data = await res.json();
        
        console.log("Graph API Response:");
        console.dir(data, { depth: null });
        
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
