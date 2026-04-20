// ═══════════════════════════════════════════════════════════════
// Logger — Structured logging utility
// ═══════════════════════════════════════════════════════════════

import { getBangkokTimestamp } from '@/lib/timezone';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'debug';

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatTimestamp(): string {
    return getBangkokTimestamp();
}

export const logger = {
    debug(module: string, message: string, data?: unknown) {
        if (shouldLog('debug')) {
            console.debug(`[${formatTimestamp()}] [DEBUG] [${module}] ${message}`, data ?? '');
        }
    },

    info(module: string, message: string, data?: unknown) {
        if (shouldLog('info')) {
            console.log(`[${formatTimestamp()}] [INFO] [${module}] ${message}`, data ?? '');
        }
    },

    warn(module: string, message: string, data?: unknown) {
        if (shouldLog('warn')) {
            console.warn(`[${formatTimestamp()}] [WARN] [${module}] ${message}`, data ?? '');
        }
    },

    error(module: string, message: string, error?: unknown) {
        if (shouldLog('error')) {
            const errorData = error instanceof Error
                ? { message: error.message, stack: error.stack }
                : error;
            console.error(`[${formatTimestamp()}] [ERROR] [${module}] ${message}`, errorData ?? '');
        }
    },
};
