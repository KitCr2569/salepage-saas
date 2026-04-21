"use client";

import { Trans } from "@/components/Trans";

interface FeatureLockProps {
    /** Name of the feature that's locked */
    featureName: string;
    featureNameEn: string;
    /** The plan slug needed to unlock */
    requiredPlan?: string | null;
    /** Custom icon */
    icon?: string;
    /** Navigate to upgrade page */
    onUpgrade?: () => void;
    /** If true, render as full overlay over children */
    overlay?: boolean;
    children?: React.ReactNode;
}

const planDisplayNames: Record<string, { th: string; en: string }> = {
    starter: { th: "เริ่มต้น", en: "Starter" },
    pro: { th: "โปร", en: "Pro" },
    premium: { th: "พรีเมียม", en: "Premium" },
};

export default function FeatureLock({
    featureName,
    featureNameEn,
    requiredPlan,
    icon = "🔒",
    onUpgrade,
    overlay = false,
    children,
}: FeatureLockProps) {
    const planLabel = requiredPlan && planDisplayNames[requiredPlan];

    const lockContent = (
        <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                <span className="text-4xl">{icon}</span>
            </div>
            <div>
                <h3 className="text-lg font-black text-gray-800">
                    <Trans th={featureName} en={featureNameEn} />
                </h3>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">
                    <Trans
                        th="ฟีเจอร์นี้ต้องการแพ็กเกจที่สูงกว่า กรุณาอัปเกรดเพื่อปลดล็อค"
                        en="This feature requires a higher plan. Please upgrade to unlock."
                    />
                </p>
                {planLabel && (
                    <p className="text-xs text-gray-400 mt-1">
                        <Trans
                            th={`ต้องการแพ็กเกจ "${planLabel.th}" ขึ้นไป`}
                            en={`Requires "${planLabel.en}" plan or above`}
                        />
                    </p>
                )}
            </div>
            {onUpgrade && (
                <button
                    onClick={onUpgrade}
                    className="px-6 py-2.5 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                    <Trans th="อัปเกรดแพ็กเกจ ⚡" en="Upgrade Plan ⚡" />
                </button>
            )}
        </div>
    );

    if (overlay && children) {
        return (
            <div className="relative">
                {/* Blurred content */}
                <div className="pointer-events-none select-none blur-sm opacity-50">
                    {children}
                </div>
                {/* Lock overlay */}
                <div className="absolute inset-0 bg-white/70 backdrop-blur-md flex items-center justify-center rounded-2xl z-10">
                    {lockContent}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100">
            {lockContent}
        </div>
    );
}
