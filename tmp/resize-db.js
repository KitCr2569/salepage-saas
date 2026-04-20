const { PrismaClient } = require('@prisma/client');
const sharp = require('sharp');
const prisma = new PrismaClient();

async function resizeBase64(base64Str) {
    if (!base64Str || !base64Str.startsWith('data:image')) return base64Str;
    try {
        const matches = base64Str.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return base64Str;
        const type = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const resized = await sharp(buffer)
            .resize({ width: 300, withoutEnlargement: true })
            .jpeg({ quality: 60 })
            .toBuffer();
        return `data:image/jpeg;base64,${resized.toString('base64')}`;
    } catch (e) {
        return base64Str; // skip on error
    }
}

async function fix() {
    console.log("Connecting...");
    const shopId = 'ab839091-3cda-4b73-b0f3-7c12b97e3a1d';
    
    console.log("Fixing Textures...");
    const textures = await prisma.shopTexture.findMany({where: {shopId}});
    for (const t of textures) {
        if (t.image && t.image.length > 50000) { // only resize if > 50KB string
            const newImg = await resizeBase64(t.image);
            if (newImg !== t.image) {
               await prisma.shopTexture.update({ where: {id: t.id}, data: {image: newImg}});
               console.log(`Resized texture: ${t.name}`);
            }
        }
    }

    console.log("Fixing Products...");
    const products = await prisma.shopProduct.findMany({where: {shopId}});
    for (const p of products) {
        if (p.images && p.images.length > 0) {
            let changed = false;
            let newImages = [];
            for (const img of p.images) {
                if (img.length > 50000) {
                    const r = await resizeBase64(img);
                    if (r !== img) changed = true;
                    newImages.push(r);
                } else {
                    newImages.push(img);
                }
            }
            if (changed) {
                await prisma.shopProduct.update({ where: {id: p.id}, data: {images: newImages}});
                console.log(`Resized product images for: ${p.name}`);
            }
        }
    }
    
    console.log("Done!");
    process.exit(0);
}
fix();
