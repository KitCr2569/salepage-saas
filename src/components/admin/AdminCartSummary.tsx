"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, MessageSquare, Trash2, RefreshCw, Eye, ShoppingCart, Package, X, User, Phone, MapPin, CreditCard, Truck, Search } from "lucide-react";
import { Trans } from "@/components/Trans";

interface OrderItem {
    productId: string;
    name: string;
    variantId: string;
    variantName: string;
    quantity: number;
    price: number;
    image: string;
}

interface Order {
    id: string;
    customer: string;
    phone: string;
    email: string;
    address: string;
    items: OrderItem[];
    itemCount: number;
    total: number;
    shipping: string;
    shippingCost: number;
    payment: string;
    status: string;
    date: string;
    note: string;
    facebookId?: string;
    facebookName?: string;
    facebookPsid?: string;
    facebookAvatar?: string;
    paymentSlipUrl?: string | null;
    paidAt?: string | null;
}

const timeFilters = [
    { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "today" : "วันนี้"), days: 0 },
    { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "yesterday" : "เมื่อวานนี้"), days: 1 },
    { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "3 days ago" : "3 วันที่แล้ว"), days: 3 },
    { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "7 days ago" : "7 วันที่แล้ว"), days: 7 },
    { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "15 days ago" : "15 วันที่แล้ว"), days: 15 },
    { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "This month" : "เดือนนี้"), days: 30 },
    { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "90 days ago" : "90 วันก่อน"), days: 90 },
    { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "365 days ago" : "365 วันก่อน"), days: 365 },
    { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "all" : "ทั้งหมด"), days: -1 },
];

const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Pending" : "รอดำเนินการ"), color: "bg-yellow-100 text-yellow-700" },
    confirmed: { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Confirmed" : "ยืนยันแล้ว"), color: "bg-blue-100 text-blue-700" },
    shipped: { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Already shipped" : "จัดส่งแล้ว"), color: "bg-purple-100 text-purple-700" },
    completed: { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "succeed" : "สำเร็จ"), color: "bg-green-100 text-green-700" },
    cancelled: { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "cancel" : "ยกเลิก"), color: "bg-red-100 text-red-700" },
};

