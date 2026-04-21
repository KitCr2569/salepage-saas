"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

interface Shop {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
}

export default function ShopSelector() {
    const [shops, setShops] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [switching, setSwitching] = useState(false);
    
    // We can infer current shop from auth token or just guess the selected one
    // But honestly, if we fetch shops, the current shop is whatever is in the JWT.
    // We will just find the shop matching the current agent.shopId if we store it.
    const { userName } = useAuthStore();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        // Fetch shops for this user
        fetch("/api/shop/list")
            .then(res => res.json())
            .then(data => {
                if (data.success && data.shops) {
                    setShops(data.shops);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch shops", err);
                setLoading(false);
            });
    }, []);

    // Function to switch shop
    const handleSwitchShop = async (shopId: string) => {
        setSwitching(true);
        setIsOpen(false);
        try {
            const res = await fetch("/api/auth/switch-shop", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ shopId })
            });
            const data = await res.json();
            if (data.success) {
                // Reload the page completely to reset all states and fetch new data
                window.location.reload();
            } else {
                alert(data.error || "Failed to switch shop");
                setSwitching(false);
            }
        } catch (err) {
            console.error("Switch shop error", err);
            setSwitching(false);
        }
    };

    if (loading || shops.length <= 1) {
        // Don't show dropdown if there's only 1 shop or still loading
        return null;
    }

    // Since we don't know exactly which shop is currently selected in the client without decoding JWT,
    // we assume the first shop in the list is the current one OR we can just show "Switch Shop"
    // Actually, we can decode JWT or just show a generic "Switch Shop" label
    
    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={switching}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-50 to-pink-50 border border-pink-100 px-3 py-1.5 rounded-lg hover:bg-pink-100 transition-colors"
            >
                <span className="text-sm font-medium text-pink-700">
                    {switching ? "กำลังสลับร้าน..." : "สลับร้านค้า"}
                </span>
                <span className="text-pink-500 text-xs">▼</span>
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-xl shadow-xl ring-1 ring-gray-100 z-50 overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                        <span className="text-xs font-bold text-gray-500 uppercase">ร้านค้าของคุณ</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                        {shops.map((shop) => (
                            <button
                                key={shop.id}
                                onClick={() => handleSwitchShop(shop.id)}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-pink-50 rounded-lg transition-colors text-left"
                            >
                                {shop.logo ? (
                                    <img src={shop.logo} alt="" className="w-8 h-8 rounded-md object-cover border border-gray-200" />
                                ) : (
                                    <div className="w-8 h-8 rounded-md bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
                                        {shop.name.charAt(0)}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{shop.name}</p>
                                    <p className="text-xs text-gray-400 truncate">/{shop.slug}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
