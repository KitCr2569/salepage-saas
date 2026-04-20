const { PrismaClient } = require('@prisma/client');
const sharp = require('sharp');
const prisma = new PrismaClient();

async function optimize(base64Str) {
    if (!base64Str || !base64Str.startsWith('data:image')) return base64Str;
    try {
        const matches = base64Str.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return base64Str;
        const buffer = Buffer.from(matches[2], 'base64');
        const resized = await sharp(buffer)
            .resize({ width: 100, withoutEnlargement: true }) // Super small!
            .jpeg({ quality: 20 })
            .toBuffer();
        return `data:image/jpeg;base64,${resized.toString('base64')}`;
    } catch (e) { return base64Str; }
}

async function fix() {
    const shopId = 'ab839091-3cda-4b73-b0f3-7c12b97e3a1d';
    const products = await prisma.shopProduct.findMany({where: {shopId}});
    for (const p of products) {
        if (!p.variants) continue;
        let vList = typeof p.variants === 'string' ? JSON.parse(p.variants) : p.variants;
        if (!Array.isArray(vList)) continue;
        let changed = false;
        for (let i = 0; i < vList.length; i++) {
            if (vList[i].image && vList[i].image.length > 5000) { // > 5KB
                const newImg = await optimize(vList[i].image);
                if (newImg !== vList[i].image) {
                    vList[i].image = newImg;
                    changed = true;
                }
            }
        }
        if (changed) {
            await prisma.shopProduct.update({ 
                where: {id: p.id}, 
                data: {variants: vList}
            });
        }
    }
    
    const pAfter = await prisma.shopProduct.findMany({where:{shopId}});
    console.log(`Final Products MB: ${(JSON.stringify(pAfter).length/1024/1024).toFixed(2)}`);
    process.exit(0);
}
fix();
