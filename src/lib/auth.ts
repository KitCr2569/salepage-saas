// ═══════════════════════════════════════════════════════════════
// Auth Library — JWT-based authentication with jose
// ═══════════════════════════════════════════════════════════════

import { SignJWT, jwtVerify } from 'jose';
import { compare, hash } from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
);
if (!process.env.JWT_SECRET && !process.env.NEXTAUTH_SECRET) {
    console.error('❌ CRITICAL: No JWT_SECRET configured!');
}

const JWT_ISSUER = 'unified-chat-dashboard';
const JWT_EXPIRATION = '7d';

export interface JWTPayload {
    sub: string;       // agent id
    email: string;
    name: string;
    role: 'ADMIN' | 'AGENT';
}

/**
 * Create a JWT token for an authenticated agent
 */
export async function createToken(payload: JWTPayload): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer(JWT_ISSUER)
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRATION)
        .sign(JWT_SECRET);
}

/**
 * Verify and decode a JWT token
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

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
    return hash(password, 10);
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return compare(password, hashedPassword);
}

/**
 * Extract token from request headers
 */
export function extractTokenFromHeaders(headers: Headers): string | null {
    const authHeader = headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    // Also check cookie
    const cookies = headers.get('cookie') || '';
    const tokenCookie = cookies
        .split(';')
        .find((c) => c.trim().startsWith('auth-token='));

    if (tokenCookie) {
        return tokenCookie.split('=')[1]?.trim() || null;
    }

    return null;
}

/**
 * Get authenticated agent from request
 */
export async function getAuthFromRequest(request: Request): Promise<JWTPayload | null> {
    const token = extractTokenFromHeaders(request.headers);
    if (!token) return null;
    return verifyToken(token);
}
