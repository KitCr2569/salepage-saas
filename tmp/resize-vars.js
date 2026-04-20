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
        if (!p.variants) continue;
        let vList = typeof p.variants === 'string' ? JSON.parse(p.variants) : p.variants;
        if (!Array.isArray(vList)) continue;
        
        let changed = false;
        for (let i = 0; i < vList.length; i++) {
            if (vList[i].image && vList[i].image.length > 20000) {
                const newImg = await resizeBase64(vList[i].image);
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
            console.log(`Resized variants for ${p.name}`);
            cnt++;
        }
    }
    console.log(`Resized variants for ${cnt} products.`);
    process.exit(0);
}
fix();
