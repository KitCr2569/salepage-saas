/**
 * Seed all 76 texture patterns directly into the database via Prisma
 * Usage: npx tsx tmp/seed-textures.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PAGE_ID = "114336388182180";
const S3 = "https://zwizai.s3.amazonaws.com/ecommerce/";

const allTextures = [
    // === Crocodile Series ===
    { series: "Crocodile", code: "CDBK", name: "Crocodile Black", image: S3 + "1712101698871114336388182180_1712101699" },
    { series: "Crocodile", code: "CDOP", name: "Crocodile Orange Pink", image: S3 + "1712102531549114336388182180_1712102531" },

    // === Leather Series ===
    { series: "Leather", code: "LTBK", name: "Leather Black", image: S3 + "1712101811071114336388182180_1712101811" },
    { series: "Leather", code: "LTWT", name: "Leather White", image: S3 + "1712102825141114336388182180_1712102825" },
    { series: "Leather", code: "LTBK1", name: "Leather Black V2", image: S3 + "1712102839247114336388182180_1712102839" },

    // === Sand Series ===
    { series: "Sand", code: "SDBK", name: "Sand Black", image: S3 + "1712101834048114336388182180_1712101834" },
    { series: "Sand", code: "SBK", name: "Sand Matte Black", image: S3 + "1712102801903114336388182180_1712102802" },

    // === Matrix Series ===
    { series: "Matrix", code: "MTBK", name: "Matrix Black", image: S3 + "1712101843537114336388182180_1712101843" },
    { series: "Matrix", code: "MASV", name: "Matrix Silver", image: S3 + "1712102098544114336388182180_1712102098" },
    { series: "Matrix", code: "MAWT", name: "Matrix White", image: S3 + "1712102104745114336388182180_1712102105" },
    { series: "Matrix", code: "MABK", name: "Matrix Matte Black", image: S3 + "1712102113821114336388182180_1712102114" },

    // === Mamba Series ===
    { series: "Mamba", code: "MBGY", name: "Mamba Grey", image: S3 + "1712101853652114336388182180_1712101854" },
    { series: "Mamba", code: "MBBK", name: "Mamba Black", image: S3 + "1712101863543114336388182180_1712101863" },
    { series: "Mamba", code: "MBSN", name: "Mamba Sand", image: S3 + "1712101885374114336388182180_1712101885" },

    // === Node Series ===
    { series: "Node", code: "NDWT", name: "Node White", image: S3 + "1712101907675114336388182180_1712101908" },
    { series: "Node", code: "NDBK", name: "Node Black", image: S3 + "1712101916179114336388182180_1712101916" },
    { series: "Node", code: "NDR", name: "Node Red", image: S3 + "1712102742545114336388182180_1712102742" },

    // === Wave Series ===
    { series: "Wave", code: "WABK", name: "Wave Black", image: S3 + "1712101925864114336388182180_1712101926" },
    { series: "Wave", code: "WAWT", name: "Wave White", image: S3 + "1712101931981114336388182180_1712101932" },
    { series: "Wave", code: "WAGD", name: "Wave Gold", image: S3 + "1712101955718114336388182180_1712101956" },
    { series: "Wave", code: "WASV", name: "Wave Silver", image: S3 + "1712102009961114336388182180_1712102010" },
    { series: "Wave", code: "WBK", name: "Wave Brushed Black", image: S3 + "1712102856478114336388182180_1712102856" },

    // === Galaxy Fiber Series ===
    { series: "Galaxy Fiber", code: "GFWT", name: "Galaxy Fiber White", image: S3 + "1712101968417114336388182180_1712101968" },
    { series: "Galaxy Fiber", code: "GFYL", name: "Galaxy Fiber Yellow", image: S3 + "1712101977570114336388182180_1712101977" },
    { series: "Galaxy Fiber", code: "GFGP", name: "Galaxy Fiber Gold Pink", image: S3 + "1712102179538114336388182180_1712102179" },
    { series: "Galaxy Fiber", code: "GFG", name: "Galaxy Fiber Green", image: S3 + "1712102258544114336388182180_1712102258" },
    { series: "Galaxy Fiber", code: "GFR", name: "Galaxy Fiber Red", image: S3 + "1712102266049114336388182180_1712102266" },

    // === Camo Series ===
    { series: "Camo", code: "CMG", name: "Camo Green", image: S3 + "1712102033063114336388182180_1712102033" },
    { series: "Camo", code: "CMD", name: "Camo Desert", image: S3 + "1712102038979114336388182180_1712102039" },
    { series: "Camo", code: "CMW", name: "Camo White", image: S3 + "1712102055809114336388182180_1712102056" },
    { series: "Camo", code: "CMSV", name: "Camo Silver", image: S3 + "1712102071186114336388182180_1712102071" },
    { series: "Camo", code: "CMF", name: "Camo Forest", image: S3 + "1712102164720114336388182180_1712102165" },
    { series: "Camo", code: "CMRG", name: "Camo Red Grey", image: S3 + "1712102194892114336388182180_1712102195" },
    { series: "Camo", code: "CMOB", name: "Camo Orange Blue", image: S3 + "1712102208318114336388182180_1712102208" },
    { series: "Camo", code: "CMGB", name: "Camo Green Blue", image: S3 + "1712102216890114336388182180_1712102217" },
    { series: "Camo", code: "CMM", name: "Camo Marine", image: S3 + "1712102518075114336388182180_1712102518" },

    // === Electric Series ===
    { series: "Electric", code: "ELTB", name: "Electric Blue", image: S3 + "1712102083040114336388182180_1712102083" },
    { series: "Electric", code: "ELTW", name: "Electric White", image: S3 + "1712102091552114336388182180_1712102091" },

    // === Carbon Fiber Series ===
    { series: "Carbon Fiber", code: "CTUB", name: "Carbon Fiber Blue", image: S3 + "1712102132050114336388182180_1712102132" },
    { series: "Carbon Fiber", code: "CTBK", name: "Carbon Fiber Black", image: S3 + "1712102144964114336388182180_1712102145" },
    { series: "Carbon Fiber", code: "CTWT", name: "Carbon Fiber White", image: S3 + "1712102154073114336388182180_1712102154" },

    // === Abstract Series ===
    { series: "Abstract", code: "ASB", name: "Abstract Blue", image: S3 + "1712102228191114336388182180_1712102228" },
    { series: "Abstract", code: "AGBK", name: "Abstract Galaxy Black", image: S3 + "1712102239043114336388182180_1712102239" },
    { series: "Abstract", code: "AGBO", name: "Abstract Galaxy Blue Orange", image: S3 + "1712102815976114336388182180_1712102816" },
    { series: "Abstract", code: "ANM", name: "Abstract Anime", image: S3 + "1712102782378114336388182180_1712102782" },

    // === Honeycomb Series ===
    { series: "Honeycomb", code: "BTSC", name: "Honeycomb Stealth Camo", image: S3 + "1712102276518114336388182180_1712102276" },
    { series: "Honeycomb", code: "BTSY", name: "Honeycomb Shadow Yellow", image: S3 + "1712102348636114336388182180_1712102348" },

    // === Custom & Special ===
    { series: "Custom", code: "CSTT", name: "Custom Satin", image: S3 + "1712102289489114336388182180_1712102289" },
    { series: "Custom", code: "CUSTOMER", name: "Custom Order", image: S3 + "1712102557715114336388182180_1712102558" },
    { series: "Custom", code: "SY", name: "Satin Yellow", image: S3 + "1712102300653114336388182180_1712102300" },

    // === Japanese Wave Series ===
    { series: "Japanese Wave", code: "JPW", name: "Japanese Wave", image: S3 + "1712102329400114336388182180_1712102329" },

    // === Circuit Series ===
    { series: "Circuit", code: "CCW", name: "Circuit White", image: S3 + "1712102362332114336388182180_1712102362" },

    // === Splinter Series ===
    { series: "Splinter", code: "SLPW", name: "Splinter White", image: S3 + "1712102389570114336388182180_1712102389" },
    { series: "Splinter", code: "SLPB", name: "Splinter Blue", image: S3 + "1712102403537114336388182180_1712102403" },
    { series: "Splinter", code: "SLPGB", name: "Splinter Green Blue", image: S3 + "1712103030954114336388182180_1712103031" },
    { series: "Splinter", code: "SLPG", name: "Splinter Green", image: S3 + "1712102706749114336388182180_1712102707" },
    { series: "Splinter", code: "SLPBK", name: "Splinter Black", image: S3 + "1712102718480114336388182180_1712102718" },
    { series: "Splinter", code: "SLPBK1", name: "Splinter Black V2", image: S3 + "1712102731507114336388182180_1712102731" },

    // === X-Cross Series ===
    { series: "X-Cross", code: "XCWT", name: "X-Cross White", image: S3 + "1712102413701114336388182180_1712102414" },
    { series: "X-Cross", code: "XCUB", name: "X-Cross Blue", image: S3 + "1712102423349114336388182180_1712102423" },
    { series: "X-Cross", code: "XCGY", name: "X-Cross Grey", image: S3 + "1712102438988114336388182180_1712102439" },

    // === Square Series ===
    { series: "Square", code: "BSQ", name: "Square Black", image: S3 + "1712102464396114336388182180_1712102464" },
    { series: "Square", code: "WSQ", name: "Square White", image: S3 + "1712102489520114336388182180_1712102489" },
    { series: "Square", code: "SVSQ", name: "Square Silver", image: S3 + "1712102500575114336388182180_1712102500" },

    // === Spider Series ===
    { series: "Spider", code: "SPD1", name: "Spider Style 1", image: S3 + "1712102578211114336388182180_1712102578" },
    { series: "Spider", code: "SPD2", name: "Spider Style 2", image: S3 + "1712102588579114336388182180_1712102588" },
    { series: "Spider", code: "SPD3", name: "Spider Style 3", image: S3 + "1712102600758114336388182180_1712102601" },
    { series: "Spider", code: "SPD4", name: "Spider Style 4", image: S3 + "1712102609764114336388182180_1712102610" },
    { series: "Spider", code: "SPD5", name: "Spider Style 5", image: S3 + "1712102617609114336388182180_1712102617" },
    { series: "Spider", code: "SPD6", name: "Spider Style 6", image: S3 + "1712102632134114336388182180_1712102632" },
    { series: "Spider", code: "SPD7", name: "Spider Style 7", image: S3 + "1712102641944114336388182180_1712102642" },
    { series: "Spider", code: "SPD8", name: "Spider Style 8", image: S3 + "1712102651678114336388182180_1712102651" },

    // === Logo Series ===
    { series: "Logo", code: "LG1", name: "LIFE+GUARD Logo", image: S3 + "1712102680868114336388182180_1712102681" },

    // === Stainless Steel Series ===
    { series: "Stainless Steel", code: "SS", name: "Stainless Steel", image: S3 + "1712102751987114336388182180_1712102752" },
    { series: "Stainless Steel", code: "SSBK", name: "Stainless Steel Black", image: S3 + "1712102791309114336388182180_1712102791" },

    // === Tropical Carbon Fiber ===
    { series: "Tropical Carbon", code: "TCFR", name: "Tropical Carbon Fiber Red", image: S3 + "1712102870395114336388182180_1712102870" },
];

async function seed() {
    console.log(`\n🎨 Seeding ${allTextures.length} textures for page ${PAGE_ID}...\n`);

    // Find or create shop
    let shop = await prisma.shop.findUnique({ where: { pageId: PAGE_ID } });
    if (!shop) {
        console.error("❌ Shop not found for PAGE_ID:", PAGE_ID);
        process.exit(1);
    }
    console.log(`📦 Shop: ${shop.name} (ID: ${shop.id})\n`);

    // Get existing textures
    const existing = await prisma.shopTexture.findMany({ where: { shopId: shop.id } });
    const existingCodes = new Set(existing.map(t => t.code));
    console.log(`📋 Existing textures: ${existing.length}\n`);

    let added = 0;
    let skipped = 0;

    for (let i = 0; i < allTextures.length; i++) {
        const tex = allTextures[i];
        
        if (existingCodes.has(tex.code)) {
            console.log(`  ⏭  Skip ${tex.code} (${tex.name}) — already exists`);
            skipped++;
            continue;
        }

        try {
            await prisma.shopTexture.create({
                data: {
                    shopId: shop.id,
                    name: tex.name,
                    series: tex.series,
                    code: tex.code,
                    image: tex.image,
                    isActive: true,
                    sortOrder: existing.length + i,
                },
            });
            console.log(`  ✅ Added ${tex.code} — ${tex.name} (${tex.series})`);
            added++;
        } catch (err) {
            console.error(`  ❌ Error ${tex.code}:`, err.message);
        }
    }

    console.log(`\n🎉 Done! Added: ${added}, Skipped: ${skipped}, Total in DB: ${existing.length + added}`);
    
    // Show series summary
    const seriesCount = {};
    allTextures.forEach(t => seriesCount[t.series] = (seriesCount[t.series] || 0) + 1);
    console.log("\n📊 Series Summary:");
    Object.entries(seriesCount).sort((a, b) => b[1] - a[1]).forEach(([series, count]) => {
        console.log(`  ${series}: ${count} textures`);
    });
}

seed()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
