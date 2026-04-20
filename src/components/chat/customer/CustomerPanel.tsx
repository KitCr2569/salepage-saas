'use client';

// ═══════════════════════════════════════════════════════════════
// Customer Panel — Contact info, tags, notes, agent assignment
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import { CHANNEL_CONFIG, STATUS_CONFIG } from '@/lib/chat-types';
import CreateOrderModal from '@/components/chat/orders/CreateOrderModal';
import { ContactAvatar } from '@/components/chat/ContactAvatar';
import { Trans } from "@/components/Trans";

interface EcommerceOrder {
    id: string;
    orderNumber: string;
    total: number;
    paymentStatus: string;
    status: string;
    createdAt: string;
}

interface ConversationDetail {
    id: string;
    status: string;
    contact: {
        id: string;
        displayName: string;
        avatarUrl: string | null;
        email: string | null;
        phone: string | null;
        platformContactId: string;
        metadata: Record<string, unknown>;
        createdAt: string;
    };
    channel: { id: string; type: string; name: string };
    assignedAgent: { id: string; name: string; email: string; avatarUrl: string | null } | null;
    tags: Array<{ tag: { id: string; name: string; color: string } }>;
    notes: Array<{
        id: string;
        content: string;
        createdAt: string;
        agent: { id: string; name: string };
    }>;
    ecommerceOrders?: EcommerceOrder[];
}

interface Agent {
    id: string;
    name: string;
    email: string;
    role: string;
    isOnline: boolean;
}

interface InboxItem {
    id: string;
    contactName: string;
    contactAvatar: string | null;
    channelType: string;
    status: string;
    assignedAgent: string | null;
}

interface CustomerPanelProps {
    conversationId: string;
    conversationData?: ConversationDetail | null; // ⚡ Pass from parent to skip fetch
    inboxItem?: InboxItem; // ⚡ Instant preview before API loads
}

