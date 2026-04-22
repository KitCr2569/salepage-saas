import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
await p.plan.update({ where: { slug: 'starter' }, data: { price: 490 } });
await p.plan.update({ where: { slug: 'pro' }, data: { price: 790 } });
const r = await p.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
r.forEach(x => console.log(`${x.name} = ${x.price} baht/month`));
await p.$disconnect();
