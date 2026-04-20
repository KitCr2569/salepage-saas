const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const shopId = 'ab839091-3cda-4b73-b0f3-7c12b97e3a1d';
  const t = await prisma.shopTexture.findMany({where:{shopId}});
  const p = await prisma.shopProduct.findMany({where:{shopId}});
  const prodSize = JSON.stringify(p).length / 1024 / 1024;
  const texSize = JSON.stringify(t).length / 1024 / 1024;
  console.log(`Products MB: ${prodSize.toFixed(2)}`);
  console.log(`Textures MB: ${texSize.toFixed(2)}`);
  console.log(`Total Payload MB: ${(prodSize + texSize).toFixed(2)}`);
  process.exit(0);
}
check();
