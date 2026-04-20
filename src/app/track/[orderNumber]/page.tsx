"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Package, Truck, CheckCircle, Clock, XCircle, ExternalLink } from "lucide-react";

interface TrackOrder {
    orderNumber: string;
    customerName: string;
    status: string;
    total: number;
    shipping: string;
    trackingNumber: string | null;
    shippingProvider: string | null;
    createdAt: string;
    paidAt: string | null;
    items: { name: string; quantity: number; image?: string }[];
}

const STATUS_STEPS = [
    { key: "pending",   label: "รอดำเนินการ",  icon: Clock,        color: "text-yellow-500" },
    { key: "confirmed", label: "ยืนยันออเดอร์", icon: CheckCircle,  color: "text-blue-500" },
    { key: "shipped",   label: "กำลังจัดส่ง",   icon: Truck,        color: "text-purple-500" },
    { key: "completed", label: "ส่งถึงมือแล้ว", icon: Package,      color: "text-green-500" },
];

const STATUS_ORDER = ["pending", "confirmed", "shipped", "completed"];

function getTrackingUrl(provider: string, tracking: string): string | null {
    const p = provider.toLowerCase();
    if (p.includes("flash")) return `https://www.flashexpress.co.th/fle/tracking?se=${tracking}`;
    if (p.includes("kerry")) return `https://th.kerryexpress.com/th/track/?track=${tracking}`;
    if (p.includes("j&t") || p.includes("jt")) return `https://www.jtexpress.co.th/index/query/gzquery.html?billcode=${tracking}`;
    if (p.includes("thaipost") || p.includes("ไปรษณีย์")) return `https://track.thailandpost.co.th/?trackNumber=${tracking}`;
    if (p.includes("ems")) return `https://track.thailandpost.co.th/?trackNumber=${tracking}`;
    if (p.includes("shopee")) return `https://spx.co.th/track?id=${tracking}`;
    if (p.includes("ninja")) return `https://www.ninjavan.co/th-th/tracking?id=${tracking}`;
    if (p.includes("best")) return `https://www.best-inc.co.th/track?bills=${tracking}`;
    return null;
}

export default function TrackPage() {
    const { orderNumber } = useParams<{ orderNumber: string }>();
    const [order, setOrder] = useState<TrackOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch(`/api/track/${orderNumber}`)
            .then(r => r.json())
            .then(d => {
                if (d.success) setOrder(d.data);
                else setError(d.error || "ไม่พบคำสั่งซื้อ");
            })
            .catch(() => setError("ไม่สามารถโหลดข้อมูลได้"))
            .finally(() => setLoading(false));
    }, [orderNumber]);

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-sm">กำลังโหลดข้อมูล...</p>
            </div>
        </div>
    );

    if (error || !order) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
                <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h1 className="text-lg font-bold text-gray-800 mb-2">ไม่พบข้อมูลการสั่งซื้อ</h1>
                <p className="text-sm text-gray-500">{error}</p>
            </div>
        </div>
    );

    const isCancelled = order.status === "cancelled" || order.status === "CANCELLED";
    const currentStep = isCancelled ? -1 : STATUS_ORDER.indexOf(order.status);
    const trackingUrl = order.trackingNumber && order.shippingProvider
        ? getTrackingUrl(order.shippingProvider, order.trackingNumber)
        : null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 py-10 px-4">
            <div className="max-w-lg mx-auto space-y-4">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <Package className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">ติดตามสินค้า</h1>
                    <p className="text-sm text-gray-500 mt-1">เลขที่ออเดอร์: <span className="font-mono font-bold text-purple-600">{order.orderNumber}</span></p>
                </div>

                {/* Status Timeline */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="text-sm font-bold text-gray-700 mb-5">สถานะการสั่งซื้อ</h2>
                    {isCancelled ? (
                        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl">
                            <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-red-700">ออเดอร์ถูกยกเลิก</p>
                                <p className="text-xs text-red-500 mt-0.5">หากมีข้อสงสัยกรุณาติดต่อร้านค้า</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-0">
                            {STATUS_STEPS.map((step, idx) => {
                                const Icon = step.icon;
                                const isDone = idx <= currentStep;
                                const isCurrent = idx === currentStep;
                                return (
                                    <div key={step.key} className="flex items-start gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                                isDone ? `bg-gradient-to-br from-purple-500 to-pink-500 shadow-md` : 'bg-gray-100'
                                            }`}>
                                                <Icon className={`w-5 h-5 ${isDone ? 'text-white' : 'text-gray-400'}`} />
                                            </div>
                                            {idx < STATUS_STEPS.length - 1 && (
                                                <div className={`w-0.5 h-8 mt-1 ${isDone && idx < currentStep ? 'bg-purple-400' : 'bg-gray-200'}`} />
                                            )}
                                        </div>
                                        <div className="pt-2 pb-6">
                                            <p className={`text-sm font-semibold ${isDone ? 'text-gray-800' : 'text-gray-400'}`}>
                                                {step.label}
                                                {isCurrent && <span className="ml-2 text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">ปัจจุบัน</span>}
                                            </p>
                                            {isCurrent && step.key === "shipped" && order.trackingNumber && (
                                                <p className="text-xs text-purple-600 font-mono mt-1">📦 {order.trackingNumber}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Tracking Button */}
                {trackingUrl && (
                    <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3.5 rounded-2xl text-sm font-bold shadow-md hover:shadow-lg transition-all"
                    >
                        <Truck className="w-4 h-4" />
                        ติดตามพัสดุ ({order.shippingProvider})
                        <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                    </a>
                )}

                {/* Order Summary */}
                <div className="bg-white rounded-2xl shadow-sm p-5">
                    <h2 className="text-sm font-bold text-gray-700 mb-3">รายละเอียดสินค้า</h2>
                    <div className="space-y-3">
                        {order.items.map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                {item.image && (
                                    <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover" />
                                )}
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                                    <p className="text-xs text-gray-400">x{item.quantity}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-gray-100 mt-4 pt-3 flex justify-between">
                        <span className="text-sm font-bold text-gray-700">ยอดรวม</span>
                        <span className="text-sm font-bold text-purple-600">
                            ฿{order.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
