// ═══════════════════════════════════════════════════════════════
// In-memory Rate Limiter — IP-based, sliding window
// Lightweight alternative to Redis for serverless/edge functions
// ═══════════════════════════════════════════════════════════════

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Auto-cleanup every 5 minutes to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (now > entry.resetAt) store.delete(key);
    }
}, 5 * 60 * 1000);

/**
 * Check if a request is rate-limited.
 * 
 * @param identifier - Unique key (usually IP or IP+path)
 * @param maxRequests - Max requests in the window
 * @param windowMs - Time window in milliseconds (default: 60s)
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
    identifier: string,
    maxRequests: number = 10,
    windowMs: number = 60_000
): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const existing = store.get(identifier);

    if (!existing || now > existing.resetAt) {
        // New window
        store.set(identifier, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
    }

    if (existing.count >= maxRequests) {
        return { allowed: false, remaining: 0, resetAt: existing.resetAt };
    }

    existing.count++;
    return { allowed: true, remaining: maxRequests - existing.count, resetAt: existing.resetAt };
}

/**
 * Get client IP from a request (supports proxies).
 */
export function getClientIP(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    const realIP = request.headers.get('x-real-ip');
    if (realIP) return realIP;
    return '127.0.0.1';
}
