// ═══════════════════════════════════════════════════════════════
// Mock Channel Adapters — Replaces @unified-chat/adapters package
// Provides basic message parsing for each channel type
// ═══════════════════════════════════════════════════════════════

interface InboundMessage {
    platformMessageId: string;
    platformContactId: string;
    contactDisplayName?: string;
    contactAvatarUrl?: string;
    type: 'TEXT' | 'IMAGE' | 'FILE';
    content?: string;
    imageUrl?: string;
    timestamp: Date;
    rawPayload?: Record<string, unknown>;
}

// Echo message — ข้อความที่เพจส่งออกไป (ตอบลูกค้าผ่าน Facebook Inbox)
export interface EchoMessage {
    platformMessageId: string;
    recipientId: string;        // ลูกค้าที่เพจตอบ
    type: 'TEXT' | 'IMAGE' | 'FILE';
    content?: string;
    imageUrl?: string;
    timestamp: Date;
    appId?: string;             // App ID ที่ส่ง (เพื่อกรอง bot vs มนุษย์)
    rawPayload?: Record<string, unknown>;
}

interface ChannelAdapter {
    parseInboundMessages(body: unknown): InboundMessage[];
    parseEchoMessages?(body: unknown): EchoMessage[];
    verifyWebhook(params: Record<string, unknown>): { valid: boolean; challenge?: string };
    sendMessage(params: { recipientPlatformId: string; type: string; content: string; imageUrl?: string; tag?: string }): Promise<{ success: boolean; platformMessageId?: string; error?: string }>;
}

// ─── Messenger/Instagram Adapter ─────────────────────────────

