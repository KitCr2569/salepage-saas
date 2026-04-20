'use client';

// ═══════════════════════════════════════════════════════════════
// useApi hook — Typed fetch with auth headers
// ═══════════════════════════════════════════════════════════════

import { useCallback } from 'react';
import { useAuth } from './useAuth';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export function useApi() {
    const { authHeaders } = useAuth();

    const apiFetch = useCallback(
        async <T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> => {
            const headers = {
                'Content-Type': 'application/json',
                ...authHeaders(),
                ...options?.headers,
            };

            const res = await fetch(url, { ...options, headers });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || `API error: ${res.status}`);
            }

            return data;
        },
        [authHeaders]
    );

    const get = useCallback(
        <T>(url: string) => apiFetch<T>(url),
        [apiFetch]
    );

    const post = useCallback(
        <T>(url: string, body: unknown) =>
            apiFetch<T>(url, {
                method: 'POST',
                body: JSON.stringify(body),
            }),
        [apiFetch]
    );

    const patch = useCallback(
        <T>(url: string, body: unknown) =>
            apiFetch<T>(url, {
                method: 'PATCH',
                body: JSON.stringify(body),
            }),
        [apiFetch]
    );

    const del = useCallback(
        <T>(url: string) =>
            apiFetch<T>(url, { method: 'DELETE' }),
        [apiFetch]
    );

    return { get, post, patch, del, apiFetch };
}
