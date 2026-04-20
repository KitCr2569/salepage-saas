"use client";

import { useState, useEffect, useCallback } from "react";
import { Trans } from "@/components/Trans";

export default function AdminAnalytics({ onBack }: { onBack?: () => void }) {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/dashboard/stats', { cache: 'no-store' });
            const json = await res.json();
            if (json.success) {
                const d = json.data;
                setStats({
                    totalOrders: d.totalOrders,
                    totalRevenue: d.totalRevenue,
                    avgOrder: d.avgOrder,
                    dailyData: d.dailyData || [],
                    topProducts: d.topProducts || [],
                    maxDaily: Math.max(...(d.dailyData || []).map(([, v]: [string, any]) => v.revenue), 1),
                });
            }
        } catch {
            setStats(null);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const formatCurrency = (n: number) => `฿${n.toLocaleString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'))}`;

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
            {onBack && (
                <button onClick={onBack} className="mb-4 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium group">
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> <Trans th="กลับไปหน้าหลัก" en="Return to Home" />
                                    </button>
            )}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                    <span className="text-white text-xl">📈</span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{<Trans th="วิเคราะห์" en="Analytics" />}</h2>
                    <p className="text-xs text-gray-400">{<Trans th="สถิติยอดขายและข้อมูลร้านค้า" en="Sales statistics and store data" />}</p>
                </div>
            </div>

            {/* Period Filter */}
            <div className="flex gap-2 mb-6">
                {[
                    { id: 'today' as const, label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Today" : "วันนี้") },
                    { id: 'week' as const, label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "7 Days" : "7 วัน") },
                    { id: 'month' as const, label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "30 Days" : "30 วัน") },
                    { id: 'all' as const, label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "All time" : "ทั้งหมด") },
                ].map(p => (
                    <button
                        key={p.id}
                        onClick={() => setPeriod(p.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            period === p.id
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300'
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <div className="w-10 h-10 border-3 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {[
                            { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Total Sales" : "ยอดขาย"), value: formatCurrency(stats?.totalRevenue || 0), icon: "💰", color: "from-green-50 to-emerald-50 border-green-100", text: "text-green-600" },
                            { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Total Orders" : "จำนวนออเดอร์"), value: stats?.totalOrders || 0, icon: "📦", color: "from-blue-50 to-indigo-50 border-blue-100", text: "text-blue-600" },
                            { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Average/Order" : "ยอดเฉลี่ย/ออเดอร์"), value: formatCurrency(Math.round(stats?.avgOrder || 0)), icon: "📊", color: "from-purple-50 to-pink-50 border-purple-100", text: "text-purple-600" },
                        ].map((c, i) => (
                            <div key={i} className={`bg-gradient-to-br ${c.color} rounded-2xl p-5 border shadow-sm`}>
                                <span className="text-2xl">{c.icon}</span>
                                <p className={`text-2xl font-bold ${c.text} mt-2`}>{c.value}</p>
                                <p className="text-xs text-gray-500 mt-1">{c.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Chart */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100 mb-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">{<Trans th="📊 ยอดขายรายวัน" en="📊 Daily Sales" />}</h3>
                        <div className="flex items-end gap-2 h-48">
                            {(stats?.dailyData || []).map(([label, data]: [string, any], i: number) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <span className="text-[10px] text-gray-500 font-medium">
                                        {formatCurrency(data.revenue)}
                                    </span>
                                    <div
                                        className="w-full bg-gradient-to-t from-emerald-400 to-teal-300 rounded-t-lg transition-all min-h-[4px]"
                                        style={{ height: `${Math.max((data.revenue / (stats?.maxDaily || 1)) * 150, 4)}px` }}
                                    />
                                    <span className="text-[10px] text-gray-400">{label}</span>
                                    <span className="text-[10px] text-gray-400">{data.orders} {<Trans th="ออเดอร์" en="Orders" />}</span>
                                </div>
                            ))}
                            {(!stats?.dailyData || stats.dailyData.length === 0) && (
                                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                                    <Trans th="ไม่มีข้อมูลในช่วงนี้" en="No data in this period" />
                                                                        </div>
                            )}
                        </div>
                    </div>

                    {/* Top Products */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">{<Trans th="🏆 สินค้ายอดนิยม" en="🏆 Top Products" />}</h3>
                        <div className="space-y-3">
                            {(stats?.topProducts || []).map(([name, count]: [string, number], i: number) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                                        i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-gray-300'
                                    }`}>
                                        {i + 1}
                                    </span>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                                        <div className="w-full h-2 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                                                style={{ width: `${(count / (stats?.topProducts?.[0]?.[1] || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-gray-600">{count} {<Trans th="ชิ้น" en="Pieces" />}</span>
                                </div>
                            ))}
                            {(!stats?.topProducts || stats.topProducts.length === 0) && (
                                <p className="text-center text-gray-400 text-sm py-8">{<Trans th="ไม่มีข้อมูลสินค้า" en="No product data" />}</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
