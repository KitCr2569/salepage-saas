'use client';

// ═══════════════════════════════════════════════════════════════
// Inbox Panel — Conversation list with filters
// ═══════════════════════════════════════════════════════════════

import { CHANNEL_CONFIG, STATUS_CONFIG } from '@/lib/chat-types';
import { ContactAvatar } from '@/components/chat/ContactAvatar';
import { Trans } from "@/components/Trans";

interface InboxItem {
    id: string;
    contactName: string;
    contactAvatar: string | null;
    contactPsid?: string | null;
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

interface InboxPanelProps {
    items: InboxItem[];
    loading: boolean;
    loadingMore: boolean;
    selectedId: string | null;
    onSelect: (id: string) => void;
    channelFilter: string;
    onChannelFilter: (v: string) => void;
    statusFilter: string;
    onStatusFilter: (v: string) => void;
    searchQuery: string;
    onSearch: (v: string) => void;
    onRefresh?: () => void;
    onAction?: (id: string, action: InboxAction) => void;
    totalCount: number;
    hasMore: boolean;
    onLoadMore: () => void;
}

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    const isEn = typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en';

    if (diff < 60) return isEn ? "Just now" : "เมื่อสักครู่";
    if (diff < 3600) return isEn ? `${Math.floor(diff / 60)} min` : `${Math.floor(diff / 60)} นาที`;
    if (diff < 86400) return isEn ? `${Math.floor(diff / 3600)} hr` : `${Math.floor(diff / 3600)} ชม.`;
    if (diff < 604800) return isEn ? `${Math.floor(diff / 86400)} days` : `${Math.floor(diff / 86400)} วัน`;
    return date.toLocaleDateString(isEn ? 'en-US' : 'th-TH', { month: 'short', day: 'numeric' });
}

function getChannelIcon(type: string): string {
    const config = CHANNEL_CONFIG[type as keyof typeof CHANNEL_CONFIG];
    return config?.icon || '💬';
}

function getChannelColor(type: string): string {
    const config = CHANNEL_CONFIG[type as keyof typeof CHANNEL_CONFIG];
    return config?.color || '#6B7280';
}

