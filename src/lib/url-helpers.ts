// ─── Shared URL helpers for SaaS multi-tenant ────────────────
// All API routes should use these helpers instead of hardcoding hdgwrapskin.com

/**
 * Returns the base URL for the shop (e.g. "https://www.hdgwrapskin.com")
 * Priority: VERCEL_URL > NEXT_PUBLIC_APP_URL > fallback
 */
export function getShopBaseUrl(): string {
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }
    return (process.env.NEXT_PUBLIC_APP_URL || 'https://www.hdgwrapskin.com').replace(/\/$/, '');
}

/**
 * Build a tracking URL for an order
 */
export function getOrderUrl(orderNumber: string, psid?: string): string {
    const base = getShopBaseUrl();
    const url = `${base}/order/${orderNumber}`;
    return psid ? `${url}?psid=${psid}` : url;
}

/**
 * Build a checkout URL with cart data
 */
export function getCheckoutUrl(cartJson: string): string {
    return `${getShopBaseUrl()}/checkout?cart=${encodeURIComponent(cartJson)}`;
}

/**
 * Build an admin URL with hash
 */
export function getAdminUrl(hash: string): string {
    return `${getShopBaseUrl()}/admin#${hash}`;
}

/**
 * Build a payment link URL
 */
export function getPaymentUrl(orderNumber: string): string {
    return `${getShopBaseUrl()}/pay/${orderNumber}`;
}
