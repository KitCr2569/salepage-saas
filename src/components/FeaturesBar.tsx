"use client";

import { Truck, Package, Shield, RotateCcw } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

const features = [
    {
        icon: Truck,
        titleTh: "จัดส่งทั่วไทย",
        titleEn: "Nationwide Delivery",
        subtitleTh: "ส่งถึงบ้าน",
        subtitleEn: "Door to door",
        color: "#7C3AED",
    },
    {
        icon: Package,
        titleTh: "ส่งฟรี 890+",
        titleEn: "Free Ship 890+",
        subtitleTh: "เมื่อซื้อครบ",
        subtitleEn: "Min. purchase",
        color: "#e94560",
    },
    {
        icon: Shield,
        titleTh: "วัสดุ 3M แท้",
        titleEn: "Genuine 3M",
        subtitleTh: "คุณภาพสูง",
        subtitleEn: "Premium quality",
        color: "#00b894",
    },
    {
        icon: RotateCcw,
        titleTh: "ลอกง่าย",
        titleEn: "Easy Remove",
        subtitleTh: "ไม่ทิ้งกาว",
        subtitleEn: "No residue",
        color: "#fdcb6e",
    },
];

export default function FeaturesBar() {
    const { language } = useCartStore();

    return (
        <div className="bg-surface-800/80 border-b border-surface-700/60 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="grid grid-cols-4 gap-2">
                    {features.map((feat, index) => {
                        const Icon = feat.icon;
                        return (
                            <div
                                key={index}
                                className="flex flex-col items-center text-center gap-1 py-2"
                            >
                                <div
                                    className="w-9 h-9 rounded-full flex items-center justify-center mb-0.5"
                                    style={{ backgroundColor: feat.color + "15" }}
                                >
                                    <Icon
                                        className="w-4 h-4"
                                        style={{ color: feat.color }}
                                    />
                                </div>
                                <span className="text-[10px] sm:text-xs font-medium text-surface-100 leading-tight">
                                    {language === "th" ? feat.titleTh : feat.titleEn}
                                </span>
                                <span className="text-[9px] sm:text-[10px] text-surface-400 leading-tight hidden sm:block">
                                    {language === "th" ? feat.subtitleTh : feat.subtitleEn}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
