const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const p = await prisma.shopProduct.findMany({where:{shopId:'ab839091-3cda-4b73-b0f3-7c12b97e3a1d'}});
  let dSize=0, vSize=0, iSize=0;
  p.forEach(x => {
    if(x.description) dSize += x.description.length;
    if(x.variants) vSize += JSON.stringify(x.variants).length;
    if(x.images) iSize += JSON.stringify(x.images).length;
  });
  console.log(`Desc MB: ${(dSize/1024/1024).toFixed(2)}`);
  console.log(`Vars MB: ${(vSize/1024/1024).toFixed(2)}`);
  console.log(`Imgs MB: ${(iSize/1024/1024).toFixed(2)}`);
  process.exit(0);
}
check();
