// ═══════════════════════════════════════════════════════════════
// Stock Management — Auto-deduct and restore stock for variants
// stored in ShopProduct.variants JSON field.
//
// Variant format: { id, name, price, stock, image? }[]
// ═══════════════════════════════════════════════════════════════

import { prisma } from '@/lib/prisma';

// ─── Types ───────────────────────────────────────────────────

export interface CartItemForStock {
    productId: string;   // ShopProduct.id OR legacy product ID
    variantId: string;   // variant.id inside the variants JSON
    name?: string;       // product name (for logging)
    quantity: number;
}

export interface StockResult {
    success: boolean;
    updated: number;          // number of products updated
    errors: string[];         // any errors encountered
    details: { productId: string; variantId: string; oldStock: number; newStock: number }[];
}

export interface LowStockItem {
    productId: string;
    productName: string;
    variantId: string;
    variantName: string;
    stock: number;
    image?: string;
}

// ─── Parse variants from DB ──────────────────────────────────

function parseVariants(variants: any): any[] {
    if (!variants) return [];
    try {
        if (typeof variants === 'string') return JSON.parse(variants);
        if (Array.isArray(variants)) return variants;
        return [];
    } catch {
        return [];
    }
}

// ─── Deduct Stock ────────────────────────────────────────────

/**
 * Deduct stock from product variants after an order is placed.
 * Updates the ShopProduct.variants JSON field in-place.
 * 
 * @param items - Cart items with productId, variantId, quantity
 * @returns StockResult with details of changes
 */
export async function deductStock(items: CartItemForStock[]): Promise<StockResult> {
    const result: StockResult = { success: true, updated: 0, errors: [], details: [] };

    // Group items by productId (batch updates per product)
    const grouped = new Map<string, CartItemForStock[]>();
    for (const item of items) {
        if (!item.productId || !item.variantId) continue;
        const key = item.productId;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(item);
    }

    for (const [productId, productItems] of grouped) {
        try {
            const product = await prisma.shopProduct.findUnique({
                where: { id: productId },
                select: { id: true, name: true, variants: true },
            });

            if (!product) {
                // Product might be a legacy ID — try by name match
                result.errors.push(`Product ${productId} not found (might be legacy)`);
                continue;
            }

            const variants = parseVariants(product.variants);
            if (variants.length === 0) continue;

            let changed = false;

            for (const item of productItems) {
                const variant = variants.find((v: any) => v.id === item.variantId);
                if (!variant) {
                    result.errors.push(`Variant ${item.variantId} not found in product ${product.name}`);
                    continue;
                }

                const oldStock = typeof variant.stock === 'number' ? variant.stock : 99;
                const newStock = Math.max(0, oldStock - item.quantity);

                result.details.push({
                    productId,
                    variantId: item.variantId,
                    oldStock,
                    newStock,
                });

                variant.stock = newStock;
                changed = true;
            }

            if (changed) {
                await prisma.shopProduct.update({
                    where: { id: productId },
                    data: { variants: variants },
                });
                result.updated++;
            }
        } catch (err: any) {
            result.errors.push(`Error updating ${productId}: ${err.message}`);
            result.success = false;
        }
    }

    if (result.details.length > 0) {
        console.log(`[Stock] Deducted: ${result.details.map(d => `${d.variantId}: ${d.oldStock}→${d.newStock}`).join(', ')}`);
    }

    return result;
}

// ─── Restore Stock ───────────────────────────────────────────

/**
 * Restore stock when an order is cancelled or deleted.
 * Adds quantity back to variant stock.
 */
export async function restoreStock(items: CartItemForStock[]): Promise<StockResult> {
    const result: StockResult = { success: true, updated: 0, errors: [], details: [] };

    const grouped = new Map<string, CartItemForStock[]>();
    for (const item of items) {
        if (!item.productId || !item.variantId) continue;
        const key = item.productId;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(item);
    }

    for (const [productId, productItems] of grouped) {
        try {
            const product = await prisma.shopProduct.findUnique({
                where: { id: productId },
                select: { id: true, name: true, variants: true },
            });

            if (!product) continue;

            const variants = parseVariants(product.variants);
            if (variants.length === 0) continue;

            let changed = false;

            for (const item of productItems) {
                const variant = variants.find((v: any) => v.id === item.variantId);
                if (!variant) continue;

                const oldStock = typeof variant.stock === 'number' ? variant.stock : 99;
                const newStock = oldStock + item.quantity;

                result.details.push({
                    productId,
                    variantId: item.variantId,
                    oldStock,
                    newStock,
                });

                variant.stock = newStock;
                changed = true;
            }

            if (changed) {
                await prisma.shopProduct.update({
                    where: { id: productId },
                    data: { variants: variants },
                });
                result.updated++;
            }
        } catch (err: any) {
            result.errors.push(`Error restoring ${productId}: ${err.message}`);
            result.success = false;
        }
    }

    if (result.details.length > 0) {
        console.log(`[Stock] Restored: ${result.details.map(d => `${d.variantId}: ${d.oldStock}→${d.newStock}`).join(', ')}`);
    }

    return result;
}

// ─── Extract Cart Items from Order ───────────────────────────

/**
 * Extract stock-relevant items from an order's itemsData JSON.
 * Compatible with both ecommerceOrder and Order models.
 */
export function extractCartItemsForStock(itemsData: any): CartItemForStock[] {
    let items: any[] = [];
    try {
        items = typeof itemsData === 'string' ? JSON.parse(itemsData) : (itemsData || []);
    } catch {
        return [];
    }

    return items
        .filter((item: any) => (item.productId || item.pid) && (item.variantId || item.option))
        .map((item: any) => ({
            productId: item.productId || item.pid || '',
            variantId: item.variantId || item.option || '',
            name: item.name || '',
            quantity: item.quantity || item.qty || 1,
        }));
}

// ─── Low Stock Check ─────────────────────────────────────────

/**
 * Get all products with variants that have low stock.
 * 
 * @param shopId - Shop to check
 * @param threshold - Stock level to consider "low" (default: 5)
 */
export async function getLowStockItems(shopId: string, threshold: number = 5): Promise<LowStockItem[]> {
    const products = await prisma.shopProduct.findMany({
        where: { shopId, isActive: true },
        select: { id: true, name: true, variants: true, images: true },
    });

    const lowStock: LowStockItem[] = [];

    for (const product of products) {
        const variants = parseVariants(product.variants);
        const images = parseVariants(product.images); // images is also JSON

        for (const variant of variants) {
            const stock = typeof variant.stock === 'number' ? variant.stock : 99;
            if (stock <= threshold) {
                lowStock.push({
                    productId: product.id,
                    productName: product.name,
                    variantId: variant.id,
                    variantName: variant.name || variant.id,
                    stock,
                    image: variant.image || (Array.isArray(images) && images.length > 0 ? images[0] : undefined),
                });
            }
        }
    }

    // Sort by stock ascending (most critical first)
    lowStock.sort((a, b) => a.stock - b.stock);

    return lowStock;
}
