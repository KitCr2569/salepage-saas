// ═══════════════════════════════════════════════════════════════
// JWT Verification — Edge-compatible (no bcryptjs dependency)
// Used by middleware which runs in Edge Runtime
// ═══════════════════════════════════════════════════════════════

import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || 'default-secret-change-in-production'
);

const JWT_ISSUER = 'unified-chat-dashboard';

export interface JWTPayload {
    sub: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'AGENT';
}

/**
 * Verify and decode a JWT token (Edge-compatible)
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET, {
            issuer: JWT_ISSUER,
        });
        return payload as unknown as JWTPayload;
    } catch {
        return null;
    }
}
