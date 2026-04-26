'use client';

// ═══════════════════════════════════════════════════════════════
// Chat Panel — Message thread + compose area
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { useApi } from '@/hooks/useApi';
import { CHANNEL_CONFIG } from '@/lib/chat-types';
import { QuickReplies } from './QuickReplies';
import { InlineSlashPicker } from './InlineSlashPicker';
import { ContactAvatar } from './ContactAvatar';
import { Trans } from "@/components/Trans";
import Swal from 'sweetalert2';

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

interface Conversation {
    id: string;
    status: string;
    contact: {
        displayName: string;
        avatarUrl: string | null;
        platformContactId: string;
    };
    channel: { id: string; type: string; name: string };
    assignedAgent: { id: string; name: string } | null;
    messages: Message[];
    notes: Array<{
        id: string;
        content: string;
        createdAt: string;
        agent: { id: string; name: string };
    }>;
}

interface ChatPanelProps {
    conversation: Conversation | null;
    loading: boolean;
    onMessageSent: () => void;
    onOptimisticMessage?: (msg: Message) => void;
    onMessageDeleted?: (msgId: string) => void;
    hasMoreMessages?: boolean;
    loadingMoreMessages?: boolean;
    onLoadMoreMessages?: () => void;
}

function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'), {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Bangkok',
    });
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "today" : "วันนี้");
    if (date.toDateString() === yesterday.toDateString()) return (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "yesterday" : "เมื่อวาน");
    return date.toLocaleDateString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'), { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Bangkok' });
}