function createMetaAdapter(config?: Record<string, unknown> | null): ChannelAdapter {
    return {
        parseInboundMessages(body: unknown): InboundMessage[] {
            const messages: InboundMessage[] = [];
            const payload = body as {
                object?: string;
                entry?: Array<{
                    id?: string;
                    messaging?: Array<Record<string, unknown>>;
                    changes?: Array<Record<string, unknown>>;
                }>;
            };

            // Page ID from config or env for filtering echo messages
            const pageId = (config?.pageId as string) || process.env.FACEBOOK_PAGE_ID || '';

            for (const entry of payload.entry || []) {
                // Messenger format
                for (const event of entry.messaging || []) {
                    const sender = event.sender as { id: string } | undefined;
                    const message = event.message as {
                        mid?: string;
                        text?: string;
                        is_echo?: boolean;
                        attachments?: Array<{ type: string; payload: { url: string } }>;
                    } | undefined;

                    if (!sender || !message) continue;

                    // Skip echo messages (messages sent BY the page)
                    if (message.is_echo) continue;

                    // Skip if sender is the page itself
                    if (pageId && sender.id === pageId) continue;

                    const isImage = message.attachments?.some(a => a.type === 'image');
                    messages.push({
                        platformMessageId: message.mid || `msg-${Date.now()}`,
                        platformContactId: sender.id,
                        type: isImage ? 'IMAGE' : 'TEXT',
                        content: message.text || '',
                        imageUrl: isImage ? message.attachments?.[0]?.payload?.url : undefined,
                        timestamp: new Date(event.timestamp as number || Date.now()),
                        rawPayload: event as Record<string, unknown>,
                    });
                }

                // Instagram format (changes array)
                for (const change of entry.changes || []) {
                    const value = change.value as Record<string, unknown> | undefined;
                    if (value?.message) {
                        const msg = value.message as Record<string, string>;
                        const senderId = (value.sender as { id: string })?.id || 'unknown';

                        // Skip if sender is the page itself
                        if (pageId && senderId === pageId) continue;

                        messages.push({
                            platformMessageId: msg.mid || `ig-${Date.now()}`,
                            platformContactId: senderId,
                            type: 'TEXT',
                            content: msg.text || '',
                            timestamp: new Date(),
                            rawPayload: change as Record<string, unknown>,
                        });
                    }
                }
            }
            return messages;
        },

        // ⚡ Parse echo messages — ข้อความที่เพจส่งออก (ตอบผ่าน Facebook Inbox / ผ่าน API อื่น)
        parseEchoMessages(body: unknown): EchoMessage[] {
            const echoMessages: EchoMessage[] = [];
            const payload = body as {
                entry?: Array<{
                    messaging?: Array<Record<string, unknown>>;
                }>;
            };

            for (const entry of payload.entry || []) {
                for (const event of entry.messaging || []) {
                    const recipient = event.recipient as { id: string } | undefined;
                    const message = event.message as {
                        mid?: string;
                        text?: string;
                        is_echo?: boolean;
                        app_id?: number;
                        attachments?: Array<{ type: string; payload: { url: string } }>;
                    } | undefined;

                    if (!recipient || !message || !message.is_echo) continue;

                    const isImage = message.attachments?.some(a => a.type === 'image');
                    echoMessages.push({
                        platformMessageId: message.mid || `echo-${Date.now()}`,
                        recipientId: recipient.id,
                        type: isImage ? 'IMAGE' : 'TEXT',
                        content: message.text || '',
                        imageUrl: isImage ? message.attachments?.[0]?.payload?.url : undefined,
                        timestamp: new Date(event.timestamp as number || Date.now()),
                        appId: message.app_id ? String(message.app_id) : undefined,
                        rawPayload: event as Record<string, unknown>,
                    });
                }
            }
            return echoMessages;
        },

        verifyWebhook(params) {
            const verifyToken = (config?.verifyToken as string) || process.env.META_VERIFY_TOKEN || '';
            return {
                valid: params.mode === 'subscribe' && params.token === verifyToken,
                challenge: params.challenge as string,
            };
        },
        async sendMessage(params) {
            const pageAccessToken = (config?.pageAccessToken as string) || process.env.META_PAGE_ACCESS_TOKEN;
            if (!pageAccessToken) {
                return { success: false, error: 'No page access token configured' };
            }

            const sendToFacebook = async (messagingType: string, tag?: string) => {
                const messagePayload = {
                    recipient: { id: params.recipientPlatformId },
                    messaging_type: messagingType,
                    ...(tag ? { tag } : {}),
                    message: params.type === 'IMAGE'
                        ? { attachment: { type: 'image', payload: { url: params.imageUrl, is_reusable: true } } }
                        : { text: (params.content || '').substring(0, 2000) },
                };
                const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(messagePayload),
                });
                const data = await res.json() as Record<string, unknown>;
                return { ok: res.ok, data };
            };

            try {
                // 1st attempt: RESPONSE (requires 24-hour window)
                const msgType = params.tag ? 'MESSAGE_TAG' : 'RESPONSE';
                const tag = params.tag;
                let { ok, data } = await sendToFacebook(msgType, tag);

                // Fallback 1: if outside 24-hour window, try HUMAN_AGENT tag (7-day window)
                if (!ok) {
                    const fbError = data.error as Record<string, unknown> | undefined;
                    const errorCode = fbError?.code;
                    const errorSubcode = fbError?.error_subcode;
                    // Error 10 subcode 2018278 = outside 24hr window
                    if (errorCode === 10 || errorSubcode === 2018278 || errorSubcode === 2018109) {
                        console.log('[Meta Adapter] Outside 24hr window, trying HUMAN_AGENT tag...');
                        ({ ok, data } = await sendToFacebook('MESSAGE_TAG', 'HUMAN_AGENT'));
                    }
                }

                // Fallback 2: if HUMAN_AGENT also fails, try UPDATE (works for some apps beyond 7 days)
                if (!ok) {
                    const fbError = data.error as Record<string, unknown> | undefined;
                    const errorCode = fbError?.code;
                    if (errorCode === 10 || errorCode === 230 || errorCode === 551) {
                        console.log('[Meta Adapter] HUMAN_AGENT failed, trying UPDATE...');
                        ({ ok, data } = await sendToFacebook('UPDATE'));
                    }
                }

                if (!ok) {
                    const fbError = data.error as Record<string, unknown> | undefined;
                    const errorMsg = fbError?.message ? String(fbError.message) : `HTTP error`;
                    console.error('[Meta Adapter] Send failed:', JSON.stringify(data));
                    return { success: false, error: errorMsg, platformMessageId: undefined };
                }
                return { success: true, platformMessageId: data.message_id as string };
            } catch (err) {
                console.error('[Meta Adapter] Send error:', err);
                return { success: false, error: err instanceof Error ? err.message : 'Send failed' };
            }
        },

    };
}

