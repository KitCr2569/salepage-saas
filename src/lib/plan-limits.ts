// ═══════════════════════════════════════════════════════════════
// Plan Limit Enforcement — Central utility for checking
// product limits, shop limits, feature access, and subscription
// expiry across the SaaS platform.
// ═══════════════════════════════════════════════════════════════

import { prisma } from '@/lib/prisma';

// ─── Types ───────────────────────────────────────────────────

export interface LimitCheckResult {
    allowed: boolean;
    current: number;
    max: number;
    planName: string;
    planSlug: string;
    remaining: number;
    /** true when subscription is expired or missing */
    expired: boolean;
}

export interface FeatureCheckResult {
    allowed: boolean;
    planName: string;
    planSlug: string;
    /** The cheapest plan slug that includes this feature */
    requiredPlan: string | null;
    expired: boolean;
}

export interface UsageInfo {
    planName: string;
    planSlug: string;
    planPrice: number;
    status: string;
    expired: boolean;
    endDate: Date | null;
    shops: { current: number; max: number; remaining: number };
    products: { current: number; max: number; remaining: number };
    features: string[];
}

// ─── Free-tier defaults (no subscription) ────────────────────

const FREE_DEFAULTS = {
    maxProducts: 10,
    maxShops: 1,
    features: ['basic_store', 'manual_orders'],
    planName: 'ฟรี',
    planSlug: 'free',
};

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Get the tenantId from a shopId.
 * Returns null if shop has no tenant (legacy/standalone).
 */
async function getTenantIdFromShop(shopId: string): Promise<string | null> {
    const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        select: { tenantId: true },
    });
    return shop?.tenantId ?? null;
}

/**
 * Get subscription + plan for a tenant.
 * Returns null if no active subscription.
 */
async function getSubscriptionWithPlan(tenantId: string) {
    return prisma.subscription.findUnique({
        where: { tenantId },
        include: { plan: true },
    });
}

/**
 * Check if a subscription is expired.
 */
function isExpired(endDate: Date | null | undefined): boolean {
    if (!endDate) return false;
    return new Date() > new Date(endDate);
}

// ─── Product Limit Check ─────────────────────────────────────

/**
 * Check if a shop can add more products based on its tenant's plan.
 * 
 * @param shopId - The shop trying to add a product
 * @returns LimitCheckResult with allowed=true if within limits
 */
export async function checkProductLimit(shopId: string): Promise<LimitCheckResult> {
    const tenantId = await getTenantIdFromShop(shopId);

    // No tenant → no limits (legacy mode)
    if (!tenantId) {
        return {
            allowed: true,
            current: 0,
            max: 99999,
            planName: 'Legacy',
            planSlug: 'legacy',
            remaining: 99999,
            expired: false,
        };
    }

    const sub = await getSubscriptionWithPlan(tenantId);
    const expired = !sub || isExpired(sub.endDate);
    const plan = sub?.plan;

    const maxProducts = expired ? FREE_DEFAULTS.maxProducts : (plan?.maxProducts ?? FREE_DEFAULTS.maxProducts);
    const planName = expired ? FREE_DEFAULTS.planName : (plan?.name ?? FREE_DEFAULTS.planName);
    const planSlug = expired ? FREE_DEFAULTS.planSlug : (plan?.slug ?? FREE_DEFAULTS.planSlug);

    // Count products across ALL shops of this tenant
    const shops = await prisma.shop.findMany({
        where: { tenantId },
        select: { id: true },
    });
    const shopIds = shops.map((s: { id: string }) => s.id);

    const currentCount = await prisma.shopProduct.count({
        where: { shopId: { in: shopIds } },
    });

    return {
        allowed: currentCount < maxProducts,
        current: currentCount,
        max: maxProducts,
        planName,
        planSlug,
        remaining: Math.max(0, maxProducts - currentCount),
        expired,
    };
}

// ─── Shop Limit Check ────────────────────────────────────────

/**
 * Check if a tenant can create more shops.
 * 
 * @param tenantId - The tenant trying to create a shop
 * @returns LimitCheckResult
 */
export async function checkShopLimit(tenantId: string): Promise<LimitCheckResult> {
    const sub = await getSubscriptionWithPlan(tenantId);
    const expired = !sub || isExpired(sub.endDate);
    const plan = sub?.plan;

    const maxShops = expired ? FREE_DEFAULTS.maxShops : (plan?.maxShops ?? FREE_DEFAULTS.maxShops);
    const planName = expired ? FREE_DEFAULTS.planName : (plan?.name ?? FREE_DEFAULTS.planName);
    const planSlug = expired ? FREE_DEFAULTS.planSlug : (plan?.slug ?? FREE_DEFAULTS.planSlug);

    const currentCount = await prisma.shop.count({ where: { tenantId } });

    return {
        allowed: currentCount < maxShops,
        current: currentCount,
        max: maxShops,
        planName,
        planSlug,
        remaining: Math.max(0, maxShops - currentCount),
        expired,
    };
}

