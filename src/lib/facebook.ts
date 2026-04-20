import { prisma } from '@/lib/prisma';

export async function getFacebookPageConfig(request?: Request) {
    const headerPageToken = request?.headers.get('x-page-token') || request?.headers.get('x-fb-token');
    const headerPageId = request?.headers.get('x-page-id');
 
    // PAGECLAW override has highest priority if it exists in env
    const pageclawToken = process.env.PAGECLAW_PAGE_TOKEN;
    const pageclawId = process.env.PAGECLAW_PAGE_ID;

    let pageAccessToken = pageclawToken || headerPageToken || process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN;
    let pageId = pageclawId || headerPageId || process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID || process.env.FACEBOOK_PAGE_ID;
 
    try {
        const { prisma } = await import('@/lib/prisma');
        const allChannels = await prisma.channel.findMany({
            where: { type: 'MESSENGER', isActive: true },
            orderBy: { updatedAt: 'desc' }
        });
 
        // 1. If we have a pageId, find that specific channel
        let matchedChannel = pageId ? allChannels.find(c => (c.config as any)?.pageId === pageId) : null;
        
        // 2. If no match by ID but we have a token, find by token
        if (!matchedChannel && pageAccessToken) {
            matchedChannel = allChannels.find(c => (c.config as any)?.pageAccessToken === pageAccessToken);
        }
 
        // 3. Fallback to latest channel
        const messengerChannel = matchedChannel || allChannels[0];
 
        if (messengerChannel && messengerChannel.config) {
            const config = messengerChannel.config as Record<string, any>;
            // ⚡ Header tokens ALWAYS take priority — they come from a fresh Facebook login
            // ⚡ PAGECLAW overrides always win. Then header tokens. Then DB fallback.
            if (config.pageAccessToken && !headerPageToken && !pageclawToken) pageAccessToken = config.pageAccessToken;
            if (config.pageId && !headerPageId && !pageclawId) pageId = config.pageId;
        }

        // 🔄 Auto-heal: if header provided a fresh token, update DB to keep it in sync
        if (headerPageToken && headerPageId) {
            try {
                const existingChannel = allChannels.find(c => (c.config as any)?.pageId === headerPageId);
                if (existingChannel) {
                    const currentConfig = existingChannel.config as Record<string, any>;
                    if (currentConfig.pageAccessToken !== headerPageToken) {
                        await prisma.channel.update({
                            where: { id: existingChannel.id },
                            data: {
                                config: {
                                    ...currentConfig,
                                    pageAccessToken: headerPageToken,
                                    tokenUpdatedAt: new Date().toISOString(),
                                },
                            },
                        });
                        console.log(`[FB Config] Auto-synced page token to DB for page ${headerPageId}`);
                    }
                }
            } catch (syncErr) {
                console.warn('[FB Config] Auto-sync token to DB failed:', syncErr);
            }
        }
    } catch (err) {
        console.error("Failed to load FB token from DB:", err);
    }
 
    return { pageAccessToken, pageId };
}
