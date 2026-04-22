"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminTab } from "@/app/admin/page";
import { Trans } from "@/components/Trans";

interface AdminHomeProps {
    onNavigate: (tab: AdminTab) => void;
}

export default function AdminHome({ onNavigate }: AdminHomeProps) {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/dashboard/stats', { cache: 'no-store' });
            const json = await res.json();
            if (json.success) setStats(json.data);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    const formatCurrency = (n: number) => `฿${n.toLocaleString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'))}`;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="text-center">
                    <div className="w-12 h-12 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-400">{<Trans th="กำลังโหลดข้อมูล..." en="Loading data..." />}</p>
                </div>
            </div>
        );
    }

    const quickLinks: { icon: string; label: string; id: AdminTab; color: string }[] = [
        { icon: "📦", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "product" : "สินค้า"), id: "Products", color: "from-blue-400 to-indigo-500" },
        { icon: "📋", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Order" : "ออเดอร์"), id: "ecommerce-order-summary", color: "from-green-400 to-emerald-500" },
        { icon: "💬", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Chat" : "แชท"), id: "UnifiedChat", color: "from-purple-400 to-pink-500" },
        { icon: "📢", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Broadcast" : "บรอดแคสต์"), id: "Broadcast", color: "from-orange-400 to-red-500" },
        { icon: "📈", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "analyze" : "วิเคราะห์"), id: "Analytics", color: "from-teal-400 to-green-500" },
        { icon: "🛠️", label: "FB Tools", id: "FacebookTools", color: "from-gray-500 to-gray-700" },
    ];

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-lg shadow-pink-200">
                    <span className="text-white text-xl">🏠</span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{<Trans th="หน้าหลัก" en="Home page" />}</h2>
                    <p className="text-xs text-gray-400">{<Trans th="ภาพรวมร้านค้าของคุณ" en="Your Shop Overview" />}</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Order today" : "ออเดอร์วันนี้"), value: stats?.todayOrders || 0, icon: "🛒", color: "from-green-50 to-emerald-50", text: "text-green-600", border: "border-green-100" },
                    { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Today's sales" : "ยอดขายวันนี้"), value: formatCurrency(stats?.todayRevenue || 0), icon: "💰", color: "from-amber-50 to-yellow-50", text: "text-amber-600", border: "border-amber-100" },
                    { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "All orders" : "ออเดอร์ทั้งหมด"), value: stats?.totalOrders || 0, icon: "📦", color: "from-blue-50 to-indigo-50", text: "text-blue-600", border: "border-blue-100" },
                    { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "all customers" : "ลูกค้าทั้งหมด"), value: (stats?.totalContacts || 0).toLocaleString(), icon: "👥", color: "from-purple-50 to-pink-50", text: "text-purple-600", border: "border-purple-100" },
                ].map((card, i) => (
                    <div key={i} className={`bg-gradient-to-br ${card.color} rounded-2xl p-4 border ${card.border} shadow-sm`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{card.icon}</span>
                        </div>
                        <p className={`text-2xl font-bold ${card.text}`}>{card.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Revenue + Messaging Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">💰</span>
                        <Trans th="สรุปยอดขาย" en="Summary of sales" />
                                            </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                            <span className="text-sm text-gray-600">{<Trans th="ยอดรวมทั้งหมด" en="Grand total" />}</span>
                            <span className="text-lg font-bold text-green-600">{formatCurrency(stats?.totalRevenue || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                            <span className="text-sm text-gray-600">{<Trans th="เฉลี่ย/ออเดอร์" en="Average/Order" />}</span>
                            <span className="text-lg font-bold text-blue-600">{formatCurrency(stats?.avgOrder || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                            <span className="text-sm text-gray-600">{<Trans th="ยอด 7 วัน" en="Peak 7 days" />}</span>
                            <span className="text-lg font-bold text-amber-600">{formatCurrency(stats?.weekRevenue || 0)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">💬</span>
                        Messenger
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                            <span className="text-sm text-gray-600">{<Trans th="ลูกค้าทั้งหมด" en="all customers" />}</span>
                            <span className="text-lg font-bold text-purple-600">{(stats?.totalContacts || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl">
                            <span className="text-sm text-gray-600">{<Trans th="สนทนา" en="talk" />}</span>
                            <span className="text-lg font-bold text-indigo-600">{(stats?.totalConversations || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-pink-50 rounded-xl">
                            <span className="text-sm text-gray-600">{<Trans th="ข้อความทั้งหมด" en="All messages" />}</span>
                            <span className="text-lg font-bold text-pink-600">{(stats?.totalMessages || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100 mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">⚡</span>
                    <Trans th="เข้าถึงด่วน" en="Quick access" />
                                    </h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {quickLinks.map((link) => (
                        <button key={link.id} onClick={() => onNavigate(link.id)} className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-all">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                                <span className="text-xl">{link.icon}</span>
                            </div>
                            <span className="text-xs text-gray-600 font-medium">{link.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Recent Orders */}
            {(stats?.recentOrders?.length ?? 0) > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">📋</span>
                            <Trans th="ออเดอร์ล่าสุด" en="Latest order" />
                                                    </h3>
                        <button onClick={() => onNavigate('ecommerce-order-summary')} className="text-sm text-pink-500 hover:text-pink-600 font-medium">
                            <Trans th="ดูทั้งหมด →" en="View all →" />
                                                    </button>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {stats?.recentOrders.map((order: any) => (
                            <div key={order.id} className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center text-white text-xs font-bold">
                                        {(order.customer || '?').charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{order.customer || 'ลูกค้า'}</p>
                                        <p className="text-xs text-gray-400">#{order.id}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-emerald-600">{formatCurrency(order.total)}</p>
                                    <p className="text-xs text-gray-400">
                                        {new Date(order.date).toLocaleDateString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'), { day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
