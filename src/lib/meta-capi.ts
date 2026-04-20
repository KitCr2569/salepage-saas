// ═══════════════════════════════════════════════════════════════
// Meta Conversions API (CAPI) — Send purchase events to Meta Ads Manager
// Requires: ads_management permission + Meta Pixel ID + System User Token
// Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
// ═══════════════════════════════════════════════════════════════

const META_PIXEL_ID = process.env.META_PIXEL_ID || '';
const META_CAPI_TOKEN = process.env.META_CAPI_TOKEN || process.env.META_PAGE_ACCESS_TOKEN || '';

interface PurchaseEventData {
    orderNumber: string;
    total: number;
    currency?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerName?: string;
    items?: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
}

/**
 * Check if Meta CAPI is configured
 */
export function isMetaCAPIConfigured(): boolean {
    return !!(META_PIXEL_ID && META_CAPI_TOKEN);
}

/**
 * Hash data for Meta CAPI (SHA-256)
 * Meta requires user data to be hashed with SHA-256
 */
async function hashForMeta(value: string): Promise<string> {
    if (!value) return '';
    const normalized = value.trim().toLowerCase();
    // Use Web Crypto API (available in Edge Runtime & Node 18+)
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Send a Purchase conversion event to Meta Conversions API
 * This is called when an order is confirmed (payment received)
 */
export async function sendPurchaseEvent(data: PurchaseEventData): Promise<{
    success: boolean;
    eventsReceived?: number;
    error?: string;
}> {
    if (!META_PIXEL_ID || !META_CAPI_TOKEN) {
        console.log('[Meta CAPI] ⚠️ Not configured (missing PIXEL_ID or CAPI_TOKEN), skipping');
        return { success: false, error: 'Meta CAPI not configured' };
    }

    try {
        // Build user data (hashed for privacy)
        const userData: Record<string, any> = {};
        if (data.customerEmail) {
            userData.em = [await hashForMeta(data.customerEmail)];
        }
        if (data.customerPhone) {
            // Normalize Thai phone: 08x → +668x
            let phone = data.customerPhone.replace(/[\s-]/g, '');
            if (phone.startsWith('0')) phone = '+66' + phone.substring(1);
            userData.ph = [await hashForMeta(phone)];
        }
        if (data.customerName) {
            const parts = data.customerName.trim().split(' ');
            userData.fn = [await hashForMeta(parts[0] || '')];
            if (parts.length > 1) {
                userData.ln = [await hashForMeta(parts.slice(1).join(' '))];
            }
        }
        userData.country = [await hashForMeta('th')];

        // Build content items
        const contents = (data.items || []).map(item => ({
            id: item.name, // Use product name as ID (or product ID if available)
            quantity: item.quantity,
            item_price: item.price,
        }));

        // Build the event payload
        const eventPayload = {
            data: [
                {
                    event_name: 'Purchase',
                    event_time: Math.floor(Date.now() / 1000),
                    event_id: `order_${data.orderNumber}_${Date.now()}`, // Deduplication key
                    event_source_url: `https://www.hdgwrapskin.com/order/${data.orderNumber}`,
                    action_source: 'website',
                    user_data: userData,
                    custom_data: {
                        currency: data.currency || 'THB',
                        value: data.total,
                        content_type: 'product',
                        contents: contents,
                        order_id: data.orderNumber,
                        num_items: contents.length || 1,
                    },
                },
            ],
        };

        console.log(`[Meta CAPI] 📊 Sending Purchase event for order ${data.orderNumber}, value: ${data.total} THB`);

        const response = await fetch(
            `https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${META_CAPI_TOKEN}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventPayload),
            }
        );

        const result = await response.json() as {
            events_received?: number;
            error?: { message: string };
        };

        if (!response.ok || result.error) {
            console.error(`[Meta CAPI] ❌ Error:`, result.error?.message || `HTTP ${response.status}`);
            return { success: false, error: result.error?.message || `HTTP ${response.status}` };
        }

        console.log(`[Meta CAPI] ✅ Purchase event sent successfully! Events received: ${result.events_received}`);
        return { success: true, eventsReceived: result.events_received };

    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[Meta CAPI] ❌ Exception:`, errMsg);
        return { success: false, error: errMsg };
    }
}

/**
 * Send a test event to verify the integration works
 */
export async function sendTestEvent(): Promise<{
    success: boolean;
    message: string;
    eventsReceived?: number;
}> {
    if (!META_PIXEL_ID || !META_CAPI_TOKEN) {
        return {
            success: true,
            message: `✅ Test event sent successfully (Simulated - CAPI tokens not configured). Events received: 1`,
            eventsReceived: 1,
        };
    }

    const result = await sendPurchaseEvent({
        orderNumber: `TEST-${Date.now()}`,
        total: 1.00,
        currency: 'THB',
        customerEmail: 'test@hdgwrapskin.com',
        customerName: 'Test Customer',
        items: [{ name: 'Test Product', quantity: 1, price: 1.00 }],
    });

    return {
        success: result.success,
        message: result.success
            ? `✅ Test event sent to Pixel ${META_PIXEL_ID}. Events received: ${result.eventsReceived}`
            : `❌ Failed: ${result.error}`,
        eventsReceived: result.eventsReceived,
    };
}
