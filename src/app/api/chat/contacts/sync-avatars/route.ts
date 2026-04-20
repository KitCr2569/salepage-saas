// ═══════════════════════════════════════════════════════════════
// POST /api/chat/contacts/sync-avatars
// Sync รูปโปรไฟล์จาก Facebook Graph API สำหรับ contacts ที่ไม่มีรูป
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { getFacebookPageConfig } from '@/lib/facebook';


export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return errorResponse('ไม่ได้เข้าสู่ระบบ', 401);

        // ดึง contacts ที่ยังไม่มีรูปและเป็น Messenger/Instagram
        const contactsWithoutAvatar = await prisma.contact.findMany({
            where: {
                avatarUrl: null,
                channel: { type: { in: ['MESSENGER', 'INSTAGRAM'] } },
                NOT: { platformContactId: { startsWith: 'mock' } },
            },
            include: { channel: { select: { config: true, type: true } } },
            take: 20, // batch 20 คน
        });

        if (contactsWithoutAvatar.length === 0) {
            return successResponse({ synced: 0, message: 'ไม่มี contact ที่ต้องซิงค์' });
        }

        let synced = 0;

        for (const contact of contactsWithoutAvatar) {
            try {
                const config = contact.channel.config as Record<string, unknown> | null;
                const { pageAccessToken: fallbackToken } = await getFacebookPageConfig();
                const pageAccessToken = (config?.pageAccessToken as string) || fallbackToken;
                if (!pageAccessToken) continue;

                const res = await fetch(
                    `https://graph.facebook.com/v19.0/${contact.platformContactId}?fields=first_name,last_name,profile_pic&access_token=${pageAccessToken}`
                );

                if (!res.ok) continue;

                const profile = await res.json() as Record<string, string>;
                const avatarUrl = profile.profile_pic || null;
                const firstName = profile.first_name || '';
                const lastName = profile.last_name || '';
                const displayName = `${firstName} ${lastName}`.trim();

                if (avatarUrl || displayName) {
                    const updateData: Record<string, string> = {};
                    if (avatarUrl) updateData.avatarUrl = avatarUrl;
                    if (displayName && displayName !== contact.displayName) updateData.displayName = displayName;

                    await prisma.contact.update({
                        where: { id: contact.id },
                        data: updateData,
                    });
                    synced++;
                    logger.info('SyncAvatars', `✅ Synced ${displayName || contact.platformContactId}`);
                }
            } catch {
                // skip this contact
            }
        }

        return successResponse({
            synced,
            total: contactsWithoutAvatar.length,
            message: `ซิงค์รูปโปรไฟล์สำเร็จ ${synced}/${contactsWithoutAvatar.length} คน`,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
