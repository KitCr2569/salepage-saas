const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log("Connecting...");
  const shopId = 'ab839091-3cda-4b73-b0f3-7c12b97e3a1d';
  
  const textures = await prisma.shopTexture.findMany({ where: { shopId }, select: { id: true, name: true, image: true }});
  
  let bigTextures = [];
  for (const t of textures) {
      if (!t.image) continue;
      const sizeMB = t.image.length / 1024 / 1024;
      if (sizeMB > 0.5) {
          bigTextures.push({ id: t.id, name: t.name, sizeMB: sizeMB.toFixed(2) });
      }
  }
  console.log("Large Textures (>0.5MB):", bigTextures);

  const products = await prisma.shopProduct.findMany({ where: { shopId }, select: { id: true, name: true, images: true }});
  let bigProducts = [];
  for (const p of products) {
      if (!p.images || !p.images.length) continue;
      const sizeMB = JSON.stringify(p.images).length / 1024 / 1024;
      if (sizeMB > 0.5) {
          bigProducts.push({ id: p.id, name: p.name, sizeMB: sizeMB.toFixed(2) });
      }
  }
  console.log("Large Products (>0.5MB):", bigProducts);
  process.exit(0);
}
check();