export default function AdminCartSummary({ isActive }: { isActive?: boolean }) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState("ทั้งหมด");
    const [activeSubTab, setActiveSubTab] = useState<"all" | "paid">("all");
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [zoomImage, setZoomImage] = useState<string | null>(null);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/orders");
            const data = await res.json();
            if (data.success) {
                setOrders(data.orders);
            }
        } catch (err) {
            console.error("Failed to fetch orders:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch on mount
    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Re-fetch every time this tab becomes active (handles always-mounted case)
    useEffect(() => {
        if (isActive) {
            fetchOrders();
        }
    }, [isActive, fetchOrders]);


    // Filter orders by time
    const filteredOrders = orders.filter((order) => {
        const filterObj = timeFilters.find((f) => f.label === activeFilter);
        if (!filterObj || filterObj.days === -1) return true;

        const orderDate = new Date(order.date);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

        if (filterObj.days === 0) {
            return orderDate.toDateString() === now.toDateString();
        }
        return diffDays <= filterObj.days;
    }).filter((order) => {
        if (activeSubTab === "paid") return order.status !== "pending";
        return true;
    });

    const validOrders = filteredOrders.filter(o => o.status !== "cancelled");
    const totalAmount = validOrders.reduce((sum, o) => sum + o.total, 0);
    const totalItemCount = validOrders.reduce((sum, o) => sum + (o.items?.length || o.itemCount || 0), 0);
    
    const cancelledOrders = filteredOrders.filter(o => o.status === "cancelled");
    const cancelledAmount = cancelledOrders.reduce((sum, o) => sum + o.total, 0);

    const pendingCount = filteredOrders.filter(o => o.status === "pending").length;
    const confirmedCount = filteredOrders.filter(o => o.status === "confirmed").length;
    const shippedCount = filteredOrders.filter(o => o.status === "shipped").length;
    const completedCount = filteredOrders.filter(o => o.status === "completed").length;

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'), { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: 'Asia/Bangkok' });
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredOrders.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
        }
    };

    const exportCSV = () => {
        const headers = ["เลขออเดอร์", "ชื่อลูกค้า", "เบอร์โทร", "จำนวนสินค้า", "ราคารวม", "การจัดส่ง", "สถานะ", "วันที่"];
        const rows = filteredOrders.map((o) => [
            o.id,
            o.customer,
            o.phone,
            o.items?.length || o.itemCount || 0,
            o.total,
            o.shipping,
            statusConfig[o.status]?.label || o.status,
            new Date(o.date).toLocaleString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH')),
        ]);
        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    return (
        <div className="p-6 md:p-8">
            {/* Title */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold text-pink-500 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    <Trans th="สรุปตะกร้าสินค้า" en="Shopping Cart Summary" />
                                    </h1>
                <button
                    onClick={fetchOrders}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-600 rounded-xl hover:bg-pink-100 transition-colors text-sm font-medium"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    <Trans th="รีเฟรช" en="Refresh" />
                                    </button>
            </div>

            {/* Revenue Cards (Top) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white flex flex-col justify-center shadow-lg">
                    <p className="text-3xl font-bold">฿{totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                    <p className="text-sm opacity-90 mt-1">{<Trans th="ยอดรวม (฿)" en="Total Amount" />}</p>
                </div>
                <div className="bg-gradient-to-br from-red-400 to-red-500 rounded-2xl p-5 text-white flex flex-col justify-center shadow-lg">
                    <p className="text-3xl font-bold">฿{cancelledAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                    <p className="text-sm opacity-90 mt-1">{<Trans th="ยอดยกเลิก (฿)" en="Cancelled Amount" />}</p>
                </div>
            </div>

            {/* Counts Cards (Bottom) */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
                <div className="bg-gradient-to-br from-pink-400 to-pink-500 rounded-2xl p-4 text-white flex flex-col justify-center">
                    <p className="text-2xl font-bold">{filteredOrders.length}</p>
                    <p className="text-[11px] opacity-90">{<Trans th="ออเดอร์ทั้งหมด" en="All orders" />}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-2xl p-4 text-white flex flex-col justify-center">
                    <p className="text-2xl font-bold">{totalItemCount}</p>
                    <p className="text-[11px] opacity-90">{<Trans th="จำนวนสินค้า" en="Items" />}</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-400 to-orange-400 rounded-2xl p-4 text-white flex flex-col justify-center">
                    <p className="text-2xl font-bold">{pendingCount}</p>
                    <p className="text-[11px] opacity-90">{<Trans th="รอดำเนินการ" en="Pending" />}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-300 to-blue-400 rounded-2xl p-4 text-white flex flex-col justify-center">
                    <p className="text-2xl font-bold">{confirmedCount}</p>
                    <p className="text-[11px] opacity-90">{<Trans th="ยืนยันแล้ว" en="Confirmed" />}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-400 to-purple-500 rounded-2xl p-4 text-white flex flex-col justify-center">
                    <p className="text-2xl font-bold">{shippedCount}</p>
                    <p className="text-[11px] opacity-90">{<Trans th="จัดส่งแล้ว" en="Shipped" />}</p>
                </div>
                <div className="bg-gradient-to-br from-green-400 to-green-500 rounded-2xl p-4 text-white flex flex-col justify-center">
                    <p className="text-2xl font-bold">{completedCount}</p>
                    <p className="text-[11px] opacity-90">{<Trans th="สำเร็จ" en="Completed" />}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl p-4 text-white flex flex-col justify-center">
                    <p className="text-2xl font-bold">{cancelledOrders.length}</p>
                    <p className="text-[11px] opacity-90">{<Trans th="จำนวนยกเลิก" en="Cancelled" />}</p>
                </div>
            </div>

            {/* Time Filter Chips */}
            <div className="flex flex-wrap gap-2 mb-4">
                {timeFilters.map((filter) => (
                    <button
                        key={filter.label}
                        onClick={() => setActiveFilter(filter.label)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-all ${activeFilter === filter.label
                            ? "bg-pink-500 text-white border-pink-500"
                            : "bg-white text-gray-500 border-gray-200 hover:border-pink-300"
                            }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Sub tabs */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setActiveSubTab("all")}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${activeSubTab === "all"
                        ? "bg-pink-500 text-white"
                        : "bg-gray-100 text-gray-500"
                        }`}
                >
                    {<Trans th="ทั้งหมด (" en="all (" />}{filteredOrders.length})
                </button>
                <button
                    onClick={() => setActiveSubTab("paid")}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${activeSubTab === "paid"
                        ? "bg-pink-500 text-white"
                        : "bg-gray-100 text-gray-500"
                        }`}
                >
                    {<Trans th="เฉพาะผู้ซื้อ (" en="Only for buyers (" />}{orders.filter((o) => o.status !== "pending").length})
                </button>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 mb-4">
                <button
                    onClick={exportCSV}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                >
                    <Download className="w-3 h-3" />
                    <Trans th="ส่งออก CSV" en="Export CSV" />
                                    </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[700px]">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="w-10 px-4 py-3">
                                <input
                                    type="checkbox"
                                    className="rounded"
                                    checked={selectedIds.size === filteredOrders.length && filteredOrders.length > 0}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">{<Trans th="ชื่อ" en="name" />}</th>
                            <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">{<Trans th="จำนวนสินค้า" en="Number of products" />}</th>
                            <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">{<Trans th="ราคา" en="price" />}</th>
                            <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">{<Trans th="สถานะ" en="status" />}</th>
                            <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">{<Trans th="เวลา" en="time" />}</th>
                            <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">{<Trans th="หมายเหตุ" en="note" />}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="text-center py-20">
                                    <RefreshCw className="w-8 h-8 text-pink-400 animate-spin mx-auto mb-3" />
                                    <p className="text-gray-500">{<Trans th="กำลังโหลด..." en="Loading..." />}</p>
                                </td>
                            </tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-20">
                                    <div className="flex flex-col items-center">
                                        <Package className="w-12 h-12 text-gray-300 mb-4" />
                                        <p className="text-lg font-bold text-pink-500 mb-1">{<Trans th="ยังไม่มีออเดอร์" en="There is no order yet." />}</p>
                                        <p className="text-sm text-gray-500 max-w-md">
                                            <Trans th="เมื่อมีลูกค้าสั่งซื้อสินค้า ออเดอร์จะแสดงที่นี่" en="When a customer orders a product Orders will be displayed here." />
                                                                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map((order) => {
                                const status = statusConfig[order.status] || { label: order.status, color: "bg-gray-100 text-gray-600" };
                                const itemNames = order.items?.map((i) => `${i.name} [${i.variantName}]`).join(", ") || "-";
                                return (
                                    <tr
                                        key={order.id}
                                        className="border-b border-gray-50 hover:bg-pink-50/50 transition-colors cursor-pointer"
                                        onClick={() => setSelectedOrder(order)}
                                    >
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="rounded"
                                                checked={selectedIds.has(order.id)}
                                                onChange={() => toggleSelect(order.id)}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                {(order as any).facebookAvatar ? (
                                                    <div onClick={(e) => e.stopPropagation()}>
                                                        <img
                                                            src={(order as any).facebookAvatar}
                                                            alt=""
                                                            className="w-9 h-9 rounded-full object-cover border-2 border-blue-400"
                                                            referrerPolicy="no-referrer"
                                                        />
                                                    </div>
                                                ) : (order as any).facebookId ? (
                                                    <a href={`https://facebook.com/${(order as any).facebookId}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                                        <img
                                                            src={`https://graph.facebook.com/${(order as any).facebookId}/picture?type=normal`}
                                                            alt=""
                                                            className="w-9 h-9 rounded-full object-cover border-2 border-blue-400"
                                                        />
                                                    </a>
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                                        <User className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">{order.customer}</p>
                                                    <p className="text-xs text-gray-400">{order.phone}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="text-sm text-gray-700">{order.items?.length || order.itemCount || 0} {<Trans th="ชิ้น" en="item" />}</p>
                                                <p className="text-xs text-gray-400 max-w-[200px] truncate">{itemNames}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-bold text-gray-800">
                                                ฿{order.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-gray-500">{formatDate(order.date)}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-gray-400 max-w-[100px] truncate block">
                                                {order.note || "-"}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                        <Trans th="แสดง" en="show" /> {filteredOrders.length} <Trans th="รายการ" en="list" />
                                            </span>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-500">Rows per page:</span>
                        <select className="text-xs text-gray-600 border border-gray-200 rounded px-2 py-1">
                            <option>25</option>
                            <option>50</option>
                            <option>100</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedOrder(null)}>
                    <div
                        className="bg-white rounded-3xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-white rounded-t-3xl px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10">
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">{selectedOrder.id}</h2>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig[selectedOrder.status]?.color || "bg-gray-100"}`}>
                                    {statusConfig[selectedOrder.status]?.label || selectedOrder.status}
                                </span>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="px-6 py-4 space-y-5">
                            {/* Customer Info */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <User className="w-4 h-4 text-pink-500" /> <Trans th="ข้อมูลลูกค้า" en="Customer information" />
                                                                    </h3>
                                <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                                    <p className="text-sm text-gray-800 font-medium">{selectedOrder.customer}</p>
                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                        <Phone className="w-3.5 h-3.5" /> {selectedOrder.phone}
                                    </p>
                                    {selectedOrder.address && (
                                        <p className="text-sm text-gray-600 flex items-start gap-1">
                                            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {selectedOrder.address}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Items */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-pink-500" /> {<Trans th="สินค้า (" en="product (" />}{selectedOrder.items?.length || 0} <Trans th="รายการ)" en="list)" />
                                                                    </h3>
                                <div className="space-y-2">
                                    {selectedOrder.items?.map((item, idx) => (
                                        <div key={idx} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                                            {item.image && <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-800 break-words">{item.name}</p>
                                                <p className="text-xs text-gray-500">{item.variantName} x{item.quantity}</p>
                                            </div>
                                            <p className="text-sm font-bold text-gray-800 self-center">
                                                ฿{(item.price * item.quantity).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Shipping & Payment */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                                        <Truck className="w-3 h-3" /> <Trans th="การจัดส่ง" en="Shipping" />
                                                                            </p>
                                    <p className="text-sm font-medium text-gray-800">{selectedOrder.shipping || "-"}</p>
                                    <p className="text-xs text-gray-500">{selectedOrder.shippingCost > 0 ? `฿${selectedOrder.shippingCost}` : "ฟรี"}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <CreditCard className="w-3 h-3" /> <Trans th="ชำระเงิน" en="Make payment" />
                                                                                    </p>
                                        {selectedOrder.paidAt && (
                                            <span className="text-[10px] text-green-600 bg-green-100 px-1.5 py-0.5 rounded-md">
                                                <Trans th="จ่ายแล้ว" en="Paid" />
                                                                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-gray-800">{selectedOrder.payment || "-"}</p>
                                    {selectedOrder.paymentSlipUrl && (
                                        <div className="mt-2 space-y-2">
                                            <div 
                                                className="relative group cursor-pointer overflow-hidden rounded-lg border border-gray-200 aspect-[3/4] w-full max-w-[120px] mx-auto"
                                                onClick={() => setZoomImage(selectedOrder.paymentSlipUrl!)}
                                            >
                                                <img 
                                                    src={selectedOrder.paymentSlipUrl} 
                                                    alt="Payment Slip" 
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/120x160?text=Error'; }}
                                                />
                                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Search className="w-5 h-5 text-white" />
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setZoomImage(selectedOrder.paymentSlipUrl!)}
                                                className="flex items-center justify-center gap-1.5 w-full bg-white border border-green-200 text-green-600 text-xs py-1.5 rounded-lg hover:bg-green-50 transition-colors shadow-sm"
                                            >
                                                <Eye className="w-3.5 h-3.5" /> <Trans th="ดูสลิป (คลิกขยายรูป)" en="See the slip (click to enlarge the picture)" />
                                                                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Total */}
                            <div className="bg-pink-50 rounded-xl p-4 flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-700">{<Trans th="ยอดรวมทั้งหมด" en="Grand total" />}</span>
                                <span className="text-xl font-bold text-pink-600">
                                    ฿{selectedOrder.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </span>
                            </div>

                            <p className="text-xs text-gray-400 text-center"><Trans th="สั่งเมื่อ" en="Order when" /> {formatDate(selectedOrder.date)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Zoom Modal */}
            {zoomImage && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={() => setZoomImage(null)}
                >
                    <div className="relative max-w-3xl max-h-[90vh] w-full flex justify-center">
                        <button 
                            className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors bg-black/40 rounded-full p-2"
                            onClick={(e) => { e.stopPropagation(); setZoomImage(null); }}
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <img 
                            src={zoomImage} 
                            alt="Slip Zoom" 
                            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
