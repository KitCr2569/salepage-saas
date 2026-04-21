"use client";

import { Trans } from "@/components/Trans";

interface UsageBarProps {
    label: string;
    labelEn: string;
    current: number;
    max: number;
    icon?: string;
    onUpgrade?: () => void;
}

export default function UsageBar({ label, labelEn, current, max, icon = "📦", onUpgrade }: UsageBarProps) {
    const percent = max > 0 ? Math.min(100, (current / max) * 100) : 0;
    const isNearLimit = percent >= 80;
    const isAtLimit = current >= max;

    // Dynamic gradient based on usage
    const barGradient = isAtLimit
        ? "from-red-500 to-rose-600"
        : isNearLimit
            ? "from-amber-400 to-orange-500"
            : "from-emerald-400 to-teal-500";

    const bgColor = isAtLimit
        ? "bg-red-50 ring-red-200"
        : isNearLimit
            ? "bg-amber-50 ring-amber-200"
            : "bg-white ring-gray-100";

    return (
        <div className={`rounded-2xl p-4 shadow-sm ring-1 ${bgColor} transition-all`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <span className="text-sm font-bold text-gray-700">
                        <Trans th={label} en={labelEn} />
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-black ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-gray-800'}`}>
                        {current.toLocaleString()} / {max >= 99999 ? '∞' : max.toLocaleString()}
                    </span>
                    {isAtLimit && onUpgrade && (
                        <button
                            onClick={onUpgrade}
                            className="px-3 py-1 bg-gradient-to-r from-orange-400 to-pink-500 text-white text-xs font-bold rounded-lg hover:shadow-md transition-all animate-pulse"
                        >
                            <Trans th="อัปเกรด" en="Upgrade" />
                        </button>
                    )}
                </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200/60 rounded-full h-2.5 overflow-hidden">
                <div
                    className={`bg-gradient-to-r ${barGradient} h-2.5 rounded-full transition-all duration-700 ease-out`}
                    style={{ width: `${percent}%` }}
                />
            </div>

            {/* Warning messages */}
            {isAtLimit && (
                <p className="text-xs text-red-600 font-medium mt-2 flex items-center gap-1">
                    <span>⚠️</span>
                    <Trans
                        th="ถึงขีดจำกัดแล้ว — กรุณาอัปเกรดแพ็กเกจเพื่อเพิ่มเติม"
                        en="Limit reached — please upgrade to add more"
                    />
                </p>
            )}
            {isNearLimit && !isAtLimit && (
                <p className="text-xs text-amber-600 font-medium mt-2 flex items-center gap-1">
                    <span>💡</span>
                    <Trans
                        th={`เหลืออีก ${max - current} ชิ้น — ใกล้ถึงขีดจำกัดแล้ว`}
                        en={`${max - current} remaining — nearing the limit`}
                    />
                </p>
            )}
        </div>
    );
}
