import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const logs = await p.webhookLog.findMany({take: 5, orderBy: {createdAt: 'desc'}});
console.log(JSON.stringify(logs, null, 2));
await p.$disconnect();