export function InboxPanel({
    items,
    loading,
    loadingMore,
    selectedId,
    onSelect,
    channelFilter,
    onChannelFilter,
    statusFilter,
    onStatusFilter,
    searchQuery,
    onSearch,
    onRefresh,
    onAction,
    totalCount,
    hasMore,
    onLoadMore,
}: InboxPanelProps) {
    const totalUnread = items.reduce((sum, item) => sum + item.unreadCount, 0);

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-surface-800">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2">
                        <Trans th="กล่องข้อความ" en="message box" />
                                                {totalUnread > 0 && (
                            <span className="badge-unread text-[11px] px-1.5">{totalUnread}</span>
                        )}
                    </h2>
                    <button className="btn-icon !p-1.5" title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Refresh" : "รีเฟรช")} onClick={() => onRefresh?.()}>
                        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                    <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        id="inbox-search"
                        type="text"
                        placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Search for a name or message..." : "ค้นหาชื่อหรือข้อความ...")}
                        value={searchQuery}
                        onChange={(e) => onSearch(e.target.value)}
                        className="input-field !pl-10 !py-2 !text-sm !rounded-lg"
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    <select
                        id="channel-filter"
                        value={channelFilter}
                        onChange={(e) => onChannelFilter(e.target.value)}
                        className="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-surface-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                        <option value="">{<Trans th="ทุกช่องทาง" en="every channel" />}</option>
                        <option value="MESSENGER">💬 Messenger</option>
                        <option value="INSTAGRAM">📸 Instagram</option>
                        <option value="LINE">💚 LINE</option>
                        <option value="WHATSAPP">📱 WhatsApp</option>
                        <option value="ZALO">🟦 Zalo</option>
                    </select>
                    <select
                        id="status-filter"
                        value={statusFilter}
                        onChange={(e) => onStatusFilter(e.target.value)}
                        className="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-surface-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                        <option value="">{<Trans th="ทุกสถานะ" en="every status" />}</option>
                        <option value="OPEN">{<Trans th="🟡 เปิด" en="🟡 Open" />}</option>
                        <option value="ASSIGNED">{<Trans th="🔵 มอบหมายแล้ว" en="🔵 Assigned" />}</option>
                        <option value="RESOLVED">{<Trans th="🟢 แก้ไขแล้ว" en="🟢 Edited" />}</option>
                        <option value="ARCHIVED">{<Trans th="⚪ เก็บถาวร" en="⚪ Archive" />}</option>
                    </select>
                </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="p-4 space-y-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex gap-3 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                                <div className="w-11 h-11 rounded-full shimmer flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 shimmer w-2/3" />
                                    <div className="h-3 shimmer w-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                        </div>
                        <p className="text-surface-500 text-sm">{<Trans th="ไม่พบการสนทนา" en="Conversation not found" />}</p>
                    </div>
                ) : (
                    items.map((item) => {
                        const isSelected = item.id === selectedId;
                        const hasUnread = item.unreadCount > 0;
                        const statusConfig = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG];

                        return (
                            <div
                                key={item.id}
                                className={`group relative w-full text-left border-b border-surface-800/50 transition-all duration-150
                  ${isSelected
                                        ? 'bg-brand-600/10 border-l-2 border-l-brand-500'
                                        : 'hover:bg-surface-800/50 border-l-2 border-l-transparent'
                                    }
                  ${hasUnread ? 'bg-surface-900/80' : ''}
                  ${item.isSpam ? 'opacity-60' : ''}
                `}
                            >
                                {/* Quick action buttons — appear on hover */}
                                {onAction && (
                                    <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-surface-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-surface-700 px-1 py-0.5">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onAction(item.id, 'spam'); }}
                                            title={item.isSpam ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Cancel spam" : "ยกเลิกสแปม") : 'ทำเครื่องหมายสแปม'}
                                            className={`p-1.5 rounded-md transition-colors text-xs hover:bg-amber-500/20 ${
                                                item.isSpam ? 'text-amber-400' : 'text-surface-500 hover:text-amber-400'
                                            }`}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onAction(item.id, 'archive'); }}
                                            title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "archive" : "เก็บถาวร")}
                                            className="p-1.5 rounded-md transition-colors text-xs text-surface-500 hover:text-red-400 hover:bg-red-500/20"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onAction(item.id, 'star'); }}
                                            title={item.isStarred ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "remove the stars" : "เอาดาวออก") : 'ติดดาว'}
                                            className={`p-1.5 rounded-md transition-colors text-xs hover:bg-yellow-500/20 ${
                                                item.isStarred ? 'text-yellow-400' : 'text-surface-500 hover:text-yellow-400'
                                            }`}
                                        >
                                            <svg className="w-3.5 h-3.5" fill={item.isStarred ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onAction(item.id, 'unread'); }}
                                            title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Mark unread" : "ทำเครื่องหมายยังไม่อ่าน")}
                                            className="p-1.5 rounded-md transition-colors text-xs text-surface-500 hover:text-blue-400 hover:bg-blue-500/20"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onAction(item.id, 'resolve'); }}
                                            title={item.status === 'RESOLVED' ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Newly opened" : "เปิดใหม่") : 'แก้ไขแล้ว'}
                                            className={`p-1.5 rounded-md transition-colors text-xs hover:bg-emerald-500/20 ${
                                                item.status === 'RESOLVED' ? 'text-emerald-400' : 'text-surface-500 hover:text-emerald-400'
                                            }`}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </button>
                                    </div>
                                )}

                                <button
                                    onClick={() => onSelect(item.id)}
                                    className="w-full text-left px-4 py-3 flex gap-3"
                                >
                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0">
                                        <ContactAvatar
                                            name={item.contactName}
                                            avatarUrl={item.contactAvatar}
                                            psid={item.contactPsid}
                                            size="md"
                                        />
                                        {/* Channel badge */}
                                        <div
                                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] border-2 border-surface-900"
                                            style={{ backgroundColor: getChannelColor(item.channelType) }}
                                        >
                                            {getChannelIcon(item.channelType)}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className={`text-sm truncate flex items-center gap-1 ${hasUnread ? 'font-semibold text-surface-100' : 'font-medium text-surface-300'}`}>
                                                {item.isStarred && <span className="text-yellow-400 text-[10px] flex-shrink-0">★</span>}
                                                {item.isSpam && <span className="text-amber-400 text-[10px] flex-shrink-0">⚠</span>}
                                                {item.contactName}
                                            </span>
                                            <span className="text-[11px] text-surface-500 flex-shrink-0 ml-2">
                                                {timeAgo(item.lastMessageAt)}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <p className={`text-xs truncate ${hasUnread ? 'text-surface-300' : 'text-surface-500'}`}>
                                                {item.lastMessage || (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "No message" : "ไม่มีข้อความ")}
                                            </p>
                                            {hasUnread && (
                                                <span className="badge-unread text-[10px] ml-2 flex-shrink-0">
                                                    {item.unreadCount}
                                                </span>
                                            )}
                                        </div>

                                        {/* Tags */}
                                        {item.tags.length > 0 && (
                                            <div className="flex gap-1 mt-1 flex-wrap">
                                                {item.tags.slice(0, 3).map((tag) => (
                                                    <span
                                                        key={tag.id}
                                                        className="badge text-[10px] px-1.5 py-0"
                                                        style={{
                                                            backgroundColor: `${tag.color}20`,
                                                            color: tag.color,
                                                        }}
                                                    >
                                                        {tag.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Assigned + Status */}
                                        <div className="flex items-center gap-2 mt-1">
                                            {item.assignedAgent && (
                                                <span className="text-[10px] text-surface-500">
                                                    👤 {item.assignedAgent}
                                                </span>
                                            )}
                                            {statusConfig && (
                                                <span
                                                    className="text-[10px] font-medium"
                                                    style={{ color: statusConfig.color }}
                                                >
                                                    {statusConfig.label}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            </div>
                        );
                    })
                )}

                {/* Load more button */}
                {!loading && hasMore && (
                    <div className="p-3 border-t border-surface-800/50">
                        <button
                            onClick={onLoadMore}
                            disabled={loadingMore}
                            className="w-full py-2 px-4 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs font-medium transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loadingMore ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                    <Trans th="กำลังโหลด..." en="Loading..." />
                                                                    </>
                            ) : (
                                <>
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                    </svg>
                                    {<Trans th="โหลดเพิ่มเติม (" en="Additional load (" />}{items.length} / {totalCount})
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Footer stats */}
            <div className="px-4 py-2 border-t border-surface-800 text-xs text-surface-500 flex justify-between">
                <span><Trans th="แสดง" en="show" /> {items.length} / {totalCount} {<Trans th="รายการ" en="list" />}</span>
                {totalUnread > 0 && <span className="text-brand-400">{totalUnread} {<Trans th="ยังไม่อ่าน" en="Haven't read it yet." />}</span>}
            </div>
        </div>
    );
}