export default function CustomerPanel({ conversationId, conversationData, inboxItem }: CustomerPanelProps) {
    const { get, patch, post } = useApi();
    const [conversation, setConversation] = useState<ConversationDetail | null>(conversationData || null);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [newNote, setNewNote] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [showAgentDropdown, setShowAgentDropdown] = useState(false);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [loading, setLoading] = useState(!conversationData); // ⚡ Skip loading if data provided

    // Only fetch if no data passed from parent
    const fetchDetail = useCallback(async () => {
        try {
            const res = await get<ConversationDetail>(`/api/chat/conversations/${conversationId}`);
            if (res.data) setConversation(res.data);
        } catch (err) {
            console.error('Failed to load conversation detail:', err);
        } finally {
            setLoading(false);
        }
    }, [get, conversationId]);

    useEffect(() => {
        if (conversationData) {
            // ⚡ Use provided data immediately, refresh silently
            setConversation(conversationData);
            setLoading(false);
        } else {
            setLoading(true);
            fetchDetail();
        }
    }, [conversationId, conversationData, fetchDetail]);

    const onUpdate = useCallback(() => {
        fetchDetail();
    }, [fetchDetail]);

    // Load agents once globally
    useEffect(() => {
        async function load() {
            try {
                const res = await get<Agent[]>('/api/chat/agents');
                if (res.data) setAgents(res.data);
            } catch (err) {
                console.error('Failed to load agents:', err);
            }
        }
        load();
    }, []); // ⚡ Empty deps — only load once

    // ⚡ Show instantly from inboxItem while loading
    if ((loading || !conversation) && inboxItem) {
        return (
            <div className="h-full flex flex-col overflow-y-auto">
                {/* Instant header from inbox data */}
                <div className="p-5 border-b border-surface-800 text-center">
                    <div className="flex justify-center mb-3">
                        <ContactAvatar
                            name={inboxItem.contactName}
                            avatarUrl={inboxItem.contactAvatar}
                            psid={(inboxItem as any).contactPsid}
                            size="xl"
                        />
                    </div>
                    <h3 className="font-semibold text-surface-100">{inboxItem.contactName}</h3>
                    <div className="flex items-center justify-center gap-1 mt-1">
                        <span className="text-xs text-surface-400">
                            {CHANNEL_CONFIG[inboxItem.channelType as keyof typeof CHANNEL_CONFIG]?.icon}{' '}
                            {CHANNEL_CONFIG[inboxItem.channelType as keyof typeof CHANNEL_CONFIG]?.label}
                        </span>
                    </div>
                </div>
                {/* Loading skeleton for rest */}
                <div className="p-4 space-y-3 animate-pulse">
                    <div className="h-3 shimmer w-1/2" />
                    <div className="h-3 shimmer w-3/4" />
                    <div className="h-3 shimmer w-2/3" />
                </div>
            </div>
        );
    }

    if (loading || !conversation) {
        return (
            <div className="p-4 space-y-4 animate-fade-in">
                <div className="mx-auto w-16 h-16 rounded-full shimmer" />
                <div className="h-4 shimmer w-2/3 mx-auto" />
                <div className="h-3 shimmer w-1/2 mx-auto" />
                <div className="space-y-2 mt-4">
                    <div className="h-3 shimmer w-full" />
                    <div className="h-3 shimmer w-3/4" />
                </div>
            </div>
        );
    }

    const contact = conversation.contact;
    const channelConfig = CHANNEL_CONFIG[conversation.channel.type as keyof typeof CHANNEL_CONFIG];
    const statusConfig = STATUS_CONFIG[conversation.status as keyof typeof STATUS_CONFIG];

    async function handleAssign(agentId: string) {
        try {
            await patch(`/api/chat/conversations/${conversation!.id}`, { assignedAgentId: agentId });
            setShowAgentDropdown(false);
            onUpdate();
        } catch (err) {
            console.error('Assign failed:', err);
        }
    }

    async function handleStatusChange(status: string) {
        try {
            await patch(`/api/chat/conversations/${conversation!.id}`, { status });
            onUpdate();
        } catch (err) {
            console.error('Status change failed:', err);
        }
    }

    async function handleAddNote() {
        if (!newNote.trim()) return;
        setSavingNote(true);
        try {
            await post('/api/chat/messages/send', {
                conversationId: conversation!.id,
                type: 'NOTE',
                content: newNote.trim(),
            });
            setNewNote('');
            onUpdate();
        } catch (err) {
            console.error('Add note failed:', err);
        } finally {
            setSavingNote(false);
        }
    }

    return (
        <div className="h-full flex flex-col overflow-y-auto">
            {/* Contact Header */}
            <div className="p-5 border-b border-surface-800 text-center">
                <div className="flex justify-center mb-3">
                    <ContactAvatar
                        name={contact.displayName}
                        avatarUrl={contact.avatarUrl}
                        psid={contact.platformContactId}
                        size="xl"
                    />
                </div>
                <h3 className="font-semibold text-surface-100">{contact.displayName}</h3>
                <div className="flex items-center justify-center gap-1 mt-1">
                    <span className="text-xs" style={{ color: channelConfig?.color }}>
                        {channelConfig?.icon} {channelConfig?.label}
                    </span>
                </div>
            </div>

            {/* Contact Info */}
            <div className="p-4 border-b border-surface-800 space-y-3">
                <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">{<Trans th="ข้อมูลลูกค้า" en="Customer information" />}</h4>

                <div className="space-y-2">
                    {contact.email && (
                        <div className="flex items-center gap-2 text-sm">
                            <svg className="w-4 h-4 text-surface-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="text-surface-300 truncate">{contact.email}</span>
                        </div>
                    )}
                    {contact.phone && (
                        <div className="flex items-center gap-2 text-sm">
                            <svg className="w-4 h-4 text-surface-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="text-surface-300">{contact.phone}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-surface-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                        <span className="text-surface-500 text-xs font-mono truncate">{contact.platformContactId}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-surface-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-surface-500 text-xs">
                            <Trans th="เริ่มติดต่อ" en="Start contacting" /> {new Date(contact.createdAt).toLocaleDateString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'), { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Bangkok' })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Status & Assignment */}
            <div className="p-4 border-b border-surface-800 space-y-3">
                <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">{<Trans th="สถานะ & เจ้าหน้าที่" en="Status & Officer" />}</h4>

                {/* Status buttons */}
                <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((status) => {
                        const config = STATUS_CONFIG[status];
                        const isActive = conversation.status === status;
                        return (
                            <button
                                key={status}
                                onClick={() => handleStatusChange(status)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${isActive
                                    ? 'border-transparent font-semibold'
                                    : 'border-surface-700 text-surface-400 hover:border-surface-600'
                                    }`}
                                style={
                                    isActive
                                        ? { backgroundColor: `${config.color}20`, color: config.color }
                                        : undefined
                                }
                            >
                                {config.label}
                            </button>
                        );
                    })}
                </div>

                {/* Agent assignment */}
                <div className="relative">
                    <button
                        onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                        className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-sm text-surface-300">
                                {conversation.assignedAgent?.name || (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "not yet assigned" : "ยังไม่ได้มอบหมาย")}
                            </span>
                        </div>
                        <svg className="w-4 h-4 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {showAgentDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 glass-card py-1 z-20 max-h-[200px] overflow-y-auto">
                            {agents.map((agent) => (
                                <button
                                    key={agent.id}
                                    onClick={() => handleAssign(agent.id)}
                                    className="w-full text-left px-3 py-2 hover:bg-surface-800 transition-colors flex items-center gap-2"
                                >
                                    <div className={`${agent.isOnline ? 'status-dot-online' : 'status-dot-offline'}`} />
                                    <div>
                                        <div className="text-sm text-surface-200">{agent.name}</div>
                                        <div className="text-[11px] text-surface-500">{agent.role === 'ADMIN' ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "caretaker" : "ผู้ดูแล") : 'เจ้าหน้าที่'}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Order */}
            <div className="p-4 border-b border-surface-800">
                <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">{<Trans th="คำสั่งซื้อ" en="Order" />}</h4>
                <button
                    onClick={() => setShowOrderModal(true)}
                    style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#fff',
                        padding: '10px 16px',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                    }}
                >
                    <Trans th="🧾 เปิดบิล / สร้างคำสั่งซื้อ" en="🧾 Open a bill / Create an order." />
                                    </button>

                {/* eCommerce Web Orders */}
                {conversation.ecommerceOrders && conversation.ecommerceOrders.length > 0 && (
                    <div className="mt-4 space-y-2">
                        {conversation.ecommerceOrders.map((order) => (
                            <div key={order.id} className="bg-surface-800/50 rounded-lg p-3 text-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-semibold text-surface-200">#{order.orderNumber}</span>
                                    <span className="text-xs text-brand-400">
                                        ฿{order.total.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-surface-400">
                                    <span>
                                        <Trans th="สถานะจ่าย:" en="Paid Status:" /> {order.paymentStatus === 'PAID' ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "✅ Paid" : "✅ จ่ายแล้ว") : '⏳ รอจ่าย'}
                                    </span>
                                    <span>•</span>
                                    <span>
                                        <Trans th="จัดส่ง:" en="Delivery:" /> {order.status === 'SHIPPED' ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "📦 Sent" : "📦 ส่งแล้ว") : '⏳ รอดำเนินการ'}
                                    </span>
                                </div>
                                <div className="text-[10px] text-surface-500 mt-2">
                                    {new Date(order.createdAt).toLocaleString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'), { timeZone: 'Asia/Bangkok' })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Tags */}
            <div className="p-4 border-b border-surface-800">
                <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">{<Trans th="แท็ก" en="Tags" />}</h4>
                <div className="flex flex-wrap gap-1.5">
                    {conversation.tags.length === 0 ? (
                        <span className="text-xs text-surface-600">{<Trans th="ไม่มีแท็ก" en="No tags" />}</span>
                    ) : (
                        conversation.tags.map(({ tag }) => (
                            <span
                                key={tag.id}
                                className="badge text-xs"
                                style={{
                                    backgroundColor: `${tag.color}20`,
                                    color: tag.color,
                                    borderColor: `${tag.color}40`,
                                    borderWidth: 1,
                                }}
                            >
                                {tag.name}
                            </span>
                        ))
                    )}
                </div>
            </div>

            {/* Internal Notes */}
            <div className="p-4 flex-1">
                <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">{<Trans th="โน้ตภายใน" en="internal note" />}</h4>

                {/* Add note */}
                <div className="mb-3">
                    <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Write a note..." : "เขียนโน้ต...")}
                        className="input-field !text-sm !py-2 resize-none"
                        rows={2}
                    />
                    <button
                        onClick={handleAddNote}
                        disabled={!newNote.trim() || savingNote}
                        className="btn-secondary !text-xs mt-2"
                    >
                        {savingNote ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Recording..." : "กำลังบันทึก...") : '💾 บันทึกโน้ต'}
                    </button>
                </div>

                {/* Notes list */}
                <div className="space-y-2">
                    {conversation.notes.map((note) => (
                        <div key={note.id} className="bg-surface-800/50 rounded-lg p-3">
                            <p className="text-sm text-surface-300 whitespace-pre-wrap">{note.content}</p>
                            <div className="flex items-center gap-2 mt-2 text-[11px] text-surface-500">
                                <span>👤 {note.agent.name}</span>
                                <span>•</span>
                                <span>
                                    {new Date(note.createdAt).toLocaleString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'), {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        timeZone: 'Asia/Bangkok',
                                    })}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Order Modal */}
            {showOrderModal && (
                <CreateOrderModal
                    conversationId={conversation!.id}
                    contactId={conversation!.contact.id}
                    customerName={conversation!.contact.displayName}
                    customerPhone={conversation!.contact.phone || undefined}
                    onClose={() => setShowOrderModal(false)}
                    onCreated={() => {
                        // Small delay to let server create order summary message
                        setTimeout(() => onUpdate(), 500);
                    }}
                />
            )}
        </div>
    );
}
