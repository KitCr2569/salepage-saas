import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    // Read new token from .env.production.local
    const envContent = fs.readFileSync('.env.production.local', 'utf-8');
    const match = envContent.match(/META_PAGE_ACCESS_TOKEN="([^"]+)"/);
    if (!match) throw new Error('TOKEN NOT FOUND IN ENV');
    const newToken = match[1];
    
    console.log(`New token: ${newToken.substring(0, 30)}... (length: ${newToken.length})`);
    
    // Update all MESSENGER channels
    const channels = await prisma.channel.findMany({
        where: { type: { in: ['MESSENGER', 'INSTAGRAM'] } }
    });
    
    for (const ch of channels) {
        const cfg = (ch.config as Record<string, unknown>) || {};
        const updated = await prisma.channel.update({
            where: { id: ch.id },
            data: { config: { ...cfg, pageAccessToken: newToken } }
        });
        console.log(`✅ Updated channel: ${ch.name} (${ch.type})`);
    }
    
    await prisma.$disconnect();
    console.log('\nDone! Please restart dev server to pick up changes.');
}

main().catch(console.error);
