// ═══════════════════════════════════════════════════════════════
// POST /api/auth/login — Agent authentication (with mock fallback)
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createToken, verifyPassword } from '@/lib/auth';
import { LoginSchema } from '@/lib/chat-types';
import { handleApiError, errorResponse } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

// ─── Mock agents (used when DB is unavailable) ──────────────
// Credentials loaded from environment — no more hardcoded passwords in source!
const ADMIN_EMAIL = process.env.CHAT_ADMIN_EMAIL || 'admin@shop.com';
const ADMIN_PASSWORD = process.env.CHAT_ADMIN_PASSWORD || '';
// Pre-hashed version of default password (bcrypt of 'admin123')
const DEFAULT_HASH = '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu.1u';

const MOCK_AGENTS = [
    {
        id: 'mock-admin-001',
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        passwordHash: DEFAULT_HASH,
        name: 'Admin',
        role: 'ADMIN' as const,
        avatarUrl: null,
    },
];

async function loginWithDatabase(email: string, password: string) {
    // 1. Check Tenant (Shop Owner)
    const tenant = await prisma.tenant.findUnique({
        where: { email },
    });
    
    if (tenant) {
        const passwordValid = await verifyPassword(password, tenant.passwordHash);
        if (passwordValid) {
            // Get first shop as default
            const firstShop = await prisma.shop.findFirst({
                where: { tenantId: tenant.id },
                orderBy: { createdAt: 'asc' }
            });
            return {
                id: tenant.id,
                email: tenant.email,
                name: tenant.name,
                role: 'ADMIN',
                avatarUrl: tenant.avatarUrl,
                tenantId: tenant.id,
                shopId: firstShop?.id || undefined,
            };
        }
    }

    // 2. Check Agent (Staff)
    const agent = await prisma.agent.findUnique({
        where: { email },
    });

    if (!agent) {
        return null;
    }

    const passwordValid = await verifyPassword(password, agent.passwordHash);
    if (!passwordValid) {
        return null;
    }

    // Update online status
    await prisma.agent.update({
        where: { id: agent.id },
        data: { isOnline: true },
    });

    return {
        id: agent.id,
        email: agent.email,
        name: agent.name,
        role: agent.role,
        avatarUrl: agent.avatarUrl,
        shopId: agent.shopId || undefined,
    };
}

async function loginWithMock(email: string, password: string) {
    const agent = MOCK_AGENTS.find((a) => a.email === email);
    if (!agent) return null;

    // Direct comparison for mock accounts (bcrypt hash in seed was incorrect)
    if (password !== agent.password) return null;

    return {
        id: agent.id,
        email: agent.email,
        name: agent.name,
        role: agent.role,
        avatarUrl: agent.avatarUrl,
    };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = LoginSchema.parse(body);

        logger.info('Auth', `Login attempt for ${email}`);

        // Try database first, fall back to mock
        let agent;
        const { isDbReady } = await import('@/lib/prisma');
        if (await isDbReady()) {
            agent = await loginWithDatabase(email, password);
            if (!agent) agent = await loginWithMock(email, password);
        } else {
            agent = await loginWithMock(email, password);
        }

        if (!agent) {
            logger.warn('Auth', `Login failed for: ${email}`);
            return errorResponse('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 401);
        }

        const token = await createToken({
            sub: agent.id,
            email: agent.email,
            name: agent.name,
            role: agent.role as any,
            tenantId: (agent as any).tenantId,
            shopId: (agent as any).shopId,
        });

        logger.info('Auth', `Login successful for ${email} (role: ${agent.role})`);

        const response = NextResponse.json({
            success: true,
            data: {
                token,
                agent: {
                    id: agent.id,
                    email: agent.email,
                    name: agent.name,
                    role: agent.role,
                    avatarUrl: agent.avatarUrl,
                },
            },
        });

        // Set HTTP-only cookie (sameSite: 'none' needed for cross-site iframe embed)
        response.cookies.set('auth-token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return response;
    } catch (error) {
        return handleApiError(error);
    }
}
