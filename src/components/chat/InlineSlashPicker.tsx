'use client';

// ═══════════════════════════════════════════════════════════════
// Inline Slash Picker — Auto-popup when typing `/` commands
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import { Trans } from "@/components/Trans";

interface CannedReply {
    id: string;
    title: string;
    content: string;
    shortcut: string;
    category: string | null;
}

interface InlineSlashPickerProps {
    query: string;
    onSelect: (content: string) => void;
    onClose: () => void;
}

export function InlineSlashPicker({ query, onSelect, onClose }: InlineSlashPickerProps) {
    const { get } = useApi();
    const [replies, setReplies] = useState<CannedReply[]>([]);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function load() {
            try {
                const res = await get<CannedReply[]>('/api/chat/canned-replies');
                if (res.data) setReplies(res.data);
            } catch (err) {
                console.error('Failed to load canned replies:', err);
            }
        }
        load();
    }, [get]);

    const filtered = replies.filter(
        (r) =>
            r.shortcut.toLowerCase().includes('/' + query.toLowerCase()) ||
            r.title.toLowerCase().includes(query.toLowerCase()) ||
            r.content.toLowerCase().includes(query.toLowerCase())
    );

    // Reset selection when filter changes
    useEffect(() => {
        setSelectedIdx(0);
    }, [query]);

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (filtered.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIdx((prev) => (prev + 1) % filtered.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIdx((prev) => (prev - 1 + filtered.length) % filtered.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                if (filtered[selectedIdx]) {
                    onSelect(filtered[selectedIdx].content);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        },
        [filtered, selectedIdx, onSelect, onClose]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Scroll selected item into view
    useEffect(() => {
        const el = listRef.current?.children[selectedIdx] as HTMLElement;
        el?.scrollIntoView({ block: 'nearest' });
    }, [selectedIdx]);

    if (filtered.length === 0) {
        return (
            <div className="border-t border-surface-800 bg-surface-900/95 backdrop-blur-sm px-4 py-3 animate-slide-in">
                <div className="flex items-center gap-2 text-sm text-surface-500">
                    <span className="text-brand-400 font-mono">/</span>
                    <span>{<Trans th="ไม่พบคำสั่ง &quot;" en="Command not found'" />}{query}{<Trans th="&quot; — กด Esc เพื่อยกเลิก" en="' — Press Esc to cancel." />}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="border-t border-surface-800 bg-surface-900/95 backdrop-blur-sm max-h-[240px] overflow-y-auto animate-slide-in" ref={listRef}>
            <div className="px-3 py-1.5 text-[11px] text-surface-500 flex items-center justify-between sticky top-0 bg-surface-900 z-10">
                <span>{<Trans th="⚡ เลือกข้อความสำเร็จรูป (↑↓ เลื่อน • Enter เลือก • Esc ยกเลิก)" en="⚡ Select ready-made text (↑↓ Move • Enter Select • Esc Cancel)" />}</span>
                <span className="text-brand-400 font-mono">/{query}</span>
            </div>
            {filtered.map((reply, idx) => (
                <button
                    key={reply.id}
                    onClick={() => onSelect(reply.content)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${idx === selectedIdx
                            ? 'bg-brand-600/20 border-l-2 border-l-brand-500'
                            : 'hover:bg-surface-800 border-l-2 border-l-transparent'
                        }`}
                >
                    <span className="text-brand-400 font-mono text-sm flex-shrink-0 mt-0.5 w-14 text-right">
                        {reply.shortcut}
                    </span>
                    <div className="min-w-0">
                        <div className="text-sm font-medium text-surface-200">{reply.title}</div>
                        <p className="text-xs text-surface-500 truncate">{reply.content}</p>
                    </div>
                </button>
            ))}
        </div>
    );
}
