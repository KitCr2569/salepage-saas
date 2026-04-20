// Test: simulate what the admin UI sends (with variants included)
const PAGE_ID = "114336388182180";
const BASE = "https://www.hdgwrapskin.com";

async function main() {
    // Fetch full products (with all images) — the admin page uses /api/shop/[pageId] 
    console.log("=== Fetching via admin endpoint (full data)... ===");
    const shopRes = await fetch(`${BASE}/api/shop/${PAGE_ID}`);
    const shopJson = await shopRes.json();
    
    if (!shopJson.success) {
        console.log("Failed:", shopJson);
        return;
    }

    const products = shopJson.data.products;
    console.log(`Total products: ${products.length}`);
    
    // Find the product with the most variants
    let maxVariants = products[0];
    for (const p of products) {
        if ((p.variants?.length || 0) > (maxVariants.variants?.length || 0)) {
            maxVariants = p;
        }
    }
    
    console.log(`\nProduct with most variants: "${maxVariants.name}"`);
    console.log(`  Variants: ${maxVariants.variants?.length || 0}`);
    console.log(`  Images: ${maxVariants.images?.length || 0}`);
    
    // Check variant data for image sizes
    let totalVariantImgSize = 0;
    let variantsWithImages = 0;
    for (const v of (maxVariants.variants || [])) {
        if (v.image) {
            variantsWithImages++;
            totalVariantImgSize += v.image.length;
        }
    }
    console.log(`  Variants with images: ${variantsWithImages}`);
    console.log(`  Total variant image data: ${(totalVariantImgSize / 1024).toFixed(0)}KB`);
    
    // Simulate the update body
    const updateBody = {
        name: maxVariants.name,
        description: maxVariants.description || "",
        price: Number(maxVariants.price),
        images: maxVariants.images || [],
        variants: (maxVariants.variants || []).filter(v => v.name?.trim()),
        categoryId: (maxVariants.categoryId && maxVariants.categoryId !== "all") ? maxVariants.categoryId : null,
    };
    
    const bodyStr = JSON.stringify(updateBody);
    console.log(`\nSimulated update body size: ${(bodyStr.length / 1024).toFixed(1)}KB`);
    
    if (bodyStr.length > 4 * 1024 * 1024) {
        console.log("⚠️  Body exceeds 4MB Vercel limit!");
    } else {
        console.log("✅ Body size OK");
    }
    
    // Actually try the update
    console.log("\n=== Sending PUT request... ===");
    const updateRes = await fetch(`${BASE}/api/shop/${PAGE_ID}/products/${maxVariants.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: bodyStr,
    });
    
    const resText = await updateRes.text();
    console.log(`Response status: ${updateRes.status}`);
    console.log("Response:", resText.substring(0, 500));
}

main().catch(e => console.error("FATAL:", e));
