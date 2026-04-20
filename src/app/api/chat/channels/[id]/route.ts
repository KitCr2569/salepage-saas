// ═══════════════════════════════════════════════════════════════
// DELETE /api/channels/[id] — Disconnect a channel
// PATCH  /api/channels/[id] — Update channel config
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH — Update channel config (e.g. new tokens)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return errorResponse('ไม่ได้เข้าสู่ระบบ', 401);

        const { id } = await context.params;
        const body = await request.json();

        const channel = await prisma.channel.findUnique({ where: { id } });
        if (!channel) return errorResponse('ไม่พบช่องทาง', 404);

        const updated = await prisma.channel.update({
            where: { id },
            data: {
                ...(body.name && { name: body.name }),
                ...(body.config && { config: body.config }),
                ...(body.isActive !== undefined && { isActive: body.isActive }),
            },
        });

        logger.info('Channels', `Updated channel ${id}: ${updated.name}`);
        return successResponse(updated);
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * DELETE — Disconnect (deactivate) a channel
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return errorResponse('ไม่ได้เข้าสู่ระบบ', 401);

        const { id } = await context.params;

        const channel = await prisma.channel.findUnique({ where: { id } });
        if (!channel) return errorResponse('ไม่พบช่องทาง', 404);

        // Soft delete — just deactivate
        await prisma.channel.update({
            where: { id },
            data: { isActive: false, config: {} },
        });

        logger.info('Channels', `Disconnected channel ${id}: ${channel.name}`);
        return successResponse({ disconnected: true });
    } catch (error) {
        return handleApiError(error);
    }
}
