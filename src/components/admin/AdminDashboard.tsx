"use client";

import { AdminTab } from "@/app/admin/page";
import { Trans } from "@/components/Trans";

interface AdminDashboardProps {
    onNavigate: (tab: AdminTab) => void;
}

const dashboardCards: { id: AdminTab; label: string; icon: string; hasPreview?: boolean }[] = [
    { id: "ShopProfilePage", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Store Profile" : "โปรไฟล์ร้านค้า"), icon: "👤" },
    { id: "Products", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Products/Discounts" : "สินค้า/ส่วนลด"), icon: "📦" },
    { id: "mainPayment", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Make payment" : "ชำระเงิน"), icon: "💳" },
    { id: "ShippingMethod", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "transportation channel" : "ช่องทางการขนส่ง"), icon: "🚚" },
    { id: "SalePage", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Sale page" : "เซลเพจ"), icon: "📄", hasPreview: true },
    { id: "CartSummary", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Shopping Cart Summary" : "สรุปตะกร้าสินค้า"), icon: "🛒", hasPreview: true },
    { id: "ecommerce-order-summary", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Order summary" : "สรุปออเดอร์"), icon: "📋" },
];

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
    return (
        <div className="p-6 md:p-8">
            {/* Title */}
            <h1 className="text-2xl font-bold text-pink-500 mb-8">{<Trans th="ร้านค้า/เซลเพจ" en="Shop/Sale page" />}</h1>

            {/* Card Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {dashboardCards.map((card) => (
                    <button
                        key={card.id}
                        onClick={() => onNavigate(card.id)}
                        className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-pink-100 hover:border-pink-300"
                    >
                        {/* Preview badge */}
                        {card.hasPreview && (
                            <div className="absolute top-2 right-2 z-10 bg-gradient-to-r from-orange-400 to-pink-400 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                                <Trans th="ดูตัวอย่าง" en="Preview" />
                                                            </div>
                        )}

                        {/* Card background with gradient */}
                        <div className="h-32 bg-gradient-to-br from-pink-200 via-pink-300 to-pink-400 flex items-center justify-center relative overflow-hidden">
                            {/* Decorative waves */}
                            <div className="absolute inset-0 opacity-30">
                                <svg viewBox="0 0 200 200" className="w-full h-full">
                                    <path d="M 0 80 Q 50 60 100 80 Q 150 100 200 80 L 200 200 L 0 200 Z" fill="rgba(255,255,255,0.3)" />
                                    <path d="M 0 100 Q 50 80 100 100 Q 150 120 200 100 L 200 200 L 0 200 Z" fill="rgba(255,255,255,0.2)" />
                                </svg>
                            </div>
                            <span className="text-5xl relative z-10 group-hover:scale-110 transition-transform duration-300">
                                {card.icon}
                            </span>
                        </div>

                        {/* Label */}
                        <div className="px-3 py-3">
                            <p className="text-xs font-medium text-gray-700 text-center">
                                {card.label}
                            </p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Bottom Action Button */}
            <div className="flex justify-center mt-10">
                <button className="bg-gradient-to-r from-green-400 to-green-500 text-white px-8 py-3 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg shadow-green-200 hover:from-green-500 hover:to-green-600 transition-all duration-200 hover:scale-105">
                    <span>🚀</span>
                    <Trans th="ส่งขึ้นระบบ" en="Send it into the system" />
                                    </button>
            </div>
        </div>
    );
}
