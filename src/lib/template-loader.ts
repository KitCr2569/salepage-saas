// ═══════════════════════════════════════════════════════════════
// Server-side template loader — reads from DB settings
// If admin edited templates in UI → uses those, otherwise defaults
// ═══════════════════════════════════════════════════════════════

import { prisma } from '@/lib/prisma';
import {
    ORDER_CONFIRMATION,
    TRACKING_BUTTON_MSG,
    TRACKING_BUTTON_TITLE,
    PAYMENT_CONFIRMATION,
    AUTO_CANCEL_MSG,
    ADMIN_PAYMENT_NOTIFICATION,
    ADMIN_PAYMENT_PREVIEW,
    ADDRESS_UPDATE_CONFIRM,
    ADDRESS_UPDATE_CONFIRM_WITH_NOTE,
    FOLLOW_UP_REMINDER,
    CHECKOUT_ORDER_SUMMARY,
    PAY_ORDER_SUMMARY,
    fillTemplate,
} from '@/lib/message-templates';

// Cache settings for 30 seconds to avoid DB hit on every webhook
let cachedSettings: Record<string, string> | null = null;
let cacheExpiry = 0;

async function loadTemplatesFromDB(): Promise<Record<string, string>> {
    const now = Date.now();
    if (cachedSettings && now < cacheExpiry) return cachedSettings;

    try {
        const shop = await prisma.shop.findFirst({ orderBy: { createdAt: 'asc' } });
        const config = (shop?.paymentConfig as Record<string, any>) || {};
        cachedSettings = {
            confirmOrderMsg: config.confirmOrderMsg || ORDER_CONFIRMATION,
            confirmPaymentMsg: config.confirmPaymentMsg || PAYMENT_CONFIRMATION,
            tplTrackingButton: config.tplTrackingButton || TRACKING_BUTTON_MSG,
            tplAutoCancel: config.tplAutoCancel || AUTO_CANCEL_MSG,
            tplAdminNotify: config.tplAdminNotify || ADMIN_PAYMENT_NOTIFICATION,
            tplAddressConfirm: config.tplAddressConfirm || ADDRESS_UPDATE_CONFIRM,
            tplFollowUpReminder: config.tplFollowUpReminder || FOLLOW_UP_REMINDER,
            tplCheckoutOrderSummary: config.tplCheckoutOrderSummary || CHECKOUT_ORDER_SUMMARY,
            tplPayOrderSummary: config.tplPayOrderSummary || PAY_ORDER_SUMMARY,
        };
        cacheExpiry = now + 30_000; // 30s cache
        return cachedSettings;
    } catch {
        return {
            confirmOrderMsg: ORDER_CONFIRMATION,
            confirmPaymentMsg: PAYMENT_CONFIRMATION,
            tplTrackingButton: TRACKING_BUTTON_MSG,
            tplAutoCancel: AUTO_CANCEL_MSG,
            tplAdminNotify: ADMIN_PAYMENT_NOTIFICATION,
            tplAddressConfirm: ADDRESS_UPDATE_CONFIRM,
            tplFollowUpReminder: FOLLOW_UP_REMINDER,
            tplCheckoutOrderSummary: CHECKOUT_ORDER_SUMMARY,
            tplPayOrderSummary: PAY_ORDER_SUMMARY,
        };
    }
}

// ── Public API ────────────────────────────────────────────────

export async function getOrderConfirmation(vars: Record<string, string | number | null | undefined>) {
    const tpl = await loadTemplatesFromDB();
    return fillTemplate(tpl.confirmOrderMsg, vars);
}

export async function getTrackingButtonMsg(vars: Record<string, string | number | null | undefined>) {
    const tpl = await loadTemplatesFromDB();
    return fillTemplate(tpl.tplTrackingButton, vars);
}

export function getTrackingButtonTitle() {
    return TRACKING_BUTTON_TITLE;
}

export async function getPaymentConfirmation(vars: Record<string, string | number | null | undefined>) {
    const tpl = await loadTemplatesFromDB();
    return fillTemplate(tpl.confirmPaymentMsg, vars);
}

export async function getAutoCancelMsg(vars: Record<string, string | number | null | undefined>) {
    const tpl = await loadTemplatesFromDB();
    return fillTemplate(tpl.tplAutoCancel, vars);
}

export async function getAdminNotification(vars: Record<string, string | number | null | undefined>) {
    const tpl = await loadTemplatesFromDB();
    return fillTemplate(tpl.tplAdminNotify, vars);
}

export function getAdminPaymentPreview(vars: Record<string, string | number | null | undefined>) {
    return fillTemplate(ADMIN_PAYMENT_PREVIEW, vars);
}

export async function getAddressConfirm(vars: Record<string, string | number | null | undefined>) {
    const tpl = await loadTemplatesFromDB();
    return fillTemplate(tpl.tplAddressConfirm, vars);
}

export function getAddressConfirmWithNote(vars: Record<string, string | number | null | undefined>) {
    return fillTemplate(ADDRESS_UPDATE_CONFIRM_WITH_NOTE, vars);
}

export async function getFollowUpReminder(vars: Record<string, string | number | null | undefined>) {
    const tpl = await loadTemplatesFromDB();
    return fillTemplate(tpl.tplFollowUpReminder, vars);
}

export async function getCheckoutOrderSummary(vars: Record<string, string | number | null | undefined>) {
    const tpl = await loadTemplatesFromDB();
    const filled = fillTemplate(tpl.tplCheckoutOrderSummary, vars);
    return filled.replace(/^\s*[\r\n]/gm, '');
}

export async function getPayOrderSummary(vars: Record<string, string | number | null | undefined>) {
    const tpl = await loadTemplatesFromDB();
    const filled = fillTemplate(tpl.tplPayOrderSummary, vars);
    return filled.replace(/^\s*[\r\n]/gm, '');
}

// Re-export fillTemplate for direct usage
export { fillTemplate };