// ─── LINE Adapter ────────────────────────────────────────────

function createLineAdapter(): ChannelAdapter {
    return {
        parseInboundMessages(body: unknown): InboundMessage[] {
            const messages: InboundMessage[] = [];
            const payload = body as { events?: Array<Record<string, unknown>> };

            for (const event of payload.events || []) {
                if (event.type === 'message') {
                    const source = event.source as { userId?: string };
                    const message = event.message as { id: string; type: string; text?: string };
                    messages.push({
                        platformMessageId: message.id,
                        platformContactId: source?.userId || 'unknown',
                        type: message.type === 'image' ? 'IMAGE' : 'TEXT',
                        content: message.text || '',
                        timestamp: new Date(event.timestamp as number || Date.now()),
                        rawPayload: event as Record<string, unknown>,
                    });
                }
            }
            return messages;
        },
        verifyWebhook(params) {
            // LINE uses X-Line-Signature header verification
            // For now, accept all (proper HMAC verification should be added)
            return { valid: true };
        },
        async sendMessage(params) {
            return { success: true, platformMessageId: `line-mock-${Date.now()}` };
        },
    };
}

// ─── WhatsApp Adapter ────────────────────────────────────────

function createWhatsAppAdapter(): ChannelAdapter {
    return {
        parseInboundMessages(body: unknown): InboundMessage[] {
            const messages: InboundMessage[] = [];
            const payload = body as { entry?: Array<{ changes?: Array<{ value?: { messages?: Array<Record<string, unknown>>; contacts?: Array<{ profile?: { name: string }; wa_id: string }> } }> }> };

            for (const entry of payload.entry || []) {
                for (const change of entry.changes || []) {
                    for (const msg of change.value?.messages || []) {
                        const contact = change.value?.contacts?.[0];
                        messages.push({
                            platformMessageId: msg.id as string || `wa-${Date.now()}`,
                            platformContactId: msg.from as string || 'unknown',
                            contactDisplayName: contact?.profile?.name,
                            type: msg.type === 'image' ? 'IMAGE' : 'TEXT',
                            content: (msg.text as { body?: string })?.body || '',
                            timestamp: new Date(parseInt(msg.timestamp as string || '0', 10) * 1000 || Date.now()),
                            rawPayload: msg as Record<string, unknown>,
                        });
                    }
                }
            }
            return messages;
        },
        verifyWebhook(params) {
            const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || '';
            return {
                valid: params.mode === 'subscribe' && params.token === verifyToken,
                challenge: params.challenge as string,
            };
        },
        async sendMessage(params) {
            return { success: true, platformMessageId: `wa-mock-${Date.now()}` };
        },
    };
}

// ─── Factory Functions ───────────────────────────────────────

export function getAdapter(channelType: string): ChannelAdapter {
    switch (channelType) {
        case 'MESSENGER':
        case 'INSTAGRAM':
            return createMetaAdapter();
        case 'LINE':
            return createLineAdapter();
        case 'WHATSAPP':
            return createWhatsAppAdapter();
        default:
            return createMetaAdapter(); // Fallback
    }
}

export function getAdapterWithConfig(channelType: string, config: Record<string, unknown> | null): ChannelAdapter {
    switch (channelType) {
        case 'MESSENGER':
        case 'INSTAGRAM':
            return createMetaAdapter(config);
        case 'LINE':
            return createLineAdapter();
        case 'WHATSAPP':
            return createWhatsAppAdapter();
        default:
            return createMetaAdapter(config);
    }
}
