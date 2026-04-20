// ═══════════════════════════════════════════════════════════════
// API Helpers — Common response utilities
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';

export function successResponse<T>(data: T, status: number = 200) {
    return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status: number = 400) {
    return NextResponse.json({ success: false, error: message }, { status });
}

export function handleApiError(error: unknown) {
    // Handle validation errors (zodless version)
    if (error && typeof error === 'object' && 'errors' in error && Array.isArray((error as { errors: unknown[] }).errors)) {
        const errors = (error as { errors: Array<{ path: string[]; message: string }> }).errors;
        const messages = errors.map((e) => `${e.path?.join('.') || ''}: ${e.message}`);
        return errorResponse(`Validation error: ${messages.join(', ')}`, 400);
    }

    if (error instanceof Error) {
        console.error('[API Error]', error.message, error.stack);
        return errorResponse(
            process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            500
        );
    }

    return errorResponse('Unknown error', 500);
}
