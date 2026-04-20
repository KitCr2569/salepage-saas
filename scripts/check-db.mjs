import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const c = await p.contact.count();
const cv = await p.conversation.count();
const m = await p.message.count();
console.log(`Contacts: ${c} | Conversations: ${cv} | Messages: ${m}`);
await p.$disconnect();
