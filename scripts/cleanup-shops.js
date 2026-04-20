const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const HDG_PAGE_ID = '114336388182180';

async function main() {
    const shops = await p.shop.findMany({ include: { products: true, categories: true } });
    console.log('=== SHOPS ===');
    shops.forEach(s => {
        console.log(`  [${s.pageId}] ${s.name} — ${s.products.length} products, ${s.categories.length} categories`);
    });

    // Delete all non-HDG shops that were incorrectly seeded
    const wrongShops = shops.filter(s => s.pageId !== HDG_PAGE_ID && s.products.length > 0);
    
    for (const shop of wrongShops) {
        await p.shopProduct.deleteMany({ where: { shopId: shop.id } });
        await p.shopCategory.deleteMany({ where: { shopId: shop.id } });
        await p.shop.delete({ where: { id: shop.id } });
        console.log(`\n✅ Deleted [${shop.pageId}] ${shop.name} (will be re-created as empty on next access)`);
    }

    if (wrongShops.length === 0) {
        console.log('\n✅ No wrong shops found — all clean!');
    }

    await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
