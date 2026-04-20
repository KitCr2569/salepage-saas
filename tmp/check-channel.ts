import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const channels = await prisma.channel.findMany({
        select: { id: true, name: true, type: true, config: true }
    });
    
    for (const ch of channels) {
        const cfg = ch.config as Record<string, unknown> | null;
        const token = cfg?.pageAccessToken as string | undefined;
        console.log(`\n--- Channel: ${ch.name} (${ch.type}) ---`);
        if (token) {
            console.log(`pageAccessToken: ${token.substring(0, 30)}... (length: ${token.length})`);
        } else {
            console.log(`pageAccessToken: ❌ NOT SET in config`);
        }
    }
    await prisma.$disconnect();
}

main().catch(console.error);
