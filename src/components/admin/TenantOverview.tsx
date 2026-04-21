"use client";

import { useState, useEffect } from "react";
import { AdminTab } from "@/app/admin/page";
import { Trans } from "@/components/Trans";

interface ShopMetric {
    name: string;
    logo: string | null;
    revenue: number;
    orders: number;
}

interface DashboardData {
    totalRevenue: number;
    totalOrders: number;
    pendingOrders: number;
    totalShops: number;
    shops: ShopMetric[];
}

interface TenantOverviewProps {
    onNavigate: (tab: AdminTab) => void;
}

export default function TenantOverview({ onNavigate }: TenantOverviewProps) {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/tenant/dashboard")
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    setData(res.data);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center h-full text-gray-500">Loading Dashboard...</div>;
    }

    if (!data) {
        return <div className="p-6 text-red-500">Failed to load dashboard data. Are you logged in as a Tenant?</div>;
    }

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-800"><Trans th="ภาพรวมธุรกิจ" en="Business Overview" /></h1>
                    <p className="text-sm text-gray-500"><Trans th="สรุปยอดขายจากทุกร้านค้าของคุณ" en="Summary of sales across all your shops" /></p>
                </div>
                <button 
                    onClick={() => onNavigate("Upgrade")}
                    className="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all"
                >
                    <Trans th="อัปเกรดแพ็กเกจ" en="Upgrade Plan" />
                </button>
            </div>

            {/* High-level KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-50 text-green-500 flex items-center justify-center text-2xl font-black">฿</div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider"><Trans th="ยอดขายรวม" en="Total Revenue" /></p>
                        <p className="text-2xl font-black text-gray-800">฿{data.totalRevenue.toLocaleString()}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center text-2xl font-black">📦</div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider"><Trans th="ออเดอร์ทั้งหมด" en="Total Orders" /></p>
                        <p className="text-2xl font-black text-gray-800">{data.totalOrders.toLocaleString()}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center text-2xl font-black">⏳</div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider"><Trans th="รอจัดส่ง" en="Pending Orders" /></p>
                        <p className="text-2xl font-black text-gray-800">{data.pendingOrders.toLocaleString()}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center text-2xl font-black">🏪</div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider"><Trans th="จำนวนร้านค้า" en="Total Shops" /></p>
                        <p className="text-2xl font-black text-gray-800">{data.totalShops}</p>
                    </div>
                </div>
            </div>

            {/* Shop Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4"><Trans th="ยอดขายแยกตามร้านค้า" en="Revenue by Shop" /></h2>
                <div className="space-y-4">
                    {data.shops.map((shop, i) => {
                        const percent = data.totalRevenue > 0 ? (shop.revenue / data.totalRevenue) * 100 : 0;
                        return (
                            <div key={i} className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {shop.logo ? (
                                            <img src={shop.logo} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-100" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
                                                {shop.name.charAt(0)}
                                            </div>
                                        )}
                                        <span className="font-medium text-gray-700 text-sm">{shop.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-800 text-sm">฿{shop.revenue.toLocaleString()}</p>
                                        <p className="text-xs text-gray-500">{shop.orders} <Trans th="ออเดอร์" en="orders" /></p>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className="bg-gradient-to-r from-pink-400 to-purple-500 h-2 rounded-full" 
                                        style={{ width: `${percent}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
