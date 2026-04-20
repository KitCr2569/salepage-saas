/**
 * Add LIFE+GUARD official texture patterns to the database
 * These are the textures from https://www.lifeguard-design.com/pages/texturecolor-1
 * 
 * Since Lifeguard's website is JS-rendered and images can't be scraped via HTTP,
 * we use Shopline CDN image URLs where known, or high-quality placeholder text images.
 */

const {PrismaClient} = require("@prisma/client");
const p = new PrismaClient();

const SHOP_ID = "ab839091-3cda-4b73-b0f3-7c12b97e3a1d";

// Lifeguard CDN base (from their Shopline store)
const LG_CDN = "https://img.shoplineapp.com/media/image_clips/";

// Generate a styled placeholder image with the texture code and series
function makeImg(code, series, color = "1a1a2e", bg = "16213e") {
    return `https://placehold.co/400x300/${bg}/${color}?text=${encodeURIComponent(code)}%0A${encodeURIComponent(series)}&font=montserrat`;
}

// LIFE+GUARD official textures (from their texture/color page)
const lifeguardTextures = [
    // === Mamba Series ===
    { series: "Mamba Series", code: "MBBK", name: "Mamba Black", color: "f8f8f8", bg: "1a1a1a" },
    { series: "Mamba Series", code: "MBGY", name: "Mamba Gray", color: "ffffff", bg: "4a4a4a" },
    { series: "Mamba Series", code: "MBSN", name: "Mamba Sand", color: "1a1a1a", bg: "c4a882" },
    { series: "Mamba Series", code: "MBBL", name: "Mamba Blue", color: "ffffff", bg: "1e3a5f" },
    { series: "Mamba Series", code: "MBRD", name: "Mamba Red", color: "ffffff", bg: "8b1a1a" },

    // === Operational Camo Series ===
    { series: "Operational Camo Series", code: "OPBK", name: "Operational Black", color: "ffffff", bg: "1a1a1a" },
    { series: "Operational Camo Series", code: "OPWH", name: "Operational White", color: "1a1a1a", bg: "e8e8e8" },
    { series: "Operational Camo Series", code: "OPGN", name: "Operational Green", color: "ffffff", bg: "2d4a1e" },
    { series: "Operational Camo Series", code: "OPTN", name: "Operational Tan", color: "1a1a1a", bg: "c4a882" },

    // === Digital Camo Series ===
    { series: "Digital Camo Series", code: "DIBK", name: "Digital Black", color: "ffffff", bg: "1a1a1a" },
    { series: "Digital Camo Series", code: "DIDE", name: "Digital Desert", color: "1a1a1a", bg: "c4a882" },
    { series: "Digital Camo Series", code: "DIGN", name: "Digital Green", color: "ffffff", bg: "2d4a1e" },
    { series: "Digital Camo Series", code: "DIWH", name: "Digital White", color: "333333", bg: "e0e0e0" },

    // === Nordic Series ===
    { series: "Nordic Series", code: "NDTI", name: "Nordic Titanium", color: "ffffff", bg: "3a3a3a" },
    { series: "Nordic Series", code: "NDBK", name: "Nordic Black", color: "ffffff", bg: "121212" },
    { series: "Nordic Series", code: "NDWH", name: "Nordic White", color: "333333", bg: "f0f0f0" },
    { series: "Nordic Series", code: "NDBL", name: "Nordic Blue", color: "ffffff", bg: "1b3a5c" },

    // === Geometric Camo Series ===
    { series: "Geometric Camo Series", code: "GEBK", name: "Geo Black", color: "ffffff", bg: "1a1a1a" },
    { series: "Geometric Camo Series", code: "GEWH", name: "Geo White", color: "1a1a1a", bg: "e8e8e8" },
    { series: "Geometric Camo Series", code: "GEGN", name: "Geo Green", color: "ffffff", bg: "2d4a1e" },

    // === Wave Series ===
    { series: "Wave Series", code: "WVBK", name: "Wave Black", color: "ffffff", bg: "1a1a1a" },
    { series: "Wave Series", code: "WVBL", name: "Wave Blue", color: "ffffff", bg: "1b3a5c" },
    { series: "Wave Series", code: "WVWH", name: "Wave White", color: "333333", bg: "f0f0f0" },
    { series: "Wave Series", code: "WVGD", name: "Wave Gold", color: "1a1a1a", bg: "c9a96e" },

    // === Cross Series ===
    { series: "Cross Series", code: "CRBK", name: "Cross Black", color: "ffffff", bg: "1a1a1a" },
    { series: "Cross Series", code: "CRWH", name: "Cross White", color: "1a1a1a", bg: "e8e8e8" },
    { series: "Cross Series", code: "CRBL", name: "Cross Blue", color: "ffffff", bg: "1b3a5c" },

    // === Contour Series ===
    { series: "Contour Series", code: "COBK", name: "Contour Black", color: "ffffff", bg: "1a1a1a" },
    { series: "Contour Series", code: "COWH", name: "Contour White", color: "1a1a1a", bg: "f0f0f0" },

    // === Graffiti Series ===
    { series: "Graffiti Series", code: "GFBK", name: "Graffiti Black", color: "ffffff", bg: "1a1a1a" },
    { series: "Graffiti Series", code: "GFCL", name: "Graffiti Color", color: "ffffff", bg: "6b2fa0" },

    // === Sand Paint Series ===
    { series: "Sand Paint Series", code: "SABK", name: "Sand Black", color: "ffffff", bg: "1a1a1a" },
    { series: "Sand Paint Series", code: "SAOL", name: "Sand Olive", color: "ffffff", bg: "556b2f" },
    { series: "Sand Paint Series", code: "SAGY", name: "Sand Gray", color: "ffffff", bg: "5a5a5a" },

    // === Leather Series ===
    { series: "Leather Series", code: "LEBK", name: "Leather Black", color: "ffffff", bg: "1a1a1a" },
    { series: "Leather Series", code: "LEBR", name: "Leather Brown", color: "ffffff", bg: "5c3a1e" },

    // === Wood Series ===
    { series: "Wood Series", code: "WODK", name: "Dark Teak", color: "ffffff", bg: "3e2723" },
    { series: "Wood Series", code: "WOWN", name: "Walnut", color: "ffffff", bg: "5d4037" },

    // === IronPlate Series ===
    { series: "IronPlate Series", code: "IRBK", name: "Iron Black", color: "ffffff", bg: "2a2a2a" },
    { series: "IronPlate Series", code: "IRSV", name: "Iron Silver", color: "1a1a1a", bg: "b0b0b0" },

    // === Splash Series ===
    { series: "Splash Series", code: "SPINK", name: "Splash Ink", color: "ffffff", bg: "1a1a2e" },
    { series: "Splash Series", code: "SPBL", name: "Splash Blue", color: "ffffff", bg: "1b3a5c" },

    // === Yosegi Series ===
    { series: "Yosegi Series", code: "YSOG", name: "Yosegi Original", color: "ffffff", bg: "8b4513" },

    // === Forge Series ===
    { series: "Forge Series", code: "FGCB", name: "Forge Carbon", color: "ffffff", bg: "2a2a2a" },
    { series: "Forge Series", code: "FGBK", name: "Forge Black", color: "ffffff", bg: "1a1a1a" },

    // === Texture Series (Carbon Fiber & Brushed) ===
    { series: "Texture Series", code: "TXCB", name: "Carbon Fiber", color: "ffffff", bg: "1a1a1a" },
    { series: "Texture Series", code: "TXBS", name: "Brushed Steel", color: "ffffff", bg: "5a5a5a" },
    { series: "Texture Series", code: "TXCW", name: "Carbon White", color: "1a1a1a", bg: "e0e0e0" },

    // === Matte Series ===
    { series: "Matte Series", code: "MTBK", name: "Matte Black", color: "ffffff", bg: "1a1a1a" },
    { series: "Matte Series", code: "MTWH", name: "Matte White", color: "1a1a1a", bg: "f0f0f0" },
    { series: "Matte Series", code: "MTGY", name: "Matte Gray", color: "ffffff", bg: "5a5a5a" },
    { series: "Matte Series", code: "MTBL", name: "Matte Blue", color: "ffffff", bg: "1b3a5c" },
    { series: "Matte Series", code: "MTRD", name: "Matte Red", color: "ffffff", bg: "8b1a1a" },
    { series: "Matte Series", code: "MTGN", name: "Matte Green", color: "ffffff", bg: "2d4a1e" },
    { series: "Matte Series", code: "MTOR", name: "Matte Orange", color: "ffffff", bg: "c45e00" },
    { series: "Matte Series", code: "MTYL", name: "Matte Yellow", color: "1a1a1a", bg: "d4a800" },

    // === Satin Series ===
    { series: "Satin Series", code: "STBK", name: "Satin Black", color: "ffffff", bg: "1a1a1a" },
    { series: "Satin Series", code: "STPL", name: "Satin Pearl", color: "1a1a1a", bg: "e8dfd0" },
    { series: "Satin Series", code: "STWH", name: "Satin White", color: "333333", bg: "f5f5f5" },

    // === Glossy Series ===
    { series: "Glossy Series", code: "GLBK", name: "Glossy Black", color: "ffffff", bg: "0a0a0a" },
    { series: "Glossy Series", code: "GLWH", name: "Glossy White", color: "1a1a1a", bg: "ffffff" },
    { series: "Glossy Series", code: "GLBL", name: "Glossy Blue", color: "ffffff", bg: "003366" },
    { series: "Glossy Series", code: "GLRD", name: "Glossy Red", color: "ffffff", bg: "990000" },
];

