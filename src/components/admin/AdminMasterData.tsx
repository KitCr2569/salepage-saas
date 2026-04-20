"use client";

import { AdminTab } from "@/app/admin/page";
import { Trans } from "@/components/Trans";

interface AdminMasterDataProps {
    onNavigate: (tab: AdminTab) => void;
    onBack?: () => void;
}

export default function AdminMasterData({ onNavigate, onBack }: AdminMasterDataProps) {
    const dataCategories = [
        { icon: "📦", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "product" : "สินค้า"), desc: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Manage products and details" : "จัดการสินค้าและรายละเอียด"), id: "Products" as AdminTab, count: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "5 items" : "5 รายการ") },
        { icon: "💳", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Payment channels" : "ช่องทางชำระเงิน"), desc: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Bank account and QR Code" : "บัญชีธนาคารและ QR Code"), id: "mainPayment" as AdminTab, count: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "3 channels" : "3 ช่องทาง") },
        { icon: "🚚", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Transportation" : "การขนส่ง"), desc: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Shipping channel" : "ช่องทางจัดส่งสินค้า"), id: "ShippingMethod" as AdminTab, count: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "2 channels" : "2 ช่องทาง") },
        { icon: "👤", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Shop profile" : "โปรไฟล์ร้าน"), desc: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Store information and logo" : "ข้อมูลร้านค้าและโลโก้"), id: "ShopProfilePage" as AdminTab, count: "" },
        { icon: "📄", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Sale page" : "เซลเพจ"), desc: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Online sales page" : "หน้าขายสินค้าออนไลน์"), id: "SalePage" as AdminTab, count: "" },
        { icon: "🛒", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "shopping cart" : "ตะกร้าสินค้า"), desc: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Set up the cart summary page" : "ตั้งค่าหน้าสรุปตะกร้า"), id: "CartSummary" as AdminTab, count: "" },
    ];

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            {onBack && (
                <button onClick={onBack} className="mb-4 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium group">
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> <Trans th="กลับไปหน้าหลัก" en="Return to home page" />
                                    </button>
            )}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-400 to-gray-600 flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl">📋</span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{<Trans th="ข้อมูลหลัก" en="Main data" />}</h2>
                    <p className="text-xs text-gray-400">{<Trans th="จัดการข้อมูลพื้นฐานของร้านค้า" en="Manage basic store information" />}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dataCategories.map((cat, i) => (
                    <button
                        key={i}
                        onClick={() => onNavigate(cat.id)}
                        className="group bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100 text-left hover:shadow-lg hover:ring-gray-200 transition-all"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="text-2xl">{cat.icon}</span>
                            </div>
                            {cat.count && (
                                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">{cat.count}</span>
                            )}
                        </div>
                        <p className="text-sm font-bold text-gray-800">{cat.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{cat.desc}</p>
                        <div className="mt-3 text-xs text-pink-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trans th="จัดการ →" en="Manage →" />
                                                    </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
