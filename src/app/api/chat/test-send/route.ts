import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/chat/test-send — Validate FB token (and optionally send test message)
export async function GET(request: NextRequest) {
    try {
        // Get channel token from DB first, fall back to env
        let pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN || '';
        let recipientId = '';

        try {
            const channel = await prisma.channel.findFirst({
                where: { type: 'MESSENGER', isActive: true },
            });
            const config = channel?.config as Record<string, unknown> | null;
            if (config?.pageAccessToken) {
                pageAccessToken = config.pageAccessToken as string;
            }

            // Try to find a real contact to send to
            const contact = await prisma.contact.findFirst({
                where: {
                    channel: { type: 'MESSENGER' },
                    platformContactId: { not: { startsWith: 'mock_' } },
                },
                orderBy: { createdAt: 'desc' },
            });
            if (contact) {
                recipientId = contact.platformContactId;
            }
        } catch (e) {
            return errorResponse(`DB Error: ${e instanceof Error ? e.message : 'unknown'}`, 500);
        }

        if (!pageAccessToken) {
            return errorResponse('No pageAccessToken configured', 400);
        }

        // Always validate token via /me (never spam contacts)
        const meRes = await fetch(
            `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${pageAccessToken}`
        );
        const meData = await meRes.json();

        return successResponse({
            fbStatus: meRes.status,
            fbOk: meRes.ok && !meData.error,
            fbResponse: meData,
            tokenPrefix: pageAccessToken.substring(0, 10) + '...',
            recipientId: null,
            testMessage: null,
            note: 'Token validated via /me',
        });
    } catch (error) {
        return handleApiError(error);
    }
}
