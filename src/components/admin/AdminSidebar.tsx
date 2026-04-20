"use client";

import { AdminTab } from "@/app/admin/page";
import { Trans } from "@/components/Trans";

interface AdminSidebarProps {
    activeTab: AdminTab;
    onTabChange: (tab: AdminTab) => void;
}

const menuItems: { id: AdminTab; label: string; icon: string }[] = [
    { id: "dashboard", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Dashboard" : "แดชบอร์ด"), icon: "🏠" },
    { id: "ShopProfilePage", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Store Profile" : "โปรไฟล์ร้านค้า"), icon: "👤" },
    { id: "Products", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Products/Discounts" : "สินค้า/ส่วนลด"), icon: "📦" },
    { id: "mainPayment", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Make payment" : "ชำระเงิน"), icon: "💳" },
    { id: "ShippingMethod", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "transportation channel" : "ช่องทางการขนส่ง"), icon: "🚚" },
    { id: "SalePage", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Sale page" : "เซลเพจ"), icon: "📄" },
    { id: "CartSummary", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Shopping Cart Summary" : "สรุปตะกร้าสินค้า"), icon: "🛒" },
    { id: "ecommerce-order-summary", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Order summary" : "สรุปออเดอร์"), icon: "📋" },
];

export default function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
    return (
        <aside className="w-64 bg-white border-r border-pink-100 min-h-screen flex-shrink-0 hidden md:block">
            {/* Logo area */}
            <div className="h-16 flex items-center px-6 border-b border-pink-100">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">Z</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-800">{<Trans th="ร้านค้า/เซลเพจ" en="Shop/Sale page" />}</p>
                        <p className="text-[10px] text-gray-400">Admin Panel</p>
                    </div>
                </div>
            </div>

            {/* Menu */}
            <nav className="p-3 space-y-1">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onTabChange(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 text-left ${activeTab === item.id
                                ? "bg-gradient-to-r from-pink-400 to-pink-500 text-white shadow-md shadow-pink-200"
                                : "text-gray-600 hover:bg-pink-50"
                            }`}
                    >
                        <span className="text-lg">{item.icon}</span>
                        <span className="font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* Bottom action */}
            <div className="absolute bottom-6 left-0 right-0 px-6 w-64">
                <button className="w-full bg-gradient-to-r from-green-400 to-green-500 text-white py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-md shadow-green-200 hover:from-green-500 hover:to-green-600 transition-all">
                    <span>🚀</span>
                    <Trans th="ส่งขึ้นระบบ" en="Send it into the system" />
                                    </button>
            </div>
        </aside>
    );
}
