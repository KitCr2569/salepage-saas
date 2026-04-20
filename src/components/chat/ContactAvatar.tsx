// ═══════════════════════════════════════════════════════════════
// ContactAvatar — แสดงรูปโปรไฟล์หรือ Generated Gradient Avatar
// ใช้เมื่อ Facebook App ยังไม่ผ่าน Review (ดึงรูปไม่ได้)
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState } from 'react';

// สีไล่โทน 12 เฉดสำหรับ generated avatar
const AVATAR_GRADIENTS = [
    ['#6366f1', '#8b5cf6'], // indigo → violet
    ['#f59e0b', '#ef4444'], // amber → red
    ['#10b981', '#06b6d4'], // emerald → cyan
    ['#ec4899', '#f43f5e'], // pink → rose
    ['#3b82f6', '#6366f1'], // blue → indigo
    ['#f97316', '#fb923c'], // orange
    ['#14b8a6', '#22d3ee'], // teal → cyan
    ['#a855f7', '#ec4899'], // purple → pink
    ['#84cc16', '#22c55e'], // lime → green
    ['#f43f5e', '#fb7185'], // rose
    ['#0ea5e9', '#38bdf8'], // sky
    ['#d946ef', '#a855f7'], // fuchsia → purple
];

function getGradientIndex(name: string): number {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % AVATAR_GRADIENTS.length;
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    // Thai name or single word — just first char
    return name.charAt(0).toUpperCase();
}

interface ContactAvatarProps {
    name: string;
    avatarUrl?: string | null;
    psid?: string | null; // Facebook PSID — used as fallback via /api/avatar/[psid]
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const SIZE_MAP = {
    sm: { container: 'w-8 h-8', text: 'text-xs' },
    md: { container: 'w-11 h-11', text: 'text-sm' },
    lg: { container: 'w-14 h-14', text: 'text-base' },
    xl: { container: 'w-20 h-20', text: 'text-xl' },
};

export function ContactAvatar({ name, avatarUrl, psid, size = 'md', className = '' }: ContactAvatarProps) {
    const [imgError, setImgError] = useState(false);
    const { container, text } = SIZE_MAP[size];

    const idx = getGradientIndex(name);
    const [from, to] = AVATAR_GRADIENTS[idx];
    const initials = getInitials(name);

    // Use stored avatarUrl, or fallback to proxy if we have a PSID
    const effectiveUrl = avatarUrl || (psid && !psid.startsWith('mock') ? `/api/avatar/${psid}` : null);
    const showImg = effectiveUrl && !imgError;

    return (
        <div
            className={`${container} rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${className}`}
            style={!showImg ? {
                background: `linear-gradient(135deg, ${from}, ${to})`,
            } : undefined}
        >
            {showImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={effectiveUrl}
                    alt={name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={() => setImgError(true)}
                />
            ) : (
                <span className={`${text} font-bold text-white select-none tracking-wide`}>
                    {initials}
                </span>
            )}
        </div>
    );
}
