"use client";

import { AdminTab } from "@/app/admin/page";
import { Trans } from "@/components/Trans";

interface AdminSalesToolsProps {
    onNavigate: (tab: AdminTab) => void;
}

export default function AdminSalesTools({ onNavigate }: AdminSalesToolsProps) {
    const tools = [
        {
            icon: "📢", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Broadcast" : "บรอดแคสต์"), desc: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Mass messaging" : "ส่งข้อความถึงลูกค้าหลายคนพร้อมกัน"),
            color: "from-orange-400 to-pink-500", shadow: "shadow-orange-200",
            id: "Broadcast" as AdminTab, status: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Ready" : "พร้อมใช้"),
        },
        {
            icon: "🛠️", label: "FB Tools", desc: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Facebook Page Management" : "เครื่องมือจัดการ Facebook Page"),
            color: "from-blue-400 to-indigo-500", shadow: "shadow-blue-200",
            id: "FacebookTools" as AdminTab, status: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Ready" : "พร้อมใช้"),
        },
        {
            icon: "🏷️", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Discount Coupons" : "คูปองส่วนลด"), desc: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Create and manage coupons" : "สร้างและจัดการคูปองลดราคา"),
            color: "from-green-400 to-emerald-500", shadow: "shadow-green-200",
            id: "Products" as AdminTab, status: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Ready" : "พร้อมใช้"),
        },
        {
            icon: "📊", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Customer Analysis" : "วิเคราะห์ลูกค้า"), desc: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "View purchase behavior" : "ดูข้อมูลพฤติกรรมการซื้อ"),
            color: "from-purple-400 to-violet-500", shadow: "shadow-purple-200",
            id: "CustomerAnalysis" as AdminTab, status: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Ready" : "พร้อมใช้"),
        },
        {
            icon: "🎯", label: "Retarget ลูกค้า", desc: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Retarget specific groups" : "ส่งข้อความเฉพาะกลุ่มที่สนใจ"),
            color: "from-red-400 to-rose-500", shadow: "shadow-red-200",
            id: "RetargetCustomers" as AdminTab, status: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Ready" : "พร้อมใช้"),
        },
        {
            icon: "⏰", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Scheduled Posting" : "ตั้งเวลาโพสต์"), desc: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Auto-schedule FB Posts" : "ตั้งเวลาโพสต์ Facebook อัตโนมัติ"),
            color: "from-cyan-400 to-blue-500", shadow: "shadow-cyan-200",
            id: "ScheduledPosting" as AdminTab, status: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Ready" : "พร้อมใช้"),
        },
        {
            icon: "📧", label: "Email Marketing", desc: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Send emails to buyers" : "ส่ง Email ถึงลูกค้าที่ซื้อแล้ว"),
            color: "from-amber-400 to-orange-500", shadow: "shadow-amber-200",
            id: "EmailMarketing" as AdminTab, status: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Ready" : "พร้อมใช้"),
        },
        {
            icon: "🔄", label: "Cross-sell", desc: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Auto cross-sell products" : "แนะนำสินค้าที่เกี่ยวข้องอัตโนมัติ"),
            color: "from-teal-400 to-green-500", shadow: "shadow-teal-200",
            id: "CrossSell" as AdminTab, status: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Ready" : "พร้อมใช้"),
        },
    ];

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-200">
                    <span className="text-white text-xl">📊</span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{<Trans th="เครื่องมือเพิ่มยอดขาย" en="Sales Tools" />}</h2>
                    <p className="text-xs text-gray-400">{<Trans th="เครื่องมือช่วยโปรโมทและเพิ่มยอดขาย" en="Tools for promoting and increasing sales" />}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tools.map((tool, i) => (
                    <button
                        key={i}
                        onClick={() => tool.id && onNavigate(tool.id)}
                        disabled={!tool.id}
                        className={`group bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100 text-left transition-all ${
                            tool.id ? 'hover:shadow-lg hover:ring-gray-200 cursor-pointer' : 'opacity-70 cursor-not-allowed'
                        }`}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center shadow-md ${tool.shadow} group-hover:scale-110 transition-transform`}>
                                <span className="text-xl">{tool.icon}</span>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                tool.status === 'พร้อมใช้' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                                {tool.status}
                            </span>
                        </div>
                        <p className="text-sm font-bold text-gray-800">{tool.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{tool.desc}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}
