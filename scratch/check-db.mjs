import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const channels = await prisma.channel.findMany();
    console.log('Channels:', JSON.stringify(channels, null, 2));
    const shops = await prisma.shop.findMany();
    console.log('Shops:', JSON.stringify(shops, null, 2));
    const logs = await prisma.webhookLog.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
    console.log('Latest WebhookLogs:', JSON.stringify(logs, null, 2));
}
main();
