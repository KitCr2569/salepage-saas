// ═══════════════════════════════════════════════════════════════
// Timezone Utility — เวลาประเทศไทย (Asia/Bangkok, UTC+7)
// ═══════════════════════════════════════════════════════════════

export const THAILAND_TIMEZONE = 'Asia/Bangkok';

/**
 * Get current date/time in Thailand timezone
 * Returns a Date object adjusted to Bangkok time
 */
export function getBangkokNow(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: THAILAND_TIMEZONE }));
}

/**
 * Get today's date string in YYYYMMDD format (Thailand timezone)
 * Used for order number generation
 */
export function getBangkokDateString(): string {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: THAILAND_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    // en-CA gives YYYY-MM-DD format
    return formatter.format(now).replace(/-/g, '');
}

/**
 * Get ISO-like timestamp string in Thailand timezone
 * Used for logging: "2026-04-14T21:09:53+07:00"
 */
export function getBangkokTimestamp(): string {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: THAILAND_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
    return formatter.format(now).replace(' ', 'T') + '+07:00';
}

/**
 * Format a date to Thai locale string with Bangkok timezone
 * Safe for both server (SSR) and client usage
 */
export function formatThaiDateTime(
    date: Date | string,
    options?: Intl.DateTimeFormatOptions
): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('th-TH', {
        timeZone: THAILAND_TIMEZONE,
        ...options,
    });
}

/**
 * Format a date to Thai locale date string with Bangkok timezone
 */
export function formatThaiDate(
    date: Date | string,
    options?: Intl.DateTimeFormatOptions
): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('th-TH', {
        timeZone: THAILAND_TIMEZONE,
        ...options,
    });
}

/**
 * Format a date to Thai locale time string with Bangkok timezone
 */
export function formatThaiTime(
    date: Date | string,
    options?: Intl.DateTimeFormatOptions
): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('th-TH', {
        timeZone: THAILAND_TIMEZONE,
        ...options,
    });
}
