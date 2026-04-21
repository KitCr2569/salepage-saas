import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function initChannel() {
  const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

  if (!PAGE_ID || !PAGE_ACCESS_TOKEN) {
    console.error('❌ Missing PAGE_ID or PAGE_ACCESS_TOKEN in env');
    return;
  }

  let channel = await prisma.channel.findFirst({
    where: { type: 'MESSENGER', isActive: true },
  });

  if (!channel) {
    channel = await prisma.channel.create({
      data: {
        type: 'MESSENGER',
        name: 'HDG Wrap Facebook',
        config: {
          pageId: PAGE_ID,
          pageAccessToken: PAGE_ACCESS_TOKEN,
          verifyToken: process.env.VERIFY_TOKEN
        },
      },
    });
    console.log('✅ Created new Facebook channel in DB:', channel.id);
  } else {
    // Update existing
    channel = await prisma.channel.update({
      where: { id: channel.id },
      data: {
        config: {
          pageId: PAGE_ID,
          pageAccessToken: PAGE_ACCESS_TOKEN,
          verifyToken: process.env.VERIFY_TOKEN
        }
      }
    });
    console.log('✅ Updated existing Facebook channel config:', channel.id);
  }
  
  await prisma.$disconnect();
}

initChannel().catch(console.error);
