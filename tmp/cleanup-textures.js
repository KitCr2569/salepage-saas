const {PrismaClient} = require("@prisma/client");
const p = new PrismaClient();

async function main() {
    const shopId = "ab839091-3cda-4b73-b0f3-7c12b97e3a1d";
    
    // Delete old placeholder textures
    const result = await p.shopTexture.deleteMany({
        where: { 
            shopId,
            image: { startsWith: "https://placehold" }
        },
    });
    
    console.log(`🗑  Deleted ${result.count} old placeholder textures`);

    // Fix sort order for remaining textures
    const remaining = await p.shopTexture.findMany({
        where: { shopId },
        orderBy: { series: "asc" },
    });

    for (let i = 0; i < remaining.length; i++) {
        await p.shopTexture.update({
            where: { id: remaining[i].id },
            data: { sortOrder: i },
        });
    }

    console.log(`✅ Re-ordered ${remaining.length} textures`);
    
    // Show final series summary
    const seriesMap = {};
    remaining.forEach(t => {
        if (!seriesMap[t.series]) seriesMap[t.series] = 0;
        seriesMap[t.series]++;
    });
    console.log("\n📊 Final texture series:");
    Object.entries(seriesMap).sort((a,b) => b[1]-a[1]).forEach(([s,c]) => console.log(`  ${s}: ${c}`));
}

main().catch(console.error).finally(() => p.$disconnect());
