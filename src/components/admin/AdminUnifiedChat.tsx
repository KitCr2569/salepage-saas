"use client";

// ═══════════════════════════════════════════════════════════════
// AdminUnifiedChat — Directly renders chat dashboard components
// No more iframe! All components run natively inside the Sale Page
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";
import { InboxPanel } from "@/components/chat/inbox/InboxPanel";
import { ChatPanel } from "@/components/chat/ChatPanel";
import CustomerPanel from "@/components/chat/customer/CustomerPanel";
import { useApi } from "@/hooks/useApi";
import SettingsPanel from "@/components/chat/settings/SettingsPanel";
import AnalyticsPanel from "@/components/chat/analytics/AnalyticsPanel";
import OrdersPanel from "@/components/chat/orders/OrdersPanel";
import { useRealtimeInbox } from "@/hooks/useRealtimeInbox";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { Trans } from "@/components/Trans";

// ─── Types ───────────────────────────────────────────────────
interface ChatAgent {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'AGENT';
    avatarUrl: string | null;
}

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

type InboxAction = 'spam' | 'archive' | 'star' | 'unread' | 'resolve';

interface Conversation {
    id: string;
    status: string;
    contact: { displayName: string; avatarUrl: string | null; platformContactId: string };
    channel: { id: string; type: string; name: string };
    assignedAgent: { id: string; name: string } | null;
    hasMoreMessages?: boolean;
    oldestCursor?: string | null;
    messages: Array<{
        id: string; direction: string; type: string; content: string;
        imageUrl: string | null; sendStatus: string; senderName: string | null;
        senderAgentId: string | null; createdAt: string;
        senderAgent: { id: string; name: string; avatarUrl: string | null } | null;
    }>;
    notes: Array<{ id: string; content: string; createdAt: string; agent: { id: string; name: string } }>;
}

type ActiveView = 'inbox' | 'analytics' | 'orders' | 'settings';

interface AdminUnifiedChatProps {
    initialInbox?: unknown[] | null;
    initialChatToken?: string | null;
}

