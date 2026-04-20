import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkSize() {
  console.log("Checking DB sizes...");
  
  const shopId = 'ab839091-3cda-4b73-b0f3-7c12b97e3a1d'; // the connected page ID
  
  try {
      const products = await prisma.shopProduct.findMany({ where: { shopId }});
      const textures = await prisma.shopTexture.findMany({ where: { shopId }});
      
      let pSize = JSON.stringify(products).length;
      let tSize = JSON.stringify(textures).length;
      
      console.log(`Products: ${products.length} items, Total Size: ${(pSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Textures: ${textures.length} items, Total Size: ${(tSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Total Payload Size: ${((pSize + tSize) / 1024 / 1024).toFixed(2)} MB`);
      
      if ((pSize + tSize) > 4 * 1024 * 1024) {
          console.warn("WARNING: Payload exceeds 4MB Vercel Serverless limit limit!");
      }
  } catch (e) {
      console.error(e);
  } finally {
      await prisma.$disconnect();
  }
}
checkSize();
