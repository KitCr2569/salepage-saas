// ═══════════════════════════════════════════════════════════════
// Tenant Resolution — Multi-tenant shop lookup
// ═══════════════════════════════════════════════════════════════
//
// Central function to resolve which Shop a request belongs to.
// All API routes should use this instead of prisma.shop.findFirst()
//
// Resolution order:
//   1. x-shop-id header (explicit)
//   2. JWT token → tenantId → shop
//   3. Fallback → oldest shop (backward compatible with single-tenant)

import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import type { Shop } from '@prisma/client';

// ─── Types ───────────────────────────────────────────────────

export interface TenantContext {
    shop: Shop;
    shopId: string;
    tenantId: string | null;
}

// ─── Cache ───────────────────────────────────────────────────

// In-memory cache to avoid repeated DB hits within the same request cycle
let _fallbackShop: Shop | null = null;
let _fallbackCacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

// ─── Main Resolution Function ────────────────────────────────

/**
 * Resolve the shop for a given request.
 * This is the ONLY function routes should use to get the current shop.
 */
export async function getShopFromRequest(request: Request): Promise<TenantContext> {
    // 1. Explicit header: x-shop-id
    const headerShopId = request.headers.get('x-shop-id');
    if (headerShopId) {
        const shop = await prisma.shop.findUnique({ where: { id: headerShopId } });
        if (shop) {
            return { shop, shopId: shop.id, tenantId: shop.tenantId };
        }
    }

    // 2. JWT token → get tenantId → find their shop
    const auth = await getAuthFromRequest(request);
    if (auth && (auth as any).shopId) {
        const shop = await prisma.shop.findUnique({ where: { id: (auth as any).shopId } });
        if (shop) {
            return { shop, shopId: shop.id, tenantId: shop.tenantId };
        }
    }
    if (auth && (auth as any).tenantId) {
        const shop = await prisma.shop.findFirst({
            where: { tenantId: (auth as any).tenantId },
            orderBy: { createdAt: 'asc' },
        });
        if (shop) {
            return { shop, shopId: shop.id, tenantId: shop.tenantId };
        }
    }

    // 3. Fallback → oldest shop (backward compatible)
    return getFallbackShop();
}

/**
 * Get shop by its slug (for public-facing pages like /shop/[slug])
 */
export async function getShopBySlug(slug: string): Promise<TenantContext | null> {
    const shop = await prisma.shop.findUnique({ where: { slug } });
    if (!shop) return null;
    return { shop, shopId: shop.id, tenantId: shop.tenantId };
}

/**
 * Get shop by its pageId (for Facebook webhook routing)
 */
export async function getShopByPageId(pageId: string): Promise<TenantContext | null> {
    const shop = await prisma.shop.findUnique({ where: { pageId } });
    if (!shop) return null;
    return { shop, shopId: shop.id, tenantId: shop.tenantId };
}

/**
 * Get shop by ID directly
 */
export async function getShopById(shopId: string): Promise<TenantContext | null> {
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) return null;
    return { shop, shopId: shop.id, tenantId: shop.tenantId };
}

// ─── Fallback (backward compatibility) ───────────────────────

/**
 * Returns the oldest shop as fallback.
 * This ensures existing single-tenant deployments keep working.
 * Also auto-creates a default shop if none exists.
 */
async function getFallbackShop(): Promise<TenantContext> {
    const now = Date.now();
    if (_fallbackShop && (now - _fallbackCacheTime) < CACHE_TTL) {
        return { shop: _fallbackShop, shopId: _fallbackShop.id, tenantId: _fallbackShop.tenantId };
    }

    let shop = await prisma.shop.findFirst({
        orderBy: { createdAt: 'asc' },
    });

    if (!shop) {
        shop = await prisma.shop.create({
            data: {
                slug: process.env.NEXT_PUBLIC_SHOP_SLUG || 'default',
                pageId: process.env.FACEBOOK_PAGE_ID || '',
                domain: null,
                name: process.env.NEXT_PUBLIC_SHOP_NAME || 'Shop',
                currencySymbol: '฿',
            },
        });
    }

    _fallbackShop = shop;
    _fallbackCacheTime = now;

    return { shop, shopId: shop.id, tenantId: shop.tenantId };
}

/**
 * Clear the fallback cache (call after shop updates)
 */
export function clearShopCache() {
    _fallbackShop = null;
    _fallbackCacheTime = 0;
}
