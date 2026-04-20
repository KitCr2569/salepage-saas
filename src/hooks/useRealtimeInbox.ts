// ═══════════════════════════════════════════════════════════════
// useRealtimeInbox — Subscribe อัปเดต inbox แบบ Realtime
// ⚡ ใช้ข้อมูลจาก broadcast โดยตรง ไม่ต้อง refetch ทั้ง list
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface InboxItem {
    id: string;
    contactName: string;
    contactAvatar: string | null;
    channelType: string;
    status: string;
    isStarred?: boolean;
    isSpam?: boolean;
    lastMessage: string | null;
    lastMessageAt: string;
    unreadCount: number;
    assignedAgent: string | null;
    tags: { id: string; name: string; color: string }[];
}

interface UseRealtimeInboxOptions {
    enabled: boolean;
    onUpdate: () => void;
    // ⚡ Smart update — อัปเดตเฉพาะ item ที่เปลี่ยน ไม่ต้อง refetch ทั้ง list
    onSmartUpdate?: (conversationId: string, inboxItem: InboxItem) => void;
}

export function useRealtimeInbox({ enabled, onUpdate, onSmartUpdate }: UseRealtimeInboxOptions) {
    const onUpdateRef = typeof window !== 'undefined' ? require('react').useRef(onUpdate) : { current: onUpdate };
    const onSmartUpdateRef = typeof window !== 'undefined' ? require('react').useRef(onSmartUpdate) : { current: onSmartUpdate };

    useEffect(() => {
        onUpdateRef.current = onUpdate;
        onSmartUpdateRef.current = onSmartUpdate;
    }, [onUpdate, onSmartUpdate]);

    const handleBroadcast = useCallback((payload: any) => {
        const data = payload?.payload;
        
        // ⚡ ถ้ามี inboxItem แปะมา → update เฉพาะ item นั้น (ไม่ต้อง API call เลย!)
        if (data?.inboxItem && onSmartUpdateRef.current) {
            onSmartUpdateRef.current(data.conversationId, data.inboxItem);
            return;
        }
        
        // Fallback: ถ้าไม่มีข้อมูลครบ → refetch แบบเดิม
        if (onUpdateRef.current) {
            onUpdateRef.current();
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;

        // Subscribe Broadcast channel สำหรับ inbox updates
        const channel = supabase
            .channel('inbox:updates')
            .on('broadcast', { event: 'inbox_update' }, handleBroadcast)
            .on('broadcast', { event: 'new_message' }, handleBroadcast)
            .subscribe((status) => {
                // reconnect อัตโนมัติถ้า channel ถูก closed
                if (status === 'CHANNEL_ERROR') {
                    supabase.removeChannel(channel);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [enabled, handleBroadcast]);
}
