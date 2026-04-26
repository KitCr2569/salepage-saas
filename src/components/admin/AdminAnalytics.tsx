"use client";

import { useState, useEffect, useCallback } from "react";
import { Trans } from "@/components/Trans";

const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-400",
    "รอชำระ": "bg-yellow-400",
    confirmed: "bg-blue-400",
    "ชำระแล้ว": "bg-blue-400",
    shipped: "bg-purple-400",
    "จัดส่งแล้ว": "bg-purple-400",
    delivered: "bg-green-400",
    "สำเร็จ": "bg-green-400",
    cancelled: "bg-red-400",
    "ยกเลิก": "bg-red-400",
};

const STATUS_LABELS: Record<string, { th: string; en: string }> = {
    pending: { th: "รอดำเนินการ", en: "Pending" },
    "รอชำระ": { th: "รอชำระ", en: "Awaiting Payment" },
    confirmed: { th: "ชำระแล้ว", en: "Confirmed" },
    "ชำระแล้ว": { th: "ชำระแล้ว", en: "Paid" },
    shipped: { th: "จัดส่งแล้ว", en: "Shipped" },
    "จัดส่งแล้ว": { th: "จัดส่งแล้ว", en: "Shipped" },
    delivered: { th: "สำเร็จ", en: "Delivered" },
    "สำเร็จ": { th: "สำเร็จ", en: "Completed" },
};

export default function AdminAnalytics({ onBack }: { onBack?: () => void }) {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/dashboard/stats?period=${period}`, { cache: 'no-store' });
            const json = await res.json();
            if (json.success) {
                const d = json.data;
                setStats({
                    totalOrders: d.totalOrders,
                    totalRevenue: d.totalRevenue,
                    avgOrder: d.avgOrder,
                    todayOrders: d.todayOrders,
                    todayRevenue: d.todayRevenue,
                    weekOrders: d.weekOrders,
                    weekRevenue: d.weekRevenue,
                    dailyData: d.dailyData || [],
                    topProducts: d.topProducts || [],
                    statusBreakdown: d.statusBreakdown || {},
                    recentOrders: d.recentOrders || [],
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

    const isEn = typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en';
    const formatCurrency = (n: number) => `฿${n.toLocaleString(isEn ? 'en-US' : 'th-TH')}`;

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
            <div className="flex gap-2 mb-6 flex-wrap items-center">
                {[
                    { id: 'today' as const, label: isEn ? "Today" : "วันนี้" },
                    { id: 'week' as const, label: isEn ? "7 Days" : "7 วัน" },
                    { id: 'month' as const, label: isEn ? "30 Days" : "30 วัน" },
                    { id: 'all' as const, label: isEn ? "All time" : "ทั้งหมด" },
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
                <div className="flex-1" />
                <button
                    onClick={() => {
                        const token = localStorage.getItem('chat-auth-token');
                        window.open(`/api/orders/export?period=${period}&token=${token}`, '_blank');
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-white text-gray-600 border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all flex items-center gap-1.5"
                >
                    📥 {isEn ? "Export CSV" : "ดาวน์โหลด CSV"}
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <div className="w-10 h-10 border-3 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: isEn ? "Total Sales" : "ยอดขาย", value: formatCurrency(stats?.totalRevenue || 0), icon: "💰", color: "from-green-50 to-emerald-50 border-green-100", text: "text-green-600" },
                            { label: isEn ? "Total Orders" : "จำนวนออเดอร์", value: stats?.totalOrders || 0, icon: "📦", color: "from-blue-50 to-indigo-50 border-blue-100", text: "text-blue-600" },
                            { label: isEn ? "Average/Order" : "ยอดเฉลี่ย/ออเดอร์", value: formatCurrency(Math.round(stats?.avgOrder || 0)), icon: "📊", color: "from-purple-50 to-pink-50 border-purple-100", text: "text-purple-600" },
                            { label: isEn ? "Today's Sales" : "ยอดวันนี้", value: formatCurrency(stats?.todayRevenue || 0), sub: `${stats?.todayOrders || 0} ${isEn ? 'orders' : 'ออเดอร์'}`, icon: "🔥", color: "from-orange-50 to-amber-50 border-orange-100", text: "text-orange-600" },
                        ].map((c, i) => (
                            <div key={i} className={`bg-gradient-to-br ${c.color} rounded-2xl p-5 border shadow-sm`}>
                                <span className="text-2xl">{c.icon}</span>
                                <p className={`text-xl md:text-2xl font-bold ${c.text} mt-2`}>{c.value}</p>
                                <p className="text-xs text-gray-500 mt-1">{c.label}</p>
                                {'sub' in c && c.sub && <p className="text-[10px] text-gray-400">{c.sub}</p>}
                            </div>
                        ))}
                    </div>

                    {/* Order Status Breakdown */}
                    {stats?.statusBreakdown && Object.keys(stats.statusBreakdown).length > 0 && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100 mb-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">{<Trans th="📋 สถานะออเดอร์" en="📋 Order Status" />}</h3>
                            <div className="flex gap-2 h-6 rounded-full overflow-hidden mb-4">
                                {Object.entries(stats.statusBreakdown).map(([status, count]: [string, any]) => (
                                    <div
                                        key={status}
                                        className={`${STATUS_COLORS[status] || 'bg-gray-300'} transition-all`}
                                        style={{ width: `${(count / stats.totalOrders) * 100}%`, minWidth: count > 0 ? '8px' : '0' }}
                                        title={`${status}: ${count}`}
                                    />
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {Object.entries(stats.statusBreakdown).map(([status, count]: [string, any]) => {
                                    const label = STATUS_LABELS[status];
                                    return (
                                        <div key={status} className="flex items-center gap-2 text-sm">
                                            <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[status] || 'bg-gray-300'}`} />
                                            <span className="text-gray-600">
                                                {label ? (isEn ? label.en : label.th) : status}
                                            </span>
                                            <span className="font-bold text-gray-800">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

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

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Top Products */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">{<Trans th="🏆 สินค้ายอดนิยม" en="🏆 Top Products" />}</h3>
                            <div className="space-y-3">
                                {(stats?.topProducts || []).slice(0, 10).map(([name, count]: [string, number], i: number) => (
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
                                        <span className="text-sm font-bold text-gray-600">{count} {<Trans th="ชิ้น" en="pcs" />}</span>
                                    </div>
                                ))}
                                {(!stats?.topProducts || stats.topProducts.length === 0) && (
                                    <p className="text-center text-gray-400 text-sm py-8">{<Trans th="ไม่มีข้อมูลสินค้า" en="No product data" />}</p>
                                )}
                            </div>
                        </div>

                        {/* Recent Orders */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">{<Trans th="🕐 ออเดอร์ล่าสุด" en="🕐 Recent Orders" />}</h3>
                            <div className="space-y-3">
                                {(stats?.recentOrders || []).map((o: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">{o.customer}</p>
                                            <p className="text-[11px] text-gray-400">{o.id} · {o.itemCount} {isEn ? 'items' : 'ชิ้น'}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-2">
                                            <p className="text-sm font-bold text-emerald-600">{formatCurrency(o.total)}</p>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                o.status === 'สำเร็จ' || o.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                o.status === 'จัดส่งแล้ว' || o.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                                                o.status === 'ชำระแล้ว' || o.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {o.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
                                    <p className="text-center text-gray-400 text-sm py-8">{<Trans th="ยังไม่มีออเดอร์" en="No orders yet" />}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