export default function AdminUnifiedChat({ initialInbox, initialChatToken }: AdminUnifiedChatProps = {}) {
    const [isAuthenticated, setIsAuthenticated] = useState(!!initialChatToken);
    const [agent, setAgent] = useState<ChatAgent | null>(null);
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [email, setEmail] = useState('admin@hdg.com');
    const [password, setPassword] = useState('admin123');
    const [activeView, setActiveView] = useState<ActiveView>('inbox');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [syncingHistory, setSyncingHistory] = useState(false);
    const [syncResult, setSyncResult] = useState<string | null>(null);
    const [mobileShowInbox, setMobileShowInbox] = useState(true);
    const [mobileShowCustomer, setMobileShowCustomer] = useState(false);

    // Inbox state — เริ่มจาก preloaded data ถ้ามี
    const [inboxItems, setInboxItems] = useState<InboxItem[]>((initialInbox as InboxItem[]) || []);
    const [inboxLoading, setInboxLoading] = useState(!initialInbox);
    const [loadingMore, setLoadingMore] = useState(false);
    const [channelFilter, setChannelFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const INBOX_LIMIT = 50;

    // Chat state
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [chatLoading, setChatLoading] = useState(false);
    // ⚡ Lazy load messages (Facebook-style)
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
    const [oldestCursor, setOldestCursor] = useState<string | null>(null);
    // ⚡ Client-side cache — instant switch (like Facebook)
    const conversationCache = useRef<Map<string, any>>(new Map());
    // ⚡ Track active conversation to prevent stale fetch overwriting state
    const activeConversationIdRef = useRef<string | null>(null);

    const { get } = useApi();

    // Check for existing auth on mount — skip if already have token from parent
    useEffect(() => {
        // ⚡ ถ้ามี token เชื่อมต่อจาก parent — เซ็ต authenticated ทันที ไม่ต้อง login เลย
        if (initialChatToken) {
            const savedAgent = localStorage.getItem('chat-agent');
            if (savedAgent) {
                try { setAgent(JSON.parse(savedAgent)); } catch { /* ignore */ }
            }
            setIsAuthenticated(true);
            return;
        }

        const token = localStorage.getItem('chat-auth-token');
        const savedAgent = localStorage.getItem('chat-agent');
        const tokenExpiry = localStorage.getItem('chat-token-expiry');

        // ⚡ ใช้ token เดิมถ้ายังไม่หมดอายุ (7 วัน)
        if (token && savedAgent && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
            try {
                setAgent(JSON.parse(savedAgent));
                setIsAuthenticated(true);
                return; // ← ไม่ต้อง login ใหม่ ประหยัดเวลามาก
            } catch {
                localStorage.removeItem('chat-auth-token');
                localStorage.removeItem('chat-agent');
                localStorage.removeItem('chat-token-expiry');
            }
        }
        // ⚡ Auto-login with default admin credentials
        fetch('/api/chat/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@hdg.com', password: 'admin123' }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data?.token) {
                    localStorage.setItem('chat-auth-token', data.data.token);
                    localStorage.setItem('chat-agent', JSON.stringify(data.data.agent));
                    localStorage.setItem('chat-token-expiry', String(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 วัน
                    setAgent(data.data.agent);
                    setIsAuthenticated(true);
                }
            })
            .catch(() => { /* will show manual login if auto-login fails */ });
    }, []);

    // Fetch inbox (page 1 = fresh load, page > 1 = append, silent=true means no main spinner)
    const fetchInbox = useCallback(async (silent = false, page = 1) => {
        if (!silent && page === 1) setInboxLoading(true);
        if (page > 1) setLoadingMore(true);
        try {
            const token = initialChatToken || localStorage.getItem('chat-auth-token');
            if (!token) return;
            const params = new URLSearchParams();
            if (channelFilter) params.set('channel', channelFilter);
            if (statusFilter) params.set('status', statusFilter);
            if (searchQuery) params.set('search', searchQuery);
            params.set('limit', String(INBOX_LIMIT));
            params.set('page', String(page));
            const res = await fetch(`/api/chat/inbox?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
            });
            if (!res.ok) return;
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                if (page === 1) {
                    setInboxItems(json.data);
                } else {
                    setInboxItems(prev => {
                        const existingIds = new Set(prev.map(i => i.id));
                        const newItems = json.data.filter((i: InboxItem) => !existingIds.has(i.id));
                        return [...prev, ...newItems];
                    });
                }
            }
            if (json.pagination) {
                setCurrentPage(json.pagination.page);
                setTotalPages(json.pagination.totalPages);
                setTotalCount(json.pagination.total);
            }
        } catch (err) {
            console.error('Failed to fetch inbox:', err);
        } finally {
            if (!silent && page === 1) setInboxLoading(false);
            setLoadingMore(false);
        }
    }, [initialChatToken, channelFilter, statusFilter, searchQuery]);

    // Load more conversations
    const loadMore = useCallback(() => {
        if (currentPage < totalPages && !loadingMore) {
            fetchInbox(true, currentPage + 1);
        }
    }, [currentPage, totalPages, loadingMore, fetchInbox]);

    // Always fetch fresh inbox when authenticated or filters change
    useEffect(() => {
        if (isAuthenticated) {
            fetchInbox();
        }
    }, [isAuthenticated, fetchInbox, channelFilter, statusFilter, searchQuery]);

    // ⚡ Auto-poll inbox ทุก 30 วินาที — fallback เมื่อ realtime ไม่ทำงาน
    useEffect(() => {
        if (!isAuthenticated) return;
        const timer = setInterval(() => fetchInbox(true), 30000);
        return () => clearInterval(timer);
    }, [isAuthenticated, fetchInbox]);

    // Fetch conversation detail (silent=true means no loading spinner)
    const fetchConversation = useCallback(async (id: string, silent = false) => {
        // ⚡ Show from cache instantly then refresh in background
        const cached = conversationCache.current.get(id);
        if (cached) {
            setConversation(cached);
            setHasMoreMessages(cached.hasMoreMessages || false);
            setOldestCursor(cached.oldestCursor || null);
            silent = true;
        } else if (!silent) {
            setChatLoading(true);
        }
        try {
            const res = await get<any>(`/api/chat/conversations/${id}`);
            // ⚡ Discard if user already switched to another conversation
            if (activeConversationIdRef.current !== id) return;
            if (res.data) {
                setConversation(prev => {
                    if (prev && prev.id === id) {
                        // Merge the newly fetched LATEST messages with our currently loaded OLDER messages
                        // We also filter out any optimistic messages since the real ones will be in res.data.messages
                        const newMsgIds = new Set(res.data.messages.map((m: any) => m.id));
                        const oldMessagesToKeep = prev.messages.filter(m => !newMsgIds.has(m.id) && !m.id.startsWith('optimistic-'));
                        
                        const mergedMessages = [ ...oldMessagesToKeep, ...res.data.messages ];
                        mergedMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                        const mergedData = {
                            ...res.data,
                            messages: mergedMessages,
                            hasMoreMessages: prev.hasMoreMessages,
                            oldestCursor: prev.oldestCursor
                        };
                        conversationCache.current.set(id, mergedData);
                        // We do not need to call setHasMore/setOldestCursor here because they are handled by the loadMoreMessages flow or initial fetch
                        return mergedData;
                    } else {
                        conversationCache.current.set(id, res.data);
                        setHasMoreMessages(res.data.hasMoreMessages || false);
                        setOldestCursor(res.data.oldestCursor || null);
                        return res.data;
                    }
                });
            }
        } catch (err) {
            console.error('Failed to fetch conversation:', err);
        } finally {
            if (!silent && activeConversationIdRef.current === id) setChatLoading(false);
        }
    }, [get]);

    // ⚡ Load older messages (cursor pagination)
    const loadMoreMessages = useCallback(async () => {
        if (!selectedConversationId || !oldestCursor || loadingMoreMessages) return;
        setLoadingMoreMessages(true);
        try {
            const res = await get<any>(`/api/chat/conversations/${selectedConversationId}?cursor=${encodeURIComponent(oldestCursor)}`);
            if (res.data?.messages?.length > 0) {
                setConversation(prev => {
                    if (!prev) return prev;
                    const mergedData = {
                        ...prev,
                        messages: [...res.data.messages, ...prev.messages],
                        hasMoreMessages: res.data.hasMoreMessages || false,
                        oldestCursor: res.data.oldestCursor || null
                    };
                    // Update cache so if background poll hits, we keep older messages
                    conversationCache.current.set(selectedConversationId, mergedData);
                    return mergedData;
                });
                setHasMoreMessages(res.data.hasMoreMessages || false);
                setOldestCursor(res.data.oldestCursor || null);
            } else {
                setHasMoreMessages(false);
            }
        } catch (err) {
            console.error('Failed to load more messages:', err);
        } finally {
            setLoadingMoreMessages(false);
        }
    }, [selectedConversationId, oldestCursor, loadingMoreMessages, get]);

    // Fetch conversation when selection changes
    useEffect(() => {
        activeConversationIdRef.current = selectedConversationId; // ⚡ Update ref first
        if (selectedConversationId) {
            fetchConversation(selectedConversationId);
        } else {
            setConversation(null);
        }
    }, [selectedConversationId, fetchConversation]);

    // ⚡ Auto-sync current conversation state to cache to prevent data loss on switch/poll
    useEffect(() => {
        if (conversation && selectedConversationId === conversation.id) {
            conversationCache.current.set(selectedConversationId, conversation);
        }
    }, [conversation, selectedConversationId]);

    // ⚡ Poll conversation ทุก 30 วินาที — fallback เมื่อ realtime ไม่ทำงาน
    useEffect(() => {
        if (!selectedConversationId || !isAuthenticated) return;
        const timer = setInterval(() => fetchConversation(selectedConversationId, true), 30000);
        return () => clearInterval(timer);
    }, [selectedConversationId, isAuthenticated, fetchConversation]);

    // Login handler
    const handleLogin = useCallback(async () => {
        setLoginError('');
        setLoginLoading(true);
        try {
            const res = await fetch('/api/chat/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setLoginError(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
                return;
            }
            localStorage.setItem('chat-auth-token', data.data.token);
            localStorage.setItem('chat-agent', JSON.stringify(data.data.agent));
            localStorage.setItem('chat-token-expiry', String(Date.now() + 7 * 24 * 60 * 60 * 1000));
            setAgent(data.data.agent);
            setIsAuthenticated(true);
        } catch {
            setLoginError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setLoginLoading(false);
        }
    }, [email, password]);

    // Logout
    const handleLogout = useCallback(() => {
        localStorage.removeItem('chat-auth-token');
        localStorage.removeItem('chat-agent');
        localStorage.removeItem('chat-token-expiry');
        setAgent(null);
        setIsAuthenticated(false);
        setSelectedConversationId(null);
        setConversation(null);
    }, []);

    // Refresh all — silently (no loading spinners)
    const handleMessageSent = useCallback(() => {
        if (selectedConversationId) {
            fetchConversation(selectedConversationId, true);
        }
        fetchInbox(true);
    }, [selectedConversationId, fetchConversation, fetchInbox]);

    const handleOptimisticMessage = useCallback((msg: Conversation['messages'][0]) => {
        setConversation(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                messages: [...prev.messages, msg],
            };
        });
        // ⚡ อัปเดต Inbox บนหน้าจอซ้ายมือทันทีที่กดส่ง! ไม่ต้องรอเซิร์ฟเวอร์
        if (selectedConversationId) {
            setInboxItems(prev => {
                const updated = [...prev];
                const index = updated.findIndex(i => i.id === selectedConversationId);
                if (index > -1) {
                    const [item] = updated.splice(index, 1);
                    updated.unshift({
                        ...item,
                        lastMessage: msg.type === 'IMAGE' ? '[รูปภาพ]' : msg.content.substring(0, 50),
                        lastMessageAt: msg.createdAt,
                        unreadCount: 0,
                    });
                }
                return updated;
            });
        }
    }, [selectedConversationId]);

    // ─── Inbox Quick Actions (⚠️ 🗑️ ⭐ ✉️ ✅) ────────────────────
    const handleInboxAction = useCallback(async (conversationId: string, action: InboxAction) => {
        const token = initialChatToken || localStorage.getItem('chat-auth-token');
        if (!token) return;

        const item = inboxItems.find(i => i.id === conversationId);
        if (!item) return;

        // Build PATCH body based on action
        let patchBody: Record<string, unknown> = {};
        switch (action) {
            case 'spam':
                patchBody = { isSpam: !item.isSpam };
                break;
            case 'archive':
                patchBody = { status: item.status === 'ARCHIVED' ? 'OPEN' : 'ARCHIVED' };
                break;
            case 'star':
                patchBody = { isStarred: !item.isStarred };
                break;
            case 'unread':
                patchBody = { unreadCount: item.unreadCount > 0 ? 0 : 1 };
                break;
            case 'resolve':
                patchBody = { status: item.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED' };
                break;
        }

        // ⚡ Optimistic update — อัปเดต UI ทันที ไม่ต้อรอ API
        setInboxItems(prev => prev.map(i => {
            if (i.id !== conversationId) return i;
            const updated = { ...i };
            if (patchBody.isSpam !== undefined) updated.isSpam = patchBody.isSpam as boolean;
            if (patchBody.isStarred !== undefined) updated.isStarred = patchBody.isStarred as boolean;
            if (patchBody.status !== undefined) updated.status = patchBody.status as string;
            if (patchBody.unreadCount !== undefined) updated.unreadCount = patchBody.unreadCount as number;
            return updated;
        }));

        // Fire API call
        try {
            await fetch(`/api/chat/conversations/${conversationId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(patchBody),
            });
        } catch (err) {
            console.error('Quick action failed:', err);
            // Revert on error — refetch inbox
            fetchInbox(true);
        }
    }, [initialChatToken, inboxItems, fetchInbox]);

    // ─── Realtime: อัปเดต inbox ทันทีเมื่อมีข้อความใหม่ ────────
    // ⚡ Smart update — ไม่ refetch ทั้ง list, แค่อัปเดตเฉพาะ item ที่มีข้อความใหม่
    const handleSmartInboxUpdate = useCallback((conversationId: string, inboxItem: InboxItem) => {
        setInboxItems(prev => {
            const updated = [...prev];
            const index = updated.findIndex(i => i.id === conversationId);
            if (index > -1) {
                // ย้ายขึ้นบนสุด + อัปเดตข้อมูล
                const [item] = updated.splice(index, 1);
                updated.unshift({
                    ...item,
                    contactName: inboxItem.contactName || item.contactName,
                    contactAvatar: inboxItem.contactAvatar || item.contactAvatar,
                    lastMessage: inboxItem.lastMessage,
                    lastMessageAt: inboxItem.lastMessageAt,
                    unreadCount: selectedConversationId === conversationId ? 0 : inboxItem.unreadCount,
                });
            } else {
                // Conversation ใหม่ — เพิ่มบนสุด
                updated.unshift(inboxItem);
                setTotalCount(c => c + 1);
            }
            return updated;
        });
    }, [selectedConversationId]);

    useRealtimeInbox({
        enabled: isAuthenticated,
        onUpdate: () => fetchInbox(true),
        onSmartUpdate: handleSmartInboxUpdate,
    });

    // ─── Realtime: รับข้อความใหม่ใน conversation ที่เปิดอยู่ ───
    // ⚡ ใช้ข้อมูลจาก broadcast โดยตรง — ไม่ refetch ทั้ง conversation
    useRealtimeChat({
        conversationId: selectedConversationId,
        onNewMessage: (msg) => {
            setConversation(prev => {
                if (!prev) return prev;
                // ป้องกัน duplicate
                if (prev.messages.some(m => m.id === msg.id)) return prev;
                return { ...prev, messages: [...prev.messages, msg] };
            });
        },
        onMessageDeleted: (msgId: string) => {
            setConversation(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    messages: prev.messages.filter(m => m.id !== msgId)
                };
            });
        },
        onMessageRead: (watermark) => {
            setConversation(prev => {
                if (!prev) return prev;
                // Update sendStatus to 'READ' for all OUTBOUND messages older than the watermark
                const updatedMessages = prev.messages.map(m => {
                    if (m.direction === 'OUTBOUND' && m.sendStatus !== 'READ') {
                        const msgTime = new Date(m.createdAt).getTime();
                        if (msgTime <= watermark) {
                            return { ...m, sendStatus: 'READ' };
                        }
                    }
                    return m;
                });
                return { ...prev, messages: updatedMessages };
            });
        },
    });

    const quickTabs = [
        { key: 'inbox' as const, label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "message box" : "กล่องข้อความ"), icon: '💬' },
        { key: 'analytics' as const, label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "statistics" : "สถิติ"), icon: '📊' },
        { key: 'orders' as const, label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Order" : "คำสั่งซื้อ"), icon: '🧾' },
        { key: 'settings' as const, label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Set up" : "ตั้งค่า"), icon: '⚙️' },
    ];

    // ─── Not yet authenticated — กำลัง auto-login ────────────
    if (!isAuthenticated) {
        return (
            <div className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[300px] gap-3">
                <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400">{<Trans th="กำลังเชื่อมต่อ รวมแชท..." en="Connecting, including chat..." />}</p>
            </div>
        );
    }

    // ─── Main Chat Dashboard ─────────────────────────────────
    return (
        <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'p-2 md:p-6'} flex flex-col h-full`}>
            {/* Header — hidden on mobile to maximize chat space */}
            <div className={`${isFullscreen ? 'px-4 py-3' : ''} mb-2 md:mb-4 hidden md:block`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <span className="text-white text-lg">🔗</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">{<Trans th="รวมแชท" en="Include chat" />}</h2>
                            <p className="text-xs text-gray-400"><Trans th="เข้าสู่ระบบเป็น" en="Login as" /> {agent?.name} ({agent?.role})</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <Trans th="ออนไลน์" en="online" />
                                                    </div>
                        <button
                            onClick={async () => {
                                if (syncingHistory) return;
                                setSyncingHistory(true);
                                setSyncResult(null);
                                try {
                                    const token = initialChatToken || localStorage.getItem('chat-auth-token');
                                    const res = await fetch('/api/meta/sync-history', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                                        body: JSON.stringify({ limit: 50 }),
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                        setSyncResult(`✅ ${data.stats.messages} ข้อความใหม่, ${data.stats.contacts} ผู้ติดต่อใหม่`);
                                        fetchInbox();
                                    } else {
                                        setSyncResult(`❌ ${data.error || 'ผิดพลาด'}`);
                                    }
                                } catch (err) {
                                    setSyncResult('❌ เชื่อมต่อไม่ได้');
                                } finally {
                                    setSyncingHistory(false);
                                    setTimeout(() => setSyncResult(null), 5000);
                                }
                            }}
                            disabled={syncingHistory}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-colors disabled:opacity-50"
                        >
                            {syncingHistory ? (
                                <><span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> {<Trans th="ซิงค์..." en="Sync..." />}</>
                            ) : (
                                <>{<Trans th="🔄 ซิงค์ FB" en="🔄 FB sync" />}</>
                            )}
                        </button>
                        <button onClick={() => setIsFullscreen(!isFullscreen)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                            {isFullscreen ? (typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? "🗗 Restore" : "🗗 ย่อ") : (typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? "⛶ Fullscreen" : "⛶ เต็มจอ")}
                        </button>

                    </div>
                </div>

                {syncResult && (
                    <div className="mt-2 px-3 py-2 rounded-lg bg-gray-50 text-xs font-medium text-gray-700 animate-pulse">
                        {syncResult}
                    </div>
                )}

                <div className="flex items-center gap-1 mt-4 bg-gray-50 p-1 rounded-xl flex-shrink-0">
                    {quickTabs.map((tab) => (
                        <button key={tab.key} onClick={() => setActiveView(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeView === tab.key
                                ? 'bg-white text-indigo-600 shadow-sm shadow-indigo-100 ring-1 ring-indigo-100'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                }`}>
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Mobile-only compact tabs */}
            <div className="md:hidden flex items-center gap-1 bg-gray-50 p-0.5 rounded-lg mx-0 mb-1 flex-shrink-0">
                {quickTabs.map((tab) => (
                    <button key={tab.key} onClick={() => setActiveView(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${activeView === tab.key
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-500'
                            }`}>
                        <span>{tab.icon}</span>
                        <span className="truncate">{tab.label}</span>
                    </button>
                ))}
                <button
                    onClick={async () => {
                        if (syncingHistory) return;
                        setSyncingHistory(true);
                        setSyncResult(null);
                        try {
                            const token = initialChatToken || localStorage.getItem('chat-auth-token');
                            const res = await fetch('/api/meta/sync-history', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                                body: JSON.stringify({ limit: 50 }),
                            });
                            const data = await res.json();
                            if (data.success) {
                                setSyncResult(`✅ ${data.stats.messages} ข้อความใหม่, ${data.stats.contacts} ผู้ติดต่อใหม่`);
                                fetchInbox();
                            } else {
                                setSyncResult(`❌ ${data.error || 'ผิดพลาด'}`);
                            }
                        } catch {
                            setSyncResult('❌ เชื่อมต่อไม่ได้');
                        } finally {
                            setSyncingHistory(false);
                            setTimeout(() => setSyncResult(null), 5000);
                        }
                    }}
                    disabled={syncingHistory}
                    className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                    {syncingHistory ? (
                        <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : '🔄'}
                </button>
            </div>
            {syncResult && (
                <div className="md:hidden mx-0 mb-1 px-3 py-1.5 rounded-lg bg-gray-50 text-xs font-medium text-gray-700 animate-pulse flex-shrink-0">
                    {syncResult}
                </div>
            )}

            {/* Main content — flex-1 fills remaining space */}
            <div className={`chat-container relative bg-white md:rounded-2xl overflow-hidden shadow-lg ring-1 ring-gray-200 flex-1 min-h-0 ${isFullscreen ? '' : 'md:min-h-[400px]'}`}>
                {activeView === 'inbox' && (
                    <div className="flex h-full">
                        {/* Inbox Panel — hidden on mobile when a conversation is selected */}
                        <div className={`w-full md:w-[340px] border-r border-surface-800 flex-shrink-0 overflow-y-auto ${!mobileShowInbox && selectedConversationId ? 'hidden md:block' : ''}`}>
                            <InboxPanel
                                items={inboxItems}
                                loading={inboxLoading}
                                loadingMore={loadingMore}
                                selectedId={selectedConversationId}
                                onSelect={(id: string) => { 
                                    setSelectedConversationId(id); 
                                    setMobileShowInbox(false); 
                                    setMobileShowCustomer(false); 
                                    // ⚡ ทันทีที่เลือก ให้เคลียร์ตัวเลข unread บนหน้าจอ
                                    setInboxItems(prev => prev.map(i => i.id === id ? { ...i, unreadCount: 0 } : i));
                                }}
                                channelFilter={channelFilter}
                                onChannelFilter={setChannelFilter}
                                statusFilter={statusFilter}
                                onStatusFilter={setStatusFilter}
                                searchQuery={searchQuery}
                                onSearch={setSearchQuery}
                                onRefresh={() => fetchInbox()}
                                onAction={handleInboxAction}
                                totalCount={totalCount}
                                hasMore={currentPage < totalPages}
                                onLoadMore={loadMore}
                            />
                        </div>

                        {/* Chat Panel — shown on mobile only when conversation selected */}
                        <div className={`flex-1 flex flex-col min-w-0 ${mobileShowInbox && selectedConversationId ? 'hidden md:flex' : ''} ${!selectedConversationId ? 'hidden md:flex' : ''}`}>
                            {/* Mobile back button */}
                            <div className="md:hidden px-3 py-2 border-b border-surface-800 flex items-center gap-2">
                                <button
                                    onClick={() => { setMobileShowInbox(true); setMobileShowCustomer(false); }}
                                    className="flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                    </svg>
                                    <Trans th="กล่องข้อความ" en="message box" />
                                                                    </button>
                                {selectedConversationId && conversation && (
                                    <button
                                        onClick={() => setMobileShowCustomer(!mobileShowCustomer)}
                                        className="ml-auto text-xs px-2 py-1 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 transition-colors"
                                    >
                                        {mobileShowCustomer ? '💬 แชท' : '👤 ข้อมูลลูกค้า'}
                                    </button>
                                )}
                            </div>

                            {/* Mobile: customer panel overlay */}
                            {mobileShowCustomer && selectedConversationId ? (
                                <div className="md:hidden flex-1 overflow-y-auto">
                                    <CustomerPanel
                                        key={selectedConversationId}
                                        conversationId={selectedConversationId}
                                        conversationData={conversation as any}
                                    />
                                </div>
                            ) : (
                                <ChatPanel
                                    key={selectedConversationId}
                                    conversation={conversation}
                                    loading={chatLoading}
                                    onMessageSent={handleMessageSent}
                                    onOptimisticMessage={handleOptimisticMessage}
                                    onMessageDeleted={(msgId: string) => {
                                        setConversation(prev => {
                                            if (!prev) return prev;
                                            return {
                                                ...prev,
                                                messages: prev.messages.filter(m => m.id !== msgId)
                                            };
                                        });
                                    }}
                                    hasMoreMessages={hasMoreMessages}
                                    loadingMoreMessages={loadingMoreMessages}
                                    onLoadMoreMessages={loadMoreMessages}
                                />
                            )}
                        </div>

                        {/* Customer Panel — desktop only — show immediately from inbox data */}
                        {selectedConversationId && (
                            <div className="hidden md:block w-[320px] border-l border-surface-800 flex-shrink-0 overflow-y-auto">
                                <CustomerPanel
                                    key={selectedConversationId}
                                    conversationId={selectedConversationId}
                                    conversationData={conversation as any}
                                    inboxItem={inboxItems.find(i => i.id === selectedConversationId)}
                                />
                            </div>
                        )}
                    </div>
                )}

                {activeView === 'analytics' && (
                    <AnalyticsPanel />
                )}

                {activeView === 'orders' && (
                    <OrdersPanel />
                )}

                {activeView === 'settings' && (
                    <SettingsPanel />
                )}
            </div>

            {/* Footer — hidden on mobile to maximize chat space */}
            <div className="hidden md:flex mt-3 items-center justify-between text-[11px] text-gray-400 flex-shrink-0">
                <span>{<Trans th="💡 ช่องทาง: Facebook Messenger, Instagram, LINE, WhatsApp, Zalo" en="💡 Channel: Facebook Messenger, Instagram, LINE, WhatsApp, Zalo" />}</span>
                <span>Unified Chat Dashboard — Integrated</span>
            </div>
        </div>
    );
}

