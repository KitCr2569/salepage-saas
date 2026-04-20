"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface QuantityTier {
    minQty: number;      // e.g. 2
    discountPercent: number; // e.g. 10 = 10%
}

export interface DiscountCode {
    id: string;
    name: string;       // e.g. "ส่วนลด10%"
    code: string;       // e.g. "HDG10"
    type: "percent" | "fixed" | "free_shipping" | "quantity";
    value: number;       // percent: 10 = 10%, fixed: 100 = ฿100 (not used for quantity type)
    quantityTiers?: QuantityTier[]; // For quantity type: [{minQty:2, discountPercent:10}, {minQty:3, discountPercent:15}]
    minOrder: number;    // minimum order amount (0 = no min)
    minQty: number;      // minimum total items in cart (0 = no min)
    maxUses: number;     // 0 = unlimited
    usedCount: number;
    startDate: string;   // ISO date string
    endDate: string;     // ISO date string (empty = no end)
    enabled: boolean;
    createdAt: number;
}

interface DiscountStore {
    discounts: DiscountCode[];
    addDiscount: (d: DiscountCode) => void;
    updateDiscount: (id: string, data: Partial<DiscountCode>) => void;
    deleteDiscount: (id: string) => void;
    toggleDiscount: (id: string) => void;
    validateCode: (code: string, orderTotal: number, totalQty: number) => { valid: boolean; discount: number; message: string; type?: string };
}

export const useDiscountStore = create<DiscountStore>()(
    persist(
        (set, get) => ({
            discounts: [],

            addDiscount: (d) =>
                set((state) => ({ discounts: [...state.discounts, d] })),

            updateDiscount: (id, data) =>
                set((state) => ({
                    discounts: state.discounts.map((d) =>
                        d.id === id ? { ...d, ...data } : d
                    ),
                })),

            deleteDiscount: (id) =>
                set((state) => ({
                    discounts: state.discounts.filter((d) => d.id !== id),
                })),

            toggleDiscount: (id) =>
                set((state) => ({
                    discounts: state.discounts.map((d) =>
                        d.id === id ? { ...d, enabled: !d.enabled } : d
                    ),
                })),

            validateCode: (code, orderTotal, totalQty) => {
                const { discounts } = get();
                const d = discounts.find(
                    (d) => d.code.toLowerCase() === code.toLowerCase() && d.enabled
                );

                if (!d) return { valid: false, discount: 0, message: "โค้ดส่วนลดไม่ถูกต้อง" };

                const now = new Date();
                if (d.startDate && new Date(d.startDate) > now) {
                    return { valid: false, discount: 0, message: "โค้ดยังไม่เริ่มใช้งาน" };
                }
                if (d.endDate && new Date(d.endDate) < now) {
                    return { valid: false, discount: 0, message: "โค้ดหมดอายุแล้ว" };
                }
                if (d.maxUses > 0 && d.usedCount >= d.maxUses) {
                    return { valid: false, discount: 0, message: "โค้ดถูกใช้ครบจำนวนแล้ว" };
                }
                if (d.minOrder > 0 && orderTotal < d.minOrder) {
                    return {
                        valid: false,
                        discount: 0,
                        message: `ยอดสั่งซื้อขั้นต่ำ ฿${d.minOrder.toLocaleString()}`,
                    };
                }
                if (d.minQty > 0 && totalQty < d.minQty) {
                    return {
                        valid: false,
                        discount: 0,
                        message: `ต้องซื้อขั้นต่ำ ${d.minQty} ชิ้น`,
                    };
                }

                if (d.type === "free_shipping") {
                    return { valid: true, discount: 0, message: "ฟรีค่าส่ง!", type: "free_shipping" };
                }

                // Quantity-based discount
                if (d.type === "quantity") {
                    const tiers = d.quantityTiers || [];
                    // Sort descending by minQty to find the best matching tier
                    const sorted = [...tiers].sort((a, b) => b.minQty - a.minQty);
                    const matchedTier = sorted.find((t) => totalQty >= t.minQty);

                    if (!matchedTier) {
                        const lowestTier = tiers.reduce((min, t) => t.minQty < min.minQty ? t : min, tiers[0]);
                        return {
                            valid: false,
                            discount: 0,
                            message: `ต้องซื้อขั้นต่ำ ${lowestTier?.minQty || 2} ชิ้นขึ้นไป`,
                        };
                    }

                    const discountAmount = Math.round(orderTotal * (matchedTier.discountPercent / 100));
                    return {
                        valid: true,
                        discount: Math.min(discountAmount, orderTotal),
                        message: `ซื้อ ${totalQty} ชิ้น ลด ${matchedTier.discountPercent}%`,
                        type: "quantity",
                    };
                }

                let discountAmount = 0;
                if (d.type === "percent") {
                    discountAmount = Math.round(orderTotal * (d.value / 100));
                } else {
                    discountAmount = d.value;
                }

                return {
                    valid: true,
                    discount: Math.min(discountAmount, orderTotal),
                    message: d.type === "percent" ? `ลด ${d.value}%` : `ลด ฿${d.value.toLocaleString()}`,
                    type: d.type,
                };
            },
        }),
        {
            name: "discount-store",
            version: 2,
            migrate: (persistedState: any) => {
                return { ...persistedState };
            },
        }
    )
);
