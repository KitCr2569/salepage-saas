// ═══════════════════════════════════════════════════════════════
// useRealtimeChat — Subscribe ข้อความใหม่แบบ Realtime
// ⚡ ใช้ข้อมูลจาก broadcast โดยตรง — ไม่ต้อง refetch ทั้ง conversation
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface Message {
    id: string;
    direction: string;
    type: string;
    content: string;
    imageUrl: string | null;
    sendStatus: string;
    senderName: string | null;
    senderAgentId: string | null;
    createdAt: string;
    senderAgent: { id: string; name: string; avatarUrl: string | null } | null;
}

interface BroadcastPayload {
    message: Message;
}

interface UseRealtimeChatOptions {
    conversationId: string | null;
    onNewMessage: (message: Message) => void;
    onMessageDeleted?: (messageId: string) => void;
    // ⚡ ลบ fetchConversation — ไม่ต้อง refetch ทั้ง conversation แล้ว
}

export function useRealtimeChat({
    conversationId,
    onNewMessage,
    onMessageDeleted,
}: UseRealtimeChatOptions) {
    const onNewMessageRef = typeof window !== 'undefined' ? require('react').useRef(onNewMessage) : { current: onNewMessage };
    const onMessageDeletedRef = typeof window !== 'undefined' ? require('react').useRef(onMessageDeleted) : { current: onMessageDeleted };

    useEffect(() => {
        onNewMessageRef.current = onNewMessage;
        onMessageDeletedRef.current = onMessageDeleted;
    }, [onNewMessage, onMessageDeleted]);

    const handleBroadcast = useCallback(
        (payload: { payload: BroadcastPayload }) => {
            const message = payload?.payload?.message;
            if (!message) return;

            // ⚡ แสดงข้อความทันทีจาก broadcast data — ไม่ต้อง refetch!
            if (onNewMessageRef.current) {
                onNewMessageRef.current(message);
            }
        },
        []
    );

    const handleDeleteBroadcast = useCallback((payload: any) => {
        const messageId = payload?.payload?.messageId;
        if (messageId && onMessageDeletedRef.current) {
            onMessageDeletedRef.current(messageId);
        }
    }, []);

    useEffect(() => {
        if (!conversationId) return;

        // ใช้ Broadcast channel — ทำงานได้โดยไม่ต้องย้าย DB ไป Supabase
        const channel = supabase
            .channel(`chat:${conversationId}`)
            .on('broadcast', { event: 'new_message' }, handleBroadcast)
            .on('broadcast', { event: 'message_deleted' }, handleDeleteBroadcast)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId, handleBroadcast, handleDeleteBroadcast]);
}
