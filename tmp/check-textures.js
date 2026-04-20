const {PrismaClient} = require("@prisma/client");
const p = new PrismaClient();

async function main() {
    // Show a few of the NEW textures (the ones with S3 images)
    const textures = await p.shopTexture.findMany({
        where: { 
            shopId: "ab839091-3cda-4b73-b0f3-7c12b97e3a1d",
            image: { startsWith: "https://zwizai" }
        },
        take: 5,
    });
    
    console.log("=== New textures with S3 images ===");
    textures.forEach(t => {
        console.log(`${t.code} | ${t.series} | img: ${t.image.substring(0,80)}...`);
    });

    // Also show old placeholder textures
    const old = await p.shopTexture.findMany({
        where: { 
            shopId: "ab839091-3cda-4b73-b0f3-7c12b97e3a1d",
            image: { startsWith: "https://placehold" }
        },
    });
    console.log(`\n=== Old placeholder textures: ${old.length} ===`);
    old.forEach(t => {
        console.log(`${t.code} | ${t.series} | ${t.name}`);
    });

    // Check for duplicate codes
    const all = await p.shopTexture.findMany({
        where: { shopId: "ab839091-3cda-4b73-b0f3-7c12b97e3a1d" },
    });
    const codes = {};
    all.forEach(t => {
        if (!codes[t.code]) codes[t.code] = [];
        codes[t.code].push(t.series);
    });
    const dupes = Object.entries(codes).filter(([, v]) => v.length > 1);
    if (dupes.length > 0) {
        console.log(`\n⚠️  Duplicate codes:`);
        dupes.forEach(([code, series]) => console.log(`  ${code}: ${series.join(", ")}`));
    }
}

main().catch(console.error).finally(() => p.$disconnect());
