'use client';

// ═══════════════════════════════════════════════════════════════
// Orders Panel — แสดงรายการคำสั่งซื้อทั้งหมด
// ดึงข้อมูลจาก /api/chat/orders
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import { Trans } from "@/components/Trans";

interface OrderItem {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

interface Order {
    id: string;
    orderNumber: string;
    status: string;
    subtotal: number;
    discount: number;
    shippingCost: number;
    total: number;
    customerName: string;
    customerPhone: string | null;
    customerAddress: string | null;
    note: string | null;
    items: OrderItem[];
    agent: { id: string; name: string } | null;
    contact: { displayName: string } | null;
    createdAt: string;
    updatedAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    DRAFT: { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Pending" : "รอดำเนินการ"), color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    CONFIRMED: { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Confirmed" : "ยืนยันแล้ว"), color: 'text-blue-400', bg: 'bg-blue-500/20' },
    SHIPPED: { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Shipped" : "จัดส่งแล้ว"), color: 'text-purple-400', bg: 'bg-purple-500/20' },
    COMPLETED: { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Completed" : "สำเร็จ"), color: 'text-green-400', bg: 'bg-green-500/20' },
    CANCELLED: { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Cancelled" : "ยกเลิก"), color: 'text-red-400', bg: 'bg-red-500/20' },
};

function formatCurrency(n: number): string {
    return new Intl.NumberFormat('th-TH').format(n);
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('th-TH', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Bangkok',
    });
}

export default function OrdersPanel() {
    const { get, patch } = useApi();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('');

    const fetchOrders = useCallback(async () => {
        try {
            const res = await get<Order[]>('/api/chat/orders');
            if (res.data) setOrders(res.data);
        } catch (err) {
            console.error('Failed to load orders:', err);
        } finally {
            setLoading(false);
        }
    }, [get]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const handleStatusUpdate = async (orderId: string, newStatus: string) => {
        try {
            await patch(`/api/chat/orders`, { id: orderId, status: newStatus });
            fetchOrders();
        } catch (err) {
            console.error('Failed to update status:', err);
        }
    };

    const filtered = statusFilter
        ? orders.filter(o => o.status === statusFilter)
        : orders;

    const totalRevenue = orders.filter(o => o.status !== 'CANCELLED')
        .reduce((sum, o) => sum + Number(o.total || 0), 0);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full mb-3" />
                    <p className="text-surface-400 text-sm">{<Trans th="กำลังโหลดคำสั่งซื้อ..." en="Loading orders..." />}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-4 md:p-6">
            <div className="max-w-4xl mx-auto space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Trans th="🧾 คำสั่งซื้อ" en="🧾 Orders" />
                                                    </h2>
                        <p className="text-surface-400 text-sm mt-1">
                            {orders.length} {<Trans th="รายการ • รายได้รวม ฿" en="Items • Total income ฿" />}{formatCurrency(totalRevenue)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-1.5 text-xs text-surface-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                            <option value="">{<Trans th="ทุกสถานะ" en="every status" />}</option>
                            {Object.entries(STATUS_LABELS).map(([key, val]) => (
                                <option key={key} value={key}>{val.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => { setLoading(true); fetchOrders(); }}
                            className="px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs transition-colors"
                        >
                            <Trans th="🔄 รีเฟรช" en="🔄 Refresh" />
                                                    </button>
                    </div>
                </div>

                {/* Orders List */}
                {filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <span className="text-5xl">🧾</span>
                        <p className="mt-4 text-surface-400">{<Trans th="ไม่พบคำสั่งซื้อ" en="Order not found" />}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((order) => {
                            const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.DRAFT;
                            const isExpanded = expandedId === order.id;

                            return (
                                <div
                                    key={order.id}
                                    className="bg-surface-900 rounded-xl border border-surface-800 overflow-hidden hover:border-surface-700 transition-colors"
                                >
                                    {/* Order header */}
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                                        className="w-full text-left p-4 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${statusInfo.bg}`}>
                                                🧾
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-semibold text-white">{order.orderNumber}</span>
                                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                                                        {statusInfo.label}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-surface-400 truncate mt-0.5">
                                                    👤 {order.customerName} • {formatDate(order.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <span className="text-lg font-bold text-white">
                                                ฿{formatCurrency(order.total)}
                                            </span>
                                            <svg className={`w-4 h-4 text-surface-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </button>

                                    {/* Expanded details */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 border-t border-surface-800 pt-3 space-y-3 animate-fade-in">
                                            {/* Items */}
                                            <div>
                                                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">{<Trans th="สินค้า" en="product" />}</p>
                                                <div className="space-y-1.5">
                                                    {order.items.map((item) => (
                                                        <div key={item.id} className="flex items-center justify-between py-1.5 px-3 bg-surface-800/50 rounded-lg">
                                                            <div className="flex-1 min-w-0"><span className="text-sm text-surface-200 break-words">{item.name}</span></div>
                                                            <span className="text-sm text-surface-300 flex-shrink-0 ml-3">
                                                                x{item.quantity} = ฿{formatCurrency(item.total)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Summary */}
                                            <div className="bg-surface-800/30 rounded-lg p-3 space-y-1 text-sm">
                                                <div className="flex justify-between text-surface-400">
                                                    <span>{<Trans th="ยอดสินค้า" en="Product amount" />}</span>
                                                    <span>฿{formatCurrency(order.subtotal)}</span>
                                                </div>
                                                {order.discount > 0 && (
                                                    <div className="flex justify-between text-red-400">
                                                        <span>{<Trans th="ส่วนลด" en="discount" />}</span>
                                                        <span>-฿{formatCurrency(order.discount)}</span>
                                                    </div>
                                                )}
                                                {order.shippingCost > 0 && (
                                                    <div className="flex justify-between text-surface-400">
                                                        <span>{<Trans th="ค่าจัดส่ง" en="Shipping cost" />}</span>
                                                        <span>+฿{formatCurrency(order.shippingCost)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between text-white font-bold border-t border-surface-700 pt-1 mt-1">
                                                    <span>{<Trans th="ยอดสุทธิ" en="Net balance" />}</span>
                                                    <span>฿{formatCurrency(order.total)}</span>
                                                </div>
                                            </div>

                                            {/* Customer info */}
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                {order.customerPhone && (
                                                    <div className="bg-surface-800/30 rounded-lg p-2">
                                                        <span className="text-surface-500">{<Trans th="📱 โทร:" en="📱 Call:" />}</span>
                                                        <span className="text-surface-200 ml-1">{order.customerPhone}</span>
                                                    </div>
                                                )}
                                                {order.agent && (
                                                    <div className="bg-surface-800/30 rounded-lg p-2">
                                                        <span className="text-surface-500">{<Trans th="👤 เจ้าหน้าที่:" en="👤 Officials:" />}</span>
                                                        <span className="text-surface-200 ml-1">{order.agent.name}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {order.customerAddress && (
                                                <div className="bg-surface-800/30 rounded-lg p-2 text-xs">
                                                    <span className="text-surface-500">{<Trans th="📍 ที่อยู่:" en="📍 Address:" />}</span>
                                                    <span className="text-surface-200 ml-1">{order.customerAddress}</span>
                                                </div>
                                            )}
                                            {order.note && (
                                                <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-2 text-xs">
                                                    <span className="text-amber-400">{<Trans th="📝 หมายเหตุ:" en="📝 Note:" />}</span>
                                                    <span className="text-amber-200 ml-1">{order.note}</span>
                                                </div>
                                            )}

                                            {/* Quick status update */}
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                <span className="text-xs text-surface-500 self-center mr-1">{<Trans th="เปลี่ยนสถานะ:" en="Change status:" />}</span>
                                                {Object.entries(STATUS_LABELS).map(([key, val]) => (
                                                    <button
                                                        key={key}
                                                        onClick={() => handleStatusUpdate(order.id, key)}
                                                        disabled={order.status === key}
                                                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                                                            order.status === key
                                                                ? `${val.bg} ${val.color} border-transparent font-semibold`
                                                                : 'border-surface-700 text-surface-400 hover:border-surface-600'
                                                        }`}
                                                    >
                                                        {val.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
