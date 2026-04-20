const { PrismaClient } = require('@prisma/client');
const sharp = require('sharp');
const prisma = new PrismaClient();

async function resizeBase64(base64Str) {
    if (!base64Str || !base64Str.startsWith('data:image')) return base64Str;
    try {
        const matches = base64Str.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return base64Str;
        const buffer = Buffer.from(matches[2], 'base64');
        const resized = await sharp(buffer)
            .resize({ width: 250, withoutEnlargement: true })
            .jpeg({ quality: 50 })
            .toBuffer();
        return `data:image/jpeg;base64,${resized.toString('base64')}`;
    } catch (e) { return base64Str; }
}

async function fix() {
    const shopId = 'ab839091-3cda-4b73-b0f3-7c12b97e3a1d';
    const products = await prisma.shopProduct.findMany({where: {shopId}});
    let cnt = 0;
    for (const p of products) {
        if (p.images && p.images.length > 0) {
            let changed = false;
            let newImages = [];
            for (const img of p.images) {
                if (img.length > 20000) { // > 20KB strings
                    const r = await resizeBase64(img);
                    if (r !== img) changed = true;
                    newImages.push(r);
                } else {
                    newImages.push(img);
                }
            }
            if (changed) {
                await prisma.shopProduct.update({ where: {id: p.id}, data: {images: newImages}});
                cnt++;
            }
        }
    }
    console.log(`Resized ${cnt} products.`);
    
    // Check final payload sizes
    const pAfter = await prisma.shopProduct.findMany({where:{shopId}});
    const tAfter = await prisma.shopTexture.findMany({where:{shopId}});
    console.log(`Final Products MB: ${(JSON.stringify(pAfter).length/1024/1024).toFixed(2)}`);
    console.log(`Final Textures MB: ${(JSON.stringify(tAfter).length/1024/1024).toFixed(2)}`);
    process.exit(0);
}
fix();
