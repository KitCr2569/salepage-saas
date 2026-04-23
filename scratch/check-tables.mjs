import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const tables = await p.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
console.log("Tables in DB:");
for (const t of tables) console.log(" -", t.tablename);
await p.$disconnect();