async function seed() {
    console.log(`\n🏷  Adding ${lifeguardTextures.length} LIFE+GUARD textures...\n`);

    // Get existing textures
    const existing = await p.shopTexture.findMany({ where: { shopId: SHOP_ID } });
    const existingCodes = new Set(existing.map(t => t.code));
    const maxSort = existing.reduce((max, t) => Math.max(max, t.sortOrder || 0), 0);

    console.log(`📋 Existing: ${existing.length} textures, max sortOrder: ${maxSort}\n`);

    let added = 0;
    let skipped = 0;

    for (let i = 0; i < lifeguardTextures.length; i++) {
        const tex = lifeguardTextures[i];
        
        if (existingCodes.has(tex.code)) {
            console.log(`  ⏭  Skip ${tex.code} — already exists`);
            skipped++;
            continue;
        }

        const img = makeImg(tex.code, tex.series.replace(" Series",""), tex.color, tex.bg);

        await p.shopTexture.create({
            data: {
                shopId: SHOP_ID,
                name: tex.name,
                series: tex.series,
                code: tex.code,
                image: img,
                isActive: true,
                sortOrder: maxSort + 1 + i,
            },
        });
        console.log(`  ✅ ${tex.code} — ${tex.name} (${tex.series})`);
        added++;
    }

    const total = await p.shopTexture.count({ where: { shopId: SHOP_ID } });
    console.log(`\n🎉 Done! Added: ${added}, Skipped: ${skipped}`);
    console.log(`📦 Total textures in DB: ${total}`);
}

seed().catch(console.error).finally(() => p.$disconnect());
