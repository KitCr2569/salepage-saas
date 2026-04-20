// ═══════════════════════════════════════════════════════════════
// GET/POST /api/channels — List & Connect channels
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

/**
 * GET — List all connected channels
 */
export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return errorResponse('ไม่ได้เข้าสู่ระบบ', 401);

        const channels = await prisma.channel.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                type: true,
                name: true,
                config: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: { conversations: true, contacts: true },
                },
            },
        });

        // Mask sensitive tokens in config
        const masked = channels.map((ch: typeof channels[number]) => {
            const config = ch.config as Record<string, unknown>;
            const safeConfig: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(config)) {
                if (typeof value === 'string' && (key.toLowerCase().includes('token') || key.toLowerCase().includes('secret'))) {
                    safeConfig[key] = value.length > 8
                        ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
                        : '••••••••';
                } else {
                    safeConfig[key] = value;
                }
            }
            return { ...ch, config: safeConfig };
        });

        return successResponse(masked);
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * POST — Connect a new channel (e.g. Facebook Page via OAuth)
 */
export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return errorResponse('ไม่ได้เข้าสู่ระบบ', 401);
        const body = await request.json();

        const { type, name, config } = body as {
            type: string;
            name: string;
            config: Record<string, unknown>;
        };

        if (!type || !name || !config) {
            return errorResponse('กรุณาระบุ type, name, และ config', 400);
        }

        const validTypes = ['MESSENGER', 'INSTAGRAM', 'LINE', 'WHATSAPP', 'ZALO'];
        if (!validTypes.includes(type)) {
            return errorResponse(`ประเภทช่องทางไม่ถูกต้อง: ${type}`, 400);
        }

        // For Messenger/Instagram: check if a channel of same type with same pageId already exists
        const pageId = config.pageId as string | undefined;
        if (pageId && (type === 'MESSENGER' || type === 'INSTAGRAM')) {
            const existing = await prisma.channel.findFirst({
                where: {
                    type: type as 'MESSENGER' | 'INSTAGRAM',
                    isActive: true,
                },
            });

            if (existing) {
                // Update existing channel with new tokens
                const updated = await prisma.channel.update({
                    where: { id: existing.id },
                    data: {
                        name,
                        config: config as object,
                        isActive: true,
                    },
                });

                logger.info('Channels', `Updated existing ${type} channel: ${name}`);
                return successResponse(updated);
            }
        }

        // Create new channel
        const channel = await prisma.channel.create({
            data: {
                type: type as 'MESSENGER' | 'INSTAGRAM' | 'LINE' | 'WHATSAPP' | 'ZALO',
                name,
                config: config as object,
                isActive: true,
            },
        });

        logger.info('Channels', `Connected new ${type} channel: ${name}`);
        return successResponse(channel, 201);
    } catch (error) {
        return handleApiError(error);
    }
}
