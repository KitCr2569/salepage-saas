"use client";

import { useShopStore } from "@/store/useShopStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Trans } from "@/components/Trans";

export default function AdminProfile() {
    const [copied, setCopied] = useState<string | null>(null);
    const { connectedPage } = useAuthStore();
    const shopConfig = useShopStore((s) => s.shopConfig);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    // ใช้ชื่อเพจจากเพจที่เชื่อมต่อ หรือใช้ shopConfig เป็น fallback
    const pageName = connectedPage?.name || shopConfig.shopName;
    const pageId = connectedPage?.id || "";
    const ecommerceLink = pageId ? `https://www.hdgwrapskin.com/${pageId}` : "https://www.hdgwrapskin.com";
    const salepageLink = pageId ? `https://www.hdgwrapskin.com/${pageId}` : "https://www.hdgwrapskin.com";

    return (
        <div className="p-6 md:p-8">
            {/* Title */}
            <h1 className="text-xl font-bold text-pink-500 mb-6"><Trans th="หน้าโปรไฟล์" en="Profile page" /></h1>

            {/* Page Name */}
            <div className="mb-5">
                <label className="text-xs text-gray-500 mb-1 block"><Trans th="ชื่อเพจ" en="Page name" /></label>
                <p className="text-base text-pink-500 font-medium">
                    {pageName}
                </p>
            </div>

            {/* Ecommerce Link */}
            <div className="mb-4">
                <label className="text-xs text-gray-500 mb-1 block">
                    <Trans th="ลิงก์หน้าเพจ (ต้อง Login) :" en="Page link (must login):" />
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                    <a href={ecommerceLink} target="_blank" className="text-sm text-blue-500 hover:underline break-all">
                        {ecommerceLink}
                    </a>
                    <button
                        onClick={() => handleCopy(ecommerceLink, "ecommerce")}
                        className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
                        title={typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Copy" : "คัดลอก"}
                    >
                        <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                    {copied === "ecommerce" && (
                        <span className="text-xs text-green-500"><Trans th="คัดลอกแล้ว!" en="Copied!" /></span>
                    )}
                    <a href="#" className="text-sm text-pink-500 hover:underline ml-2"><Trans th="[อ่านวิธีใช้ลิงก์]" en="[Read how to use link]" /></a>
                </div>
            </div>

            {/* Salepage Link */}
            <div className="mb-6">
                <label className="text-xs text-gray-500 mb-1 block">
                    <Trans th="ลิงก์ Salepage (ไม่ต้อง Login) :" en="Salepage link (no login required):" />
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                    <a href={salepageLink} target="_blank" className="text-sm text-blue-500 hover:underline break-all">
                        {salepageLink}
                    </a>
                    <button
                        onClick={() => handleCopy(salepageLink, "salepage")}
                        className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
                        title={typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Copy" : "คัดลอก"}
                    >
                        <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                    {copied === "salepage" && (
                        <span className="text-xs text-green-500"><Trans th="คัดลอกแล้ว!" en="Copied!" /></span>
                    )}
                    <a href="#" className="text-sm text-pink-500 hover:underline ml-2"><Trans th="[อ่านวิธีใช้ลิงก์]" en="[Read how to use link]" /></a>
                </div>
            </div>

            {/* Chatbot link */}
            <div className="mb-6">
                <label className="text-xs text-gray-500 mb-1 block">
                    <Trans th="ลิงก์ในปุ่มแชทบอท :" en="Link in chatbot button:" />
                </label>
                <a href="#" className="text-sm text-pink-500 hover:underline"><Trans th="[อ่านวิธีสร้างลิงก์]" en="[Read how to create links]" /></a>
            </div>

            {/* Theme Color */}
            <div className="mb-6">
                <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                    <Trans th="ธีมสี (ร้านค้า)" en="Color theme (store)" />
                    <span className="w-4 h-4 rounded-full bg-blue-500 inline-flex items-center justify-center text-white text-[8px]">i</span>
                </label>
                <div className="w-12 h-12 rounded-lg bg-[#4267B2] cursor-pointer hover:ring-2 hover:ring-pink-300 transition-all" title={typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Change color theme" : "เปลี่ยนธีมสี"} />
            </div>

            {/* Shop Name */}
            <div className="mb-6">
                <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                    <Trans th="ชื่อร้าน" en="Shop name" />
                    <span className="w-4 h-4 rounded-full bg-blue-500 inline-flex items-center justify-center text-white text-[8px]">i</span>
                </label>
                <p className="text-sm text-pink-500">{shopConfig.shopName}</p>
            </div>

            {/* Language */}
            <div className="mb-6">
                <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                    <Trans th="ภาษา (ร้านค้า)" en="Language (store)" />
                    <span className="w-4 h-4 rounded-full bg-blue-500 inline-flex items-center justify-center text-white text-[8px]">i</span>
                </label>
                <p className="text-sm text-pink-500">Thai</p>
            </div>

            {/* Address */}
            <div className="mb-6">
                <label className="text-xs text-gray-500 mb-1 block"><Trans th="ที่อยู่ร้านค้า" en="Store address" /></label>
                <p className="text-sm text-gray-600">-</p>
            </div>

            {/* Edit button floating */}
            <button className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-gradient-to-r from-pink-400 to-pink-500 text-white shadow-lg shadow-pink-200 flex items-center justify-center hover:shadow-xl transition-all">
                ✏️
            </button>
        </div>
    );
}
