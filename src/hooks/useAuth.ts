'use client';

// ═══════════════════════════════════════════════════════════════
// useAuth hook — Client-side authentication state
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';

interface Agent {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'AGENT';
    avatarUrl: string | null;
}

export function useAuth() {
    const [agent, setAgent] = useState<Agent | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedToken = localStorage.getItem('chat-auth-token');
        const savedAgent = localStorage.getItem('chat-agent');

        if (savedToken && savedAgent) {
            setToken(savedToken);
            try {
                setAgent(JSON.parse(savedAgent));
            } catch {
                // corrupt data
            }
        }
        setLoading(false);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('chat-auth-token');
        localStorage.removeItem('chat-agent');
        document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        setAgent(null);
        setToken(null);
        // Don't redirect — we're inside the admin panel
    }, []);

    const authHeaders = useCallback((): Record<string, string> => {
        // Read directly from localStorage at call time to avoid stale React state
        const liveToken = token || localStorage.getItem('chat-auth-token');
        return liveToken ? { Authorization: `Bearer ${liveToken}` } : {};
    }, [token]);


    return { agent, token, loading, logout, authHeaders };
}