export function ChatPanel({ conversation, loading, onMessageSent, onOptimisticMessage, onMessageDeleted, hasMoreMessages, loadingMoreMessages, onLoadMoreMessages }: ChatPanelProps) {
    const { post } = useApi();
    const [messageText, setMessageText] = useState('');
    const [isNote, setIsNote] = useState(false);
    const [sending, setSending] = useState(false);
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const [slashQuery, setSlashQuery] = useState<string | null>(null);
    const [prevMsgCount, setPrevMsgCount] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const notifSoundRef = useRef<HTMLAudioElement | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    // ⚡ Multi-image
    const [pendingImages, setPendingImages] = useState<{ file: File; preview: string }[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    // 🖼️ Lightbox
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    // 🗑️ Confirm delete
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

    // Initialize notification sound — pleasant 3-tone chime
    useEffect(() => {
        let ctx: AudioContext | null = null;
        notifSoundRef.current = {
            play: () => {
                try {
                    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
                    // 3-tone chime: C5 → E5 → G5
                    const notes = [523, 659, 784];
                    notes.forEach((freq, i) => {
                        const osc = ctx!.createOscillator();
                        const gain = ctx!.createGain();
                        osc.type = 'sine';
                        osc.connect(gain);
                        gain.connect(ctx!.destination);
                        osc.frequency.setValueAtTime(freq, ctx!.currentTime + i * 0.12);
                        gain.gain.setValueAtTime(0, ctx!.currentTime + i * 0.12);
                        gain.gain.linearRampToValueAtTime(0.25, ctx!.currentTime + i * 0.12 + 0.02);
                        gain.gain.exponentialRampToValueAtTime(0.01, ctx!.currentTime + i * 0.12 + 0.3);
                        osc.start(ctx!.currentTime + i * 0.12);
                        osc.stop(ctx!.currentTime + i * 0.12 + 0.35);
                    });
                } catch { /* audio not available */ }
                return Promise.resolve();
            }
        } as unknown as HTMLAudioElement;

        // Request notification permission early
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Play notification sound + desktop notification on new inbound message
    useEffect(() => {
        if (!conversation?.messages) return;
        const msgCount = conversation.messages.length;
        if (prevMsgCount > 0 && msgCount > prevMsgCount) {
            const lastMsg = conversation.messages[msgCount - 1];
            if (lastMsg && lastMsg.direction === 'INBOUND') {
                // Sound
                notifSoundRef.current?.play().catch(() => { });

                // Desktop notification (auto-close after 5s)
                if ('Notification' in window && Notification.permission === 'granted') {
                    const notif = new Notification(`💬 ${lastMsg.senderName || (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "New message" : "ข้อความใหม่")}`, {
                        body: lastMsg.content?.substring(0, 100) || (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Picture/File" : "รูปภาพ/ไฟล์"),
                        icon: '/favicon.ico',
                        tag: `chat-${conversation.id}`, // replace previous from same conversation
                        silent: true, // we have our own sound
                    });
                    setTimeout(() => notif.close(), 5000);
                    notif.onclick = () => {
                        window.focus();
                        notif.close();
                    };
                }

                // Flash browser title
                const origTitle = document.title;
                let flashing = true;
                const flashInterval = setInterval(() => {
                    document.title = flashing ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "💬 New message!" : "💬 ข้อความใหม่!") : origTitle;
                    flashing = !flashing;
                }, 1000);
                // Stop flashing when window is focused
                const stopFlash = () => {
                    clearInterval(flashInterval);
                    document.title = origTitle;
                    window.removeEventListener('focus', stopFlash);
                };
                window.addEventListener('focus', stopFlash);
                // Auto-stop after 30s
                setTimeout(stopFlash, 30000);
            }
        }
        setPrevMsgCount(msgCount);
    }, [conversation?.messages, conversation?.id, prevMsgCount]);

    const prevFirstMsgIdRef = useRef<string | null>(null);
    const prevLastMsgIdRef = useRef<string | null>(null);
    const prevScrollHeightRef = useRef<number>(0);
    const prevConvoIdRef = useRef<string | null>(null);

    // Always show latest messages at bottom — no scroll animation
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const currentId = conversation?.id || null;
        const messages = conversation?.messages || [];
        const firstMsgId = messages.length > 0 ? messages[0].id : null;
        const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : null;

        if (currentId !== prevConvoIdRef.current) {
            // Changed conversation -> scroll to bottom
            container.scrollTop = container.scrollHeight;
        } else if (lastMsgId !== prevLastMsgIdRef.current) {
            // New message at the bottom -> scroll to bottom
            container.scrollTop = container.scrollHeight;
        } else if (firstMsgId !== prevFirstMsgIdRef.current && prevScrollHeightRef.current > 0) {
            // Older messages loaded at top -> maintain scroll position
            const heightDiff = container.scrollHeight - prevScrollHeightRef.current;
            container.scrollTop = container.scrollTop + heightDiff;
        }

        prevConvoIdRef.current = currentId;
        prevFirstMsgIdRef.current = firstMsgId;
        prevLastMsgIdRef.current = lastMsgId;
        prevScrollHeightRef.current = container.scrollHeight;
    }, [conversation?.id, conversation?.messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [messageText]);

    // Escape ปิด lightbox — global keyboard listener
    useEffect(() => {
        if (!lightboxUrl) return;
        const handler = (e: globalThis.KeyboardEvent) => {
            if (e.key === 'Escape') setLightboxUrl(null);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [lightboxUrl]);

    async function handleSend() {
        if (!messageText.trim() || !conversation || sending) return;

        const trimmedText = messageText.trim();
        const msgType = isNote ? 'NOTE' : 'TEXT';

        // Optimistic: add message to UI immediately
        const optimisticMsg: Message = {
            id: `optimistic-${Date.now()}`,
            direction: 'OUTBOUND',
            type: msgType,
            content: trimmedText,
            imageUrl: null,
            sendStatus: 'PENDING',
            senderName: 'Admin User',
            senderAgentId: null,
            createdAt: new Date().toISOString(),
            senderAgent: { id: 'self', name: 'Admin User', avatarUrl: null },
        };

        // Show message in chat immediately
        onOptimisticMessage?.(optimisticMsg);

        // Clear input right away
        setMessageText('');
        setIsNote(false);
        setSending(true);

        try {
            const result = await post<any>('/api/chat/messages/send', {
                conversationId: conversation.id,
                type: msgType,
                content: trimmedText,
            });

            if (result && (result as any).warning) {
                Swal.fire({ text: String((result as any).warning), icon: 'info' });
            }

            // Silently refresh to get real message from server
            onMessageSent();
        } catch (err) {
            console.error('Failed to send:', err);
            // Restore message text on failure
            setMessageText(trimmedText);
        } finally {
            setSending(false);
        }
    }

    async function handleDeleteMessage(msgId: string, force: boolean = false) {
        // First click: show confirmation state
        if (!force && confirmingDeleteId !== msgId) {
            setConfirmingDeleteId(msgId);
            // Auto-cancel after 3s
            setTimeout(() => setConfirmingDeleteId(null), 3000);
            return;
        }
        // Second click (confirmed) or forced: proceed with delete
        setConfirmingDeleteId(null);
        const token = localStorage.getItem('chat-auth-token');
        try {
            const res = await fetch(`/api/chat/messages/${msgId}`, {
                method: 'DELETE',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (res.ok) {
                onMessageDeleted?.(msgId);
            } else {
                console.error('Delete failed:', res.status, await res.text());
            }
        } catch (err) {
            console.error('Failed to delete message:', err);
        }
    }

    async function handleRetryMessage(msg: Message) {
        if (!conversation || sending) return;

        try {
            // Optimistic delete local state
            onMessageDeleted?.(msg.id);

            // API Delete the failed one
            if (!msg.id.startsWith('optimistic-')) {
                const token = localStorage.getItem('chat-auth-token');
                await fetch(`/api/chat/messages/${msg.id}`, {
                    method: 'DELETE',
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
            }

            // Send again
            setSending(true);
            await post('/api/chat/messages/send', {
                conversationId: conversation.id,
                type: msg.type,
                content: msg.content,
                imageUrl: msg.imageUrl || undefined,
            });

            onMessageSent();
        } catch (err) {
            console.error('Failed to retry:', err);
            onMessageSent();
        } finally {
            setSending(false);
        }
    }

    // Handle file selection — support multiple images
    function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files || []);
        if (!files.length || !conversation) return;
        addPendingImages(files);
        e.target.value = '';
    }

    // Add images to pending preview list
    function addPendingImages(files: File[]) {
        const validFiles = files.filter(f => {
            if (!f.type.startsWith('image/')) { Swal.fire({ text: `${f.name} ไม่ใช่ไฟล์รูปภาพ`, icon: 'info' }); return false; }
            if (f.size > 10 * 1024 * 1024) { Swal.fire({ text: `${f.name} ใหญ่เกินไป (สูงสุด 10MB)`, icon: 'error' }); return false; }
            return true;
        });
        validFiles.forEach(file => {
            const preview = URL.createObjectURL(file);
            setPendingImages(prev => [...prev, { file, preview }]);
        });
    }

    // Remove one image from pending list
    function removePendingImage(index: number) {
        setPendingImages(prev => {
            URL.revokeObjectURL(prev[index].preview);
            return prev.filter((_, i) => i !== index);
        });
    }

    // Send all pending images sequentially
    async function sendAllPendingImages() {
        if (!conversation || pendingImages.length === 0) return;
        setSending(true);
        const toSend = [...pendingImages];
        setPendingImages([]);
        try {
            for (const { file, preview } of toSend) {
                const reader = new FileReader();
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                // Optimistic preview
                onOptimisticMessage?.({
                    id: `optimistic-img-${Date.now()}-${Math.random()}`,
                    direction: 'OUTBOUND', type: 'IMAGE', content: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "picture" : "รูปภาพ"),
                    imageUrl: dataUrl, sendStatus: 'PENDING',
                    senderName: 'Admin User', senderAgentId: null,
                    createdAt: new Date().toISOString(),
                    senderAgent: { id: 'self', name: 'Admin User', avatarUrl: null },
                });
                URL.revokeObjectURL(preview);
                await post('/api/chat/messages/send', {
                    conversationId: conversation.id,
                    type: 'IMAGE', content: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "picture" : "รูปภาพ"), imageUrl: dataUrl,
                });
            }
            onMessageSent();
        } catch (err) {
            console.error('Failed to send images:', err);
        } finally {
            setSending(false);
        }
    }
    async function handleSendLike() {
        if (!conversation || sending) return;
        const likeMsg: Message = {
            id: `optimistic-like-${Date.now()}`,
            direction: 'OUTBOUND',
            type: 'TEXT',
            content: '👍',
            imageUrl: null,
            sendStatus: 'PENDING',
            senderName: 'Admin User',
            senderAgentId: null,
            createdAt: new Date().toISOString(),
            senderAgent: { id: 'self', name: 'Admin User', avatarUrl: null },
        };
        onOptimisticMessage?.(likeMsg);
        setSending(true);
        try {
            await post('/api/chat/messages/send', {
                conversationId: conversation.id,
                type: 'TEXT',
                content: '👍',
            });
            onMessageSent();
        } catch (err) {
            console.error('Failed to send like:', err);
        } finally {
            setSending(false);
        }
    }

    async function handleImageUpload() {
        fileInputRef.current?.click();
    }

    // Drag & Drop handlers
    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes('Files')) setIsDragging(true);
    }
    function handleDragLeave(e: React.DragEvent) {
        // Only reset if leaving the container entirely
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragging(false);
        }
    }
    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (!conversation) return;
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) addPendingImages(files);
    }

    // Paste image from clipboard — รองรับหลายรูป
    function handlePaste(e: React.ClipboardEvent) {
        if (!conversation) return;
        const items = e.clipboardData?.items;
        if (!items) return;
        const imageFiles: File[] = [];
        for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) imageFiles.push(file);
            }
        }
        if (imageFiles.length > 0) {
            e.preventDefault();
            addPendingImages(imageFiles);
        }
    }

    // Global Paste for images (when not focusing textarea)
    useEffect(() => {
        const handleGlobalPaste = (e: globalThis.ClipboardEvent) => {
            if (!conversation) return;
            const activeTag = document.activeElement?.tagName;
            // Let the textarea/input handle its own paste
            if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

            const items = e.clipboardData?.items;
            if (!items) return;

            const imageFiles: File[] = [];
            for (const item of Array.from(items)) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) imageFiles.push(file);
                }
            }
            if (imageFiles.length > 0) {
                e.preventDefault();
                addPendingImages(imageFiles);
            }
        };

        window.addEventListener('paste', handleGlobalPaste);
        return () => window.removeEventListener('paste', handleGlobalPaste);
    }, [conversation]); // addPendingImages is fixed so this is fine.

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
        // If slash picker is open, let it handle keyboard events
        if (slashQuery !== null) {
            if (e.key === 'Escape') {
                e.preventDefault();
                setSlashQuery(null);
            }
            return;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    // Detect `/` commands in input
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setMessageText(val);

        if (val.startsWith('/')) {
            setSlashQuery(val.slice(1));
        } else {
            setSlashQuery(null);
        }
    }, []);

    function handleQuickReplySelect(content: string) {
        setMessageText(content);
        setShowQuickReplies(false);
        setSlashQuery(null);
        textareaRef.current?.focus();
    }

    function handleSlashSelect(content: string) {
        setMessageText(content);
        setSlashQuery(null);
        textareaRef.current?.focus();
    }

    // Empty state
    if (!conversation && !loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-surface-900 flex items-center justify-center mx-auto mb-6">
                        <svg className="w-12 h-12 text-surface-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-surface-400 mb-2">{<Trans th="เลือกการสนทนา" en="Select conversation" />}</h3>
                    <p className="text-sm text-surface-600">{<Trans th="เลือกรายการจากกล่องข้อความเพื่อเริ่มตอบ" en="Select an item from the message box to start replying." />}</p>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!conversation) return null;

    const channelConfig = CHANNEL_CONFIG[conversation.channel.type as keyof typeof CHANNEL_CONFIG];

    // Group messages by date (filtered by search)
    const filteredMessages = searchText.trim()
        ? conversation.messages.filter(m =>
            m.content.toLowerCase().includes(searchText.toLowerCase()) ||
            (m.senderName && m.senderName.toLowerCase().includes(searchText.toLowerCase()))
        )
        : conversation.messages;

    const messagesByDate: { date: string; messages: Message[] }[] = [];
    let lastDate = '';
    for (const msg of filteredMessages) {
        const msgDate = new Date(msg.createdAt).toDateString();
        if (msgDate !== lastDate) {
            messagesByDate.push({ date: msg.createdAt, messages: [msg] });
            lastDate = msgDate;
        } else {
            messagesByDate[messagesByDate.length - 1]!.messages.push(msg);
        }
    }

    const searchMatchCount = searchText.trim() ? filteredMessages.length : 0;

    return (
        <div
            className="h-full flex flex-col relative overflow-x-hidden"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-brand-600/20 border-2 border-dashed border-brand-400 rounded-xl flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <div className="text-5xl mb-3">🖼️</div>
                        <p className="text-brand-300 font-semibold text-lg">{<Trans th="วางรูปที่นี่" en="Place a picture here" />}</p>
                        <p className="text-brand-400 text-sm">{<Trans th="สามารถลากหลายภาพพร้อมกันได้เลย" en="You can drag multiple images at once." />}</p>
                    </div>
                </div>
            )}
            {/* Lightbox */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setLightboxUrl(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-light"
                        onClick={() => setLightboxUrl(null)}
                    >×</button>
                    <a
                        href={lightboxUrl}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-4 right-4 text-white/70 hover:text-white text-sm bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
                    >
                        <Trans th="⬇️ ดาวน์โหลด" en="⬇️ Download" />
                                            </a>
                    <img
                        src={lightboxUrl}
                        alt={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "picture" : "รูปภาพ")}
                        referrerPolicy="no-referrer"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
            <div className="px-6 py-3 border-b border-surface-800 flex items-center justify-between bg-surface-950/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <ContactAvatar
                            name={conversation.contact.displayName}
                            avatarUrl={conversation.contact.avatarUrl}
                            psid={conversation.contact.platformContactId}
                            size="sm"
                        />
                    </div>
                    <div>
                        <h3 className="font-semibold text-surface-100 text-sm">{conversation.contact.displayName}</h3>
                        <div className="flex items-center gap-2">
                            <span
                                className="text-[11px] font-medium"
                                style={{ color: channelConfig?.color }}
                            >
                                {channelConfig?.icon} {channelConfig?.label}
                            </span>
                            {conversation.assignedAgent && (
                                <span className="text-[11px] text-surface-500">
                                    • 👤 {conversation.assignedAgent.name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        className="btn-icon !p-2 text-primary-500 hover:text-primary-400 group"
                        title="ซิงค์ประวัติที่หายไปจาก Facebook (ดึงข้อมูลย้อนหลังแบบลึกเฉพาะลูกค้ารายนี้)"
                        onClick={async () => {
                            try {
                                const btn = document.getElementById('btn-sync-history-fb');
                                if (btn) {
                                    btn.innerHTML = `<div class="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>`;
                                }
                                const res = await fetch(`/api/meta/sync-history/${conversation.id}`, { method: 'POST' });
                                const data = await res.json();
                                if (data.success) {
                                    Swal.fire({ text: `✅ ซิงค์สำเร็จ! ดึงข้อความเก่าคืนมาได้ ${data.stats?.newAdded || 0} ข้อความ (ค้นหาจาก ${data.stats?.messagesScanned || 0})\nกรุณารอโหลด 30 วินาที หรือกด F5 เพื่อรีเฟรช`, icon: 'info' });
                                } else {
                                    Swal.fire({ text: `❌ ซิงค์ล้มเหลว: ${data.error}`, icon: 'error' });
                                }
                                if (btn) btn.innerHTML = `🔄`;
                            } catch (err: any) {
                                Swal.fire({ text: `❌ Error: ${err.message}`, icon: 'error' });
                            }
                        }}
                    >
                        <span id="btn-sync-history-fb" className="group-hover:rotate-180 transition-transform duration-500 inline-block">🔄</span>
                    </button>
                    <button
                        className={`btn-icon !p-2 ${searchOpen ? 'text-brand-400' : ''}`}
                        title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Search for messages" : "ค้นหาข้อความ")}
                        onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchText(''); }}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                    <button className="btn-icon !p-2" title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "phone" : "โทร")}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Search bar */}
            {searchOpen && (
                <div className="px-4 py-2 border-b border-surface-800 bg-surface-900/90 flex items-center gap-2 animate-fade-in">
                    <svg className="w-4 h-4 text-surface-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Search for messages in this chat..." : "ค้นหาข้อความในแชทนี้...")}
                        className="flex-1 bg-transparent text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none"
                        autoFocus
                    />
                    {searchText && (
                        <span className="text-xs text-surface-400 flex-shrink-0">
                            {searchMatchCount} <Trans th="ผลลัพธ์" en="result" />
                                                    </span>
                    )}
                    <button
                        onClick={() => { setSearchOpen(false); setSearchText(''); }}
                        className="btn-icon !p-1"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Messages area */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 py-4 pb-20 md:pb-4 space-y-1">
                {/* Load more button — Facebook style */}
                {hasMoreMessages && (
                    <div className="flex justify-center py-2">
                        <button
                            onClick={() => onLoadMoreMessages?.()}
                            disabled={loadingMoreMessages}
                            className="text-xs text-brand-400 hover:text-brand-300 bg-surface-800 hover:bg-surface-700 px-4 py-1.5 rounded-full transition-colors disabled:opacity-50"
                        >
                            {loadingMoreMessages ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-3 h-3 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                                    <Trans th="กำลังโหลด..." en="Loading..." />
                                                                    </span>
                            ) : (
                                (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "⬆️ Load old messages" : "⬆️ โหลดข้อความเก่า")
                            )}
                        </button>
                    </div>
                )}
                {messagesByDate.map((group, gi) => (
                    <div key={gi}>
                        {/* Date separator */}
                        <div className="flex items-center justify-center my-4">
                            <div className="bg-surface-800 text-surface-500 text-xs px-3 py-1 rounded-full">
                                {formatDate(group.date)}
                            </div>
                        </div>

                        {/* Messages */}
                        {group.messages.map((msg) => {
                            if (msg.type === 'NOTE') {
                                return (
                                    <div key={msg.id} className="flex justify-center my-2 animate-fade-in">
                                        <div className="msg-note text-sm">
                                            <div className="flex items-center gap-1 text-amber-400 text-xs mb-1">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                                <Trans th="โน้ตภายใน •" en="Internal notes •" /> {msg.senderName}
                                            </div>
                                            {msg.content}
                                        </div>
                                    </div>
                                );
                            }

                            const isInbound = msg.direction === 'INBOUND';

                            return (
                                <div
                                    key={msg.id}
                                    className="mb-1 animate-fade-in"
                                >
                                    <div className={`max-w-[75%] w-fit ${isInbound ? 'mr-auto' : 'ml-auto'}`}>
                                        {/* Sender name */}
                                        {isInbound && msg.senderName && (
                                            <div className="text-[11px] text-surface-500 ml-1 mb-0.5">{msg.senderName}</div>
                                        )}
                                        {!isInbound && msg.senderAgent && (
                                            <div className="text-[11px] text-surface-500 mb-0.5 text-right mr-1">{msg.senderAgent.name}</div>
                                        )}

                                        {/* Message bubble */}
                                        <div className="relative group/msg">
                                            <div className={isInbound ? 'msg-inbound' : 'msg-outbound'}>
                                                {msg.type === 'IMAGE' && msg.imageUrl && (
                                                    <div className="mb-2 rounded-xl overflow-hidden">
                                                        <img
                                                            src={msg.imageUrl}
                                                            alt={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "picture" : "รูปภาพ")}
                                                            referrerPolicy="no-referrer"
                                                            className="max-w-[280px] max-h-[200px] object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                                                            onClick={() => setLightboxUrl(msg.imageUrl!)}
                                                        />
                                                    </div>
                                                )}
                                                {/* Show text content only if: not an image, OR image with additional caption */}
                                                {msg.content && !(msg.type === 'IMAGE' && msg.imageUrl && (msg.content === (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "picture" : "รูปภาพ") || msg.content === (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "[picture]" : "[รูปภาพ]"))) && (
                                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                                )}
                                            </div>

                                            {/* 🗑️ Unsend button — Show for all outbound messages on hover */}
                                            {!isInbound && (msg.sendStatus === 'SENT' || msg.sendStatus === 'READ') && (
                                                <div className="absolute -left-20 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-all">
                                                    {confirmingDeleteId === msg.id && (
                                                        <span className="text-[10px] text-red-400 whitespace-nowrap bg-surface-900 px-1.5 py-0.5 rounded border border-red-500/30">
                                                            <Trans th="ยืนยัน?" en="confirm?" />
                                                                                                                    </span>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                        className={`p-1.5 rounded-full border shadow-xl transition-all ${
                                                            confirmingDeleteId === msg.id
                                                                ? 'bg-red-600 text-white border-red-500 scale-110'
                                                                : 'bg-surface-900 text-surface-500 hover:text-red-400 border-surface-800'
                                                        }`}
                                                        title={confirmingDeleteId === msg.id ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Press again to confirm deletion." : "กดอีกครั้งเพื่อยืนยันลบ") : 'ยกเลิกข้อความ'}
                                                    >
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Time + status */}
                                            {!isInbound && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] text-surface-600">
                                                        {formatTime(msg.createdAt)}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        {msg.sendStatus === 'READ' && <span className="text-[10px] text-indigo-400 font-bold">✓✓ <Trans th="อ่านแล้ว" en="Seen" /></span>}
                                                        {msg.sendStatus === 'SENT' && <span className="text-[10px] text-brand-400">✓</span>}
                                                        {msg.sendStatus === 'PENDING' && <span className="text-[10px] text-surface-500 animate-pulse">⏳</span>}
                                                        {msg.sendStatus === 'FAILED' && (
                                                            <div className="flex items-center gap-1.5 bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/20 animate-fade-in group/fail">
                                                                <span className="text-[10px] text-red-500 font-bold">{<Trans th="❌ ส่งไม่สำเร็จ" en="❌ Failed to send" />}</span>
                                                                <div className="flex items-center gap-1 opacity-0 group-hover/fail:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => handleRetryMessage(msg)}
                                                                        disabled={sending}
                                                                        className="text-[10px] text-blue-400 hover:text-blue-300 font-medium underline px-1"
                                                                    >
                                                                        <Trans th="ส่งใหม่" en="Resend" />
                                                                                                                                        </button>
                                                                    <span className="text-[9px] text-surface-700">|</span>
                                                                    <button
                                                                        onClick={() => handleDeleteMessage(msg.id, true)}
                                                                        className="text-[10px] text-surface-500 hover:text-red-400 font-medium underline px-1"
                                                                    >
                                                                        <Trans th="ลบ" en="delete" />
                                                                                                                                        </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies Panel */}
            {showQuickReplies && (
                <QuickReplies
                    onSelect={handleQuickReplySelect}
                    onClose={() => setShowQuickReplies(false)}
                />
            )}

            {/* Inline Slash Command Picker */}
            {slashQuery !== null && (
                <InlineSlashPicker
                    query={slashQuery}
                    onSelect={handleSlashSelect}
                    onClose={() => setSlashQuery(null)}
                />
            )}

            {/* ── MOBILE compose area — Fixed at bottom of viewport (hidden on desktop) ── */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 px-2 py-2 border-t border-surface-800 bg-surface-950 flex flex-col gap-1 safe-area-bottom max-w-[100vw] overflow-hidden">

                {/* Image previews */}
                {pendingImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-1 p-2 bg-surface-900 rounded-xl">
                        {pendingImages.map((img, idx) => (
                            <div key={idx} className="relative group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img.preview} alt={`preview-${idx}`}
                                    className="w-16 h-16 object-cover rounded-lg border border-surface-700" />
                                <button
                                    onClick={() => removePendingImage(idx)}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                                >×</button>
                            </div>
                        ))}
                        <button onClick={sendAllPendingImages} disabled={sending}
                            className="w-16 h-16 rounded-lg border-2 border-dashed border-brand-500 text-brand-400 flex flex-col items-center justify-center gap-1 text-xs font-medium">
                            {sending ? '...' : <><span className="text-lg">📤</span><span><Trans th="ส่ง" en="send" /> {pendingImages.length}</span></>}
                        </button>
                    </div>
                )}

                {/* Note toggle — small pill above input */}
                {isNote && (
                    <div className="flex items-center gap-1 px-1 mb-0.5">
                        <span className="text-[11px] text-amber-400 font-medium">{<Trans th="📝 โน้ตภายใน" en="📝 Internal notes" />}</span>
                        <button onClick={() => setIsNote(false)} className="ml-auto text-[11px] text-surface-500 hover:text-surface-300">{<Trans th="ยกเลิก" en="cancel" />}</button>
                    </div>
                )}

                {/* Messenger-style toolbar */}
                <div className="flex items-center gap-1">
                    {/* + button */}
                    <button className="w-9 h-9 rounded-full bg-surface-800 hover:bg-surface-700 flex items-center justify-center flex-shrink-0 text-brand-400 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>

                    {/* Camera */}
                    <button onClick={handleImageUpload} className="w-9 h-9 rounded-full bg-surface-800 hover:bg-surface-700 flex items-center justify-center flex-shrink-0 text-brand-400 transition-colors" title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "picture" : "รูปภาพ")}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>

                    {/* Quick replies / Sticker */}
                    <button onClick={() => setShowQuickReplies(!showQuickReplies)} className="w-9 h-9 rounded-full bg-surface-800 hover:bg-surface-700 flex items-center justify-center flex-shrink-0 text-brand-400 transition-colors" title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Canned text" : "ข้อความสำเร็จรูป")}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </button>

                    {/* Note toggle button */}
                    <button onClick={() => setIsNote(!isNote)} className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isNote ? 'bg-amber-600 text-white' : 'bg-surface-800 hover:bg-surface-700 text-amber-400'}`} title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "internal note" : "โน้ตภายใน")}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>

                    {/* Text field — Aa style */}
                    <div className={`flex-1 min-w-0 flex items-center rounded-full px-3 py-2 min-h-[38px] ${isNote ? 'bg-amber-900/30 border border-amber-700/40' : 'bg-surface-800'}`}>
                        <textarea
                            ref={textareaRef}
                            id="message-input"
                            value={messageText}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            placeholder={isNote ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Internal notes..." : "โน้ตภายใน...") : 'Aa'}
                            rows={1}
                            className="flex-1 bg-transparent text-sm text-surface-100 placeholder:text-surface-500 resize-none focus:outline-none max-h-[100px] leading-5"
                            style={{ height: 'auto', minHeight: '20px' }}
                        />
                    </div>

                    {/* Send / Like button */}
                    {messageText.trim() ? (
                        <button
                            id="send-button"
                            onClick={handleSend}
                            disabled={sending}
                            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${isNote ? 'bg-amber-600 text-white' : 'bg-brand-600 text-white'} shadow-lg`}
                        >
                            {sending ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                </svg>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleSendLike}
                            disabled={sending}
                            className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0 text-white shadow-lg text-lg active:scale-90 transition-transform"
                            title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Send 👍" : "ส่ง 👍")}
                        >
                            👍
                        </button>
                    )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelected} />
            </div>

            {/* ── DESKTOP compose area — original tab design (hidden on mobile) ── */}
            <div className="hidden md:block px-4 py-3 border-t border-surface-800 bg-surface-950/80 backdrop-blur-sm">
                {/* Note toggle */}
                <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => setIsNote(false)}
                        className={`text-xs px-3 py-1 rounded-full transition-colors ${!isNote ? 'bg-brand-600 text-white' : 'bg-surface-800 text-surface-400 hover:text-surface-300'}`}>
                        <Trans th="💬 ข้อความ" en="💬 Message" />
                                            </button>
                    <button onClick={() => setIsNote(true)}
                        className={`text-xs px-3 py-1 rounded-full transition-colors ${isNote ? 'bg-amber-600 text-white' : 'bg-surface-800 text-surface-400 hover:text-surface-300'}`}>
                        <Trans th="📝 โน้ตภายใน" en="📝 Internal notes" />
                                            </button>
                </div>
                <div className={`flex items-end gap-2 rounded-xl p-2 ${isNote ? 'bg-amber-900/20 border border-amber-700/30' : 'bg-surface-800'}`}>
                    <button onClick={handleImageUpload} className="btn-icon !p-2 flex-shrink-0" title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Attach a picture" : "แนบรูปภาพ")}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </button>
                    <button onClick={() => setShowQuickReplies(!showQuickReplies)} className="btn-icon !p-2 flex-shrink-0" title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Canned text" : "ข้อความสำเร็จรูป")}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </button>
                    <textarea ref={textareaRef} id="message-input-desktop" value={messageText}
                        onChange={handleInputChange} onKeyDown={handleKeyDown} onPaste={handlePaste}
                        placeholder={isNote ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Write notes inside..." : "เขียนโน้ตภายใน...") : 'พิมพ์ข้อความ... (Enter ส่ง, วางรูปได้)'}
                        rows={1} className="flex-1 bg-transparent text-sm text-surface-100 placeholder:text-surface-500 resize-none focus:outline-none min-h-[36px] max-h-[120px] py-2" />
                    <button id="send-button-desktop" onClick={handleSend} disabled={!messageText.trim() || sending}
                        className={`flex-shrink-0 p-2 rounded-xl transition-all duration-200 ${messageText.trim() ? isNote ? 'bg-amber-600 text-white' : 'bg-brand-600 text-white' : 'bg-surface-700 text-surface-500 cursor-not-allowed'}`}>
                        {sending ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
