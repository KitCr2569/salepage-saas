'use client';

// ═══════════════════════════════════════════════════════════════
// Quick Replies — Canned message picker
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { Trans } from "@/components/Trans";

interface CannedReply {
    id: string;
    title: string;
    content: string;
    shortcut: string;
    category: string | null;
}

interface QuickRepliesProps {
    onSelect: (content: string) => void;
    onClose: () => void;
}

export function QuickReplies({ onSelect, onClose }: QuickRepliesProps) {
    const { get } = useApi();
    const [replies, setReplies] = useState<CannedReply[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await get<CannedReply[]>('/api/chat/canned-replies');
                if (res.data) setReplies(res.data);
            } catch (err) {
                console.error('Failed to load canned replies:', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [get]);

    const filtered = replies.filter(
        (r) =>
            r.title.toLowerCase().includes(search.toLowerCase()) ||
            r.shortcut.toLowerCase().includes(search.toLowerCase()) ||
            r.content.toLowerCase().includes(search.toLowerCase())
    );

    // Group by category
    const categories = new Map<string, CannedReply[]>();
    for (const r of filtered) {
        const cat = r.category || (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "general" : "ทั่วไป");
        if (!categories.has(cat)) categories.set(cat, []);
        categories.get(cat)!.push(r);
    }

    return (
        <div className="border-t border-surface-800 bg-surface-900/95 backdrop-blur-sm max-h-[300px] overflow-y-auto animate-slide-in">
            {/* Header */}
            <div className="sticky top-0 bg-surface-900 px-4 py-2 border-b border-surface-800 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-surface-200">{<Trans th="⚡ ข้อความสำเร็จรูป" en="⚡ Ready-made text" />}</span>
                </div>
                <button onClick={onClose} className="btn-icon !p-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Search */}
            <div className="px-4 py-2">
                <input
                    type="text"
                    placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Search... (e.g. /hi)" : "ค้นหา... (เช่น /hi)")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-field !py-1.5 !text-sm"
                    autoFocus
                />
            </div>

            {/* Replies list */}
            {loading ? (
                <div className="p-4 text-center text-sm text-surface-500">{<Trans th="กำลังโหลด..." en="Loading..." />}</div>
            ) : filtered.length === 0 ? (
                <div className="p-4 text-center text-sm text-surface-500">{<Trans th="ไม่พบข้อความสำเร็จรูป" en="Cannot find ready-made message." />}</div>
            ) : (
                <div className="px-2 pb-2">
                    {Array.from(categories.entries()).map(([cat, items]) => (
                        <div key={cat}>
                            <div className="px-2 py-1 text-[11px] font-semibold text-surface-500 uppercase tracking-wider">
                                {cat}
                            </div>
                            {items.map((reply) => (
                                <button
                                    key={reply.id}
                                    onClick={() => onSelect(reply.content)}
                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-800 transition-colors group"
                                >
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-sm font-medium text-surface-200 group-hover:text-surface-100">
                                            {reply.title}
                                        </span>
                                        <span className="text-[11px] text-brand-400 font-mono">{reply.shortcut}</span>
                                    </div>
                                    <p className="text-xs text-surface-500 truncate">{reply.content}</p>
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
