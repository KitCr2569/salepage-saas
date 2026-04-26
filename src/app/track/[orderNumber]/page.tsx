"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Package, Truck, CheckCircle, Clock, XCircle, ExternalLink, Copy, Check, ShoppingBag } from "lucide-react";

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
    items: { name: string; quantity: number; image?: string; price?: number }[];
}

const STATUS_STEPS = [
    { key: "pending",   label: "รอดำเนินการ",   labelEn: "Pending",     icon: Clock,       color: "from-amber-400 to-yellow-500",  bg: "bg-amber-50",  text: "text-amber-700" },
    { key: "confirmed", label: "ยืนยันออเดอร์",  labelEn: "Confirmed",   icon: CheckCircle, color: "from-blue-400 to-indigo-500",   bg: "bg-blue-50",   text: "text-blue-700" },
    { key: "shipped",   label: "กำลังจัดส่ง",    labelEn: "Shipped",     icon: Truck,       color: "from-purple-400 to-violet-500", bg: "bg-purple-50", text: "text-purple-700" },
    { key: "completed", label: "ส่งถึงมือแล้ว",  labelEn: "Delivered",   icon: Package,     color: "from-emerald-400 to-green-500", bg: "bg-green-50",  text: "text-green-700" },
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

function formatDate(dateStr: string) {
    try {
        return new Date(dateStr).toLocaleDateString("th-TH", {
            year: "numeric", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit",
        });
    } catch { return dateStr; }
}

export default function TrackPage() {
    const { orderNumber } = useParams<{ orderNumber: string }>();
    const [order, setOrder] = useState<TrackOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

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

    const copyTracking = () => {
        if (order?.trackingNumber) {
            navigator.clipboard.writeText(order.trackingNumber);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 flex items-center justify-center">
            <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-purple-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" />
                    <Package className="absolute inset-0 m-auto w-6 h-6 text-purple-400" />
                </div>
                <p className="text-gray-500 text-sm font-medium">กำลังโหลดข้อมูล...</p>
            </div>
        </div>
    );

    if (error || !order) return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-3xl shadow-xl shadow-red-500/5 p-10 max-w-md w-full text-center border border-red-100">
                <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <XCircle className="w-10 h-10 text-red-400" />
                </div>
                <h1 className="text-xl font-bold text-gray-800 mb-2">ไม่พบข้อมูลการสั่งซื้อ</h1>
                <p className="text-sm text-gray-500 mb-6">{error}</p>
                <a href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-500/20 hover:shadow-xl transition-all">
                    <ShoppingBag className="w-4 h-4" /> กลับหน้าร้าน
                </a>
            </div>
        </div>
    );

    const isCancelled = order.status === "cancelled" || order.status === "CANCELLED";
    const currentStep = isCancelled ? -1 : STATUS_ORDER.indexOf(order.status);
    const currentStepData = !isCancelled && currentStep >= 0 ? STATUS_STEPS[currentStep] : null;
    const trackingUrl = order.trackingNumber && order.shippingProvider
        ? getTrackingUrl(order.shippingProvider, order.trackingNumber)
        : null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 py-8 px-4">
            <div className="max-w-lg mx-auto space-y-5">
                {/* Header Card */}
                <div className="text-center">
                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl ${
                        isCancelled
                            ? 'bg-gradient-to-br from-red-400 to-rose-500 shadow-red-500/25'
                            : `bg-gradient-to-br ${currentStepData?.color || 'from-purple-500 to-pink-500'} shadow-purple-500/25`
                    }`} style={{ animation: 'float 3s ease-in-out infinite' }}>
                        {isCancelled
                            ? <XCircle className="w-10 h-10 text-white" />
                            : currentStepData
                                ? <currentStepData.icon className="w-10 h-10 text-white" />
                                : <Package className="w-10 h-10 text-white" />
                        }
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-800 mb-1">
                        {isCancelled ? 'ออเดอร์ถูกยกเลิก' : (currentStepData?.label || 'ติดตามสินค้า')}
                    </h1>
                    <p className="text-sm text-gray-500">
                        ออเดอร์: <span className="font-mono font-bold text-purple-600">{order.orderNumber}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        สั่งเมื่อ {formatDate(order.createdAt)}
                    </p>
                </div>

                {/* Status Timeline */}
                <div className="bg-white rounded-3xl shadow-lg shadow-purple-500/5 p-6 border border-gray-100">
                    <h2 className="text-sm font-bold text-gray-700 mb-6 flex items-center gap-2">
                        📋 สถานะการสั่งซื้อ
                    </h2>
                    {isCancelled ? (
                        <div className="flex items-center gap-4 p-5 bg-red-50 rounded-2xl border border-red-100">
                            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <XCircle className="w-7 h-7 text-red-500" />
                            </div>
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
                                    <div key={step.key} className="flex items-start gap-4" style={{ animation: isDone ? `fadeSlideIn 0.4s ease-out ${idx * 0.1}s both` : 'none' }}>
                                        <div className="flex flex-col items-center">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                                                isDone 
                                                    ? `bg-gradient-to-br ${step.color} shadow-lg`
                                                    : 'bg-gray-100 border-2 border-dashed border-gray-200'
                                            } ${isCurrent ? 'scale-110 ring-4 ring-purple-100' : ''}`}>
                                                <Icon className={`w-5 h-5 transition-colors ${isDone ? 'text-white' : 'text-gray-300'}`} />
                                            </div>
                                            {idx < STATUS_STEPS.length - 1 && (
                                                <div className={`w-0.5 h-8 mt-1 rounded-full transition-all duration-500 ${
                                                    isDone && idx < currentStep ? 'bg-gradient-to-b from-purple-400 to-pink-300' : 'bg-gray-200'
                                                }`} />
                                            )}
                                        </div>
                                        <div className="pt-3 pb-6 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className={`text-sm font-bold transition-colors ${isDone ? 'text-gray-800' : 'text-gray-400'}`}>
                                                    {step.label}
                                                </p>
                                                {isCurrent && (
                                                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${step.bg} ${step.text} animate-pulse`}>
                                                        ปัจจุบัน
                                                    </span>
                                                )}
                                            </div>
                                            {isCurrent && step.key === "shipped" && order.trackingNumber && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-xs text-purple-600 font-mono bg-purple-50 px-3 py-1 rounded-lg">
                                                        📦 {order.trackingNumber}
                                                    </span>
                                                    <button onClick={copyTracking} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                                                        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                                                    </button>
                                                </div>
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
                        className="group w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-2xl text-sm font-bold shadow-lg shadow-purple-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                        <Truck className="w-5 h-5 group-hover:animate-bounce" />
                        ติดตามพัสดุ {order.shippingProvider && `(${order.shippingProvider.split('|')[0]})`}
                        <ExternalLink className="w-4 h-4 opacity-70" />
                    </a>
                )}

                {/* Order Summary */}
                <div className="bg-white rounded-3xl shadow-lg shadow-purple-500/5 p-6 border border-gray-100">
                    <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                        🛒 รายละเอียดสินค้า
                    </h2>
                    <div className="space-y-3">
                        {order.items.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50/50 transition-colors">
                                {item.image ? (
                                    <img src={item.image} alt={item.name} className="w-14 h-14 rounded-xl object-cover shadow-sm" />
                                ) : (
                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center flex-shrink-0">
                                        <ShoppingBag className="w-6 h-6 text-purple-400" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                                    <p className="text-xs text-gray-400">x{item.quantity}</p>
                                </div>
                                {item.price && (
                                    <span className="text-sm font-bold text-gray-700">
                                        ฿{(item.price * item.quantity).toLocaleString()}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-gray-100 mt-4 pt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-gray-700">ยอดรวมทั้งสิ้น</span>
                            <span className="text-xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                ฿{order.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-400 pt-2 pb-6">
                    ขอบคุณที่ไว้วางใจใช้บริการ 🙏
                </p>
            </div>

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                }
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateX(-12px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
}
