import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const msgs = await prisma.message.findMany({
  where: { content: { contains: '[Broadcast]' } },
  orderBy: { createdAt: 'desc' },
  take: 5,
  select: { id: true, content: true, conversationId: true, createdAt: true, sendStatus: true }
});
console.log('=== Broadcast messages in DB:', msgs.length);
msgs.forEach(m => console.log(` - [${m.sendStatus}] ${m.content?.substring(0,60)} @ conv:${m.conversationId?.substring(0,8)}`));

const convs = await prisma.conversation.findMany({
  where: { lastMessagePreview: { contains: '[Broadcast]' } },
  take: 5,
  select: { id: true, lastMessagePreview: true, lastMessageAt: true }
});
console.log('\n=== Conversations with [Broadcast] preview:', convs.length);
convs.forEach(c => console.log(` - ${c.lastMessagePreview} @ ${c.lastMessageAt}`));

// Also check recent broadcast messages
const recent = await prisma.message.findMany({
  where: { direction: 'OUTBOUND', senderName: { not: null } },
  orderBy: { createdAt: 'desc' },
  take: 5,
  select: { id: true, content: true, senderName: true, createdAt: true, sendStatus: true }
});
console.log('\n=== Recent OUTBOUND messages:', recent.length);
recent.forEach(m => console.log(` - [${m.senderName}] ${m.content?.substring(0,60)}`));

await prisma.$disconnect();