// ─── Feature Access Check ────────────────────────────────────

/**
 * Check if a tenant has access to a specific feature.
 * Feature strings match the plan's `features` JSON array.
 * 
 * Known features:
 *   basic_store, manual_orders, analytics, custom_theme,
 *   chatbot, broadcast, facebook_tools, tiktok,
 *   priority_support, api_access
 */
export async function checkFeatureAccess(
    tenantId: string,
    feature: string
): Promise<FeatureCheckResult> {
    const sub = await getSubscriptionWithPlan(tenantId);
    const expired = !sub || isExpired(sub.endDate);
    const plan = sub?.plan;

    const planName = expired ? FREE_DEFAULTS.planName : (plan?.name ?? FREE_DEFAULTS.planName);
    const planSlug = expired ? FREE_DEFAULTS.planSlug : (plan?.slug ?? FREE_DEFAULTS.planSlug);

    // Parse features from plan
    let features: string[] = FREE_DEFAULTS.features;
    if (!expired && plan) {
        try {
            const parsed = typeof plan.features === 'string'
                ? JSON.parse(plan.features)
                : plan.features;
            if (Array.isArray(parsed)) features = parsed;
        } catch {
            // fallback to defaults
        }
    }

    const allowed = features.includes(feature);

    // Find cheapest plan that includes this feature
    let requiredPlan: string | null = null;
    if (!allowed) {
        const plans = await prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
        for (const p of plans) {
            try {
                const pFeatures = typeof p.features === 'string'
                    ? JSON.parse(p.features)
                    : p.features;
                if (Array.isArray(pFeatures) && pFeatures.includes(feature)) {
                    requiredPlan = p.slug;
                    break;
                }
            } catch { /* skip */ }
        }
    }

    return {
        allowed,
        planName,
        planSlug,
        requiredPlan,
        expired,
    };
}

// ─── Feature Access Check (from shopId) ──────────────────────

/**
 * Convenience wrapper: check feature access using shopId instead of tenantId.
 */
export async function checkFeatureAccessByShop(
    shopId: string,
    feature: string
): Promise<FeatureCheckResult> {
    const tenantId = await getTenantIdFromShop(shopId);
    if (!tenantId) {
        // Legacy mode — allow all
        return {
            allowed: true,
            planName: 'Legacy',
            planSlug: 'legacy',
            requiredPlan: null,
            expired: false,
        };
    }
    return checkFeatureAccess(tenantId, feature);
}

// ─── Full Usage Info ─────────────────────────────────────────

/**
 * Get comprehensive usage information for a tenant.
 * Used by admin dashboard to display usage bars.
 */
export async function getUsageInfo(tenantId: string): Promise<UsageInfo> {
    const sub = await getSubscriptionWithPlan(tenantId);
    const expired = !sub || isExpired(sub.endDate);
    const plan = sub?.plan;

    const planName = expired ? FREE_DEFAULTS.planName : (plan?.name ?? FREE_DEFAULTS.planName);
    const planSlug = expired ? FREE_DEFAULTS.planSlug : (plan?.slug ?? FREE_DEFAULTS.planSlug);
    const planPrice = expired ? 0 : Number(plan?.price ?? 0);
    const maxProducts = expired ? FREE_DEFAULTS.maxProducts : (plan?.maxProducts ?? FREE_DEFAULTS.maxProducts);
    const maxShops = expired ? FREE_DEFAULTS.maxShops : (plan?.maxShops ?? FREE_DEFAULTS.maxShops);

    // Parse features
    let features: string[] = FREE_DEFAULTS.features;
    if (!expired && plan) {
        try {
            const parsed = typeof plan.features === 'string'
                ? JSON.parse(plan.features)
                : plan.features;
            if (Array.isArray(parsed)) features = parsed;
        } catch { /* fallback */ }
    }

    // Count shops
    const shopCount = await prisma.shop.count({ where: { tenantId } });

    // Count products across all shops
    const shops = await prisma.shop.findMany({
        where: { tenantId },
        select: { id: true },
    });
    const productCount = await prisma.shopProduct.count({
        where: { shopId: { in: shops.map((s: { id: string }) => s.id) } },
    });

    return {
        planName,
        planSlug,
        planPrice,
        status: expired ? 'EXPIRED' : (sub?.status ?? 'NONE'),
        expired,
        endDate: sub?.endDate ?? null,
        shops: {
            current: shopCount,
            max: maxShops,
            remaining: Math.max(0, maxShops - shopCount),
        },
        products: {
            current: productCount,
            max: maxProducts,
            remaining: Math.max(0, maxProducts - productCount),
        },
        features,
    };
}
