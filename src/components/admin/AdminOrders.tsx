"use client";

import { ClipboardList, Search, Eye, RefreshCw, ChevronDown, Package, User, Phone, MapPin, X, Truck, CreditCard, StickyNote, Copy, ExternalLink, Save, MessageCircle, Wifi, Printer, Trash2, Download, CheckSquare } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Trans } from "@/components/Trans";
import Swal from 'sweetalert2';

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
    status: "pending" | "confirmed" | "shipped" | "completed" | "cancelled";
    date: string;
    note: string;
    facebookId?: string;
    facebookName?: string;
    facebookPsid?: string;
    facebookAvatar?: string;
    trackingNumber?: string;
    shippingProvider?: string;
    proshipId?: string;
    paymentSlipUrl?: string | null;
    paidAt?: string | null;
}

const statusConfig = {
    pending: { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Pending" : "รอดำเนินการ"), color: "bg-yellow-100 text-yellow-700", dotColor: "bg-yellow-400" },
    confirmed: { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Confirmed" : "ยืนยันแล้ว"), color: "bg-blue-100 text-blue-700", dotColor: "bg-blue-400" },
    shipped: { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Already shipped" : "จัดส่งแล้ว"), color: "bg-purple-100 text-purple-700", dotColor: "bg-purple-400" },
    completed: { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "succeed" : "สำเร็จ"), color: "bg-green-100 text-green-700", dotColor: "bg-green-400" },
    cancelled: { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "cancel" : "ยกเลิก"), color: "bg-red-100 text-red-700", dotColor: "bg-red-400" },
};

export default function AdminOrders({ isActive, focusOrderId }: { isActive?: boolean; focusOrderId?: string | null }) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
    const [trackingInput, setTrackingInput] = useState("");
    const [providerInput, setProviderInput] = useState("");
    const [savingTracking, setSavingTracking] = useState(false);
    const [trackingMsg, setTrackingMsg] = useState<string | null>(null);
    const [zoomImage, setZoomImage] = useState<string | null>(null);
    const handledFocusRef = useRef<string | null>(null);
    // Messenger
    const [psidInput, setPsidInput] = useState("");
    const [sendingMsg, setSendingMsg] = useState(false);
    const [messengerMsg, setMessengerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [tokenStatus, setTokenStatus] = useState<"unknown" | "valid" | "invalid">("unknown");
    
    // Proship
    const [showProshipSettings, setShowProshipSettings] = useState(false);
    const [proshipConfig, setProshipConfig] = useState({ apiKey: "", shopId: "", shippingMethod: "thaipost" });
    const [savingProship, setSavingProship] = useState(false);
    const [sendingProship, setSendingProship] = useState(false);
    const [proshipId, setProshipId] = useState<string | null>(null);
    const [proshipEnabledMethods, setProshipEnabledMethods] = useState<Set<string>>(new Set());

    // Fetch which shipping methods have Proship API keys configured
    const [allShippingMethods, setAllShippingMethods] = useState<{id: string; name: string}[]>([]);
    useEffect(() => {
        fetch('/api/settings').then(r => r.json()).then(data => {
            if (data.success && data.data?.shippingMethods) {
                const methods: any[] = Array.isArray(data.data.shippingMethods) ? data.data.shippingMethods : [];
                const enabled = new Set<string>();
                methods.forEach(m => {
                    if (m.proshipApiKey && m.proshipApiKey.trim()) {
                        enabled.add(m.name);
                        enabled.add(m.id);
                    }
                });
                setProshipEnabledMethods(enabled);
                setAllShippingMethods(methods.filter((m: any) => m.enabled !== false).map((m: any) => ({ id: m.id || m.name, name: m.name })));
            }
        }).catch(() => {});
    }, []);

    const isProshipAvailable = (order: Order | null) => {
        if (!order?.shipping) return false;
        return proshipEnabledMethods.has(order.shipping);
    };

    // ─── Bulk select & Export ────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkStatus, setBulkStatus] = useState("");
    const [bulkUpdating, setBulkUpdating] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmDeleteSingle, setConfirmDeleteSingle] = useState<string | null>(null);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(o => o.id)));
        }
    };

    const bulkUpdateStatus = async () => {
        if (!bulkStatus || selectedIds.size === 0) return;
        setBulkUpdating(true);
        try {
            await Promise.all(Array.from(selectedIds).map(id =>
                fetch('/api/orders', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: id, status: bulkStatus }),
                })
            ));
            setOrders(prev => prev.map(o =>
                selectedIds.has(o.id) ? { ...o, status: bulkStatus as Order['status'] } : o
            ));
            setSelectedIds(new Set());
            setBulkStatus("");
        } finally {
            setBulkUpdating(false);
        }
    };

    const bulkDelete = async () => {
        if (selectedIds.size === 0) return;
        setBulkDeleting(true);
        try {
            const results = await Promise.allSettled(
                Array.from(selectedIds).map(id =>
                    fetch(`/api/orders?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).then(r => r.json())
                )
            );
            const succeeded = results.filter(r => r.status === 'fulfilled' && (r as any).value?.success).length;
            setOrders(prev => prev.filter(o => !selectedIds.has(o.id)));
            setSelectedIds(new Set());
            setConfirmDelete(false);
        } catch (e: any) {
            console.error('Delete error:', e);
        } finally {
            setBulkDeleting(false);
        }
    };

    const exportCSV = () => {
        const rows = [
            ['เลขออเดอร์','ชื่อลูกค้า','เบอร์โทร','ที่อยู่','สินค้า','จำนวนชิ้น','ยอดรวม','การจัดส่ง','ชำระเงิน','สถานะ','หมายเหตุ','เลข Tracking','วันที่'],
            ...orders.map(o => [
                o.id,
                o.customer,
                o.phone,
                `"${(o.address || '').replace(/"/g, '""')}"`,
                `"${(o.items || []).map(i => `${i.name} x${i.quantity}`).join(', ').replace(/"/g, '""')}"`,
                o.itemCount,
                o.total,
                o.shipping,
                o.payment,
                o.status,
                `"${(o.note || '').replace(/"/g, '""')}"`,
                o.trackingNumber || '',
                new Date(o.date).toLocaleDateString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'), { timeZone: 'Asia/Bangkok' }),
            ])
        ];
        const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const [syncingSheets, setSyncingSheets] = useState(false);
    const syncGoogleSheets = async () => {
        setSyncingSheets(true);
        try {
            const res = await fetch("/api/sheets/sync", { method: "POST" });
            const data = await res.json();
            if (data.success) {
                Swal.fire({ title: 'สำเร็จ!', text: data.message || `บันทึกลง Google Sheets สำเร็จ (${data.synced} ออเดอร์)`, icon: 'success', confirmButtonColor: '#3085d6' });
            } else {
                Swal.fire({ title: 'แจ้งเตือน', text: data.message || data.error || 'ไม่มีออเดอร์ใหม่ให้บันทึก (ระบบเช็คเฉพาะออเดอร์ที่ยังไม่เคยลงบัญชี)', icon: 'info', confirmButtonColor: '#3085d6' });
            }
        } catch (e: any) {
            Swal.fire({ title: 'ผิดพลาด', text: `เกิดข้อผิดพลาด: ${e.message}`, icon: 'error', confirmButtonColor: '#d33' });
        } finally {
            setSyncingSheets(false);
        }
    };

    useEffect(() => {
        fetch("/api/shop/proship").then(r => r.json()).then(d => {
            if (d.success && d.config) setProshipConfig(d.config);
        });
    }, []);

    const saveProshipConfig = async () => {
        setSavingProship(true);
        try {
            const res = await fetch("/api/shop/proship", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(proshipConfig)
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire({ text: "บันทึกการตั้งค่า Proship สำเร็จ!", icon: 'success' });
                setShowProshipSettings(false);
            } else {
                Swal.fire({ text: "เกิดข้อผิดพลาด: " + data.error, icon: 'error' });
            }
        } catch (e: any) {
            Swal.fire({ text: String(e.message), icon: 'info' });
        } finally {
            setSavingProship(false);
        }
    };

    const sendToProship = async (orderId: string) => {
        // Removed confirm for automated testing
        setSendingProship(true);
        setTrackingMsg(null);
        try {
            const res = await fetch("/api/proship/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId })
            });
            const data = await res.json();
            if (data.success && data.trackingNumber) {
                setTrackingInput(data.trackingNumber);
                setProviderInput("Proship");
                if (data.proshipId) setProshipId(data.proshipId);
                setTrackingMsg("สร้างพัสดุผ่าน Proship สำเร็จ!");
                
                // Persist immediately
                await saveTracking(orderId, data.trackingNumber, "Proship", data.proshipId);
                
                fetchOrders(); // refresh order list
            } else {
                Swal.fire({ text: "สร้างรายการไม่สำเร็จ: " + (data.error || "ตรวจสอบ API Key"), icon: 'error' });
            }
        } catch (e: any) {
            Swal.fire({ text: String(e.message), icon: 'info' });
        } finally {
            setSendingProship(false);
        }
    };

    const [printingLabel, setPrintingLabel] = useState(false);

    const printProshipSticker = async () => {
        if (!selectedOrder) return;
        
        const targetProshipId = proshipId || selectedOrder.proshipId || selectedOrder.trackingNumber?.split('|')[0];
        
        console.log("🖨️ Attempting to print label for:", selectedOrder.id);
        console.log("🆔 targetProshipId:", targetProshipId);

        if (!targetProshipId) {
            Swal.fire({ text: "ออเดอร์นี้ยังไม่ได้สร้างรายการใน Proship หรือไม่พบรหัสสำหรับพิมพ์ครับ", icon: 'info' });
            return;
        }

        setPrintingLabel(true);
        try {
            const printRes = await fetch("/api/proship/print", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    orderId: selectedOrder.id,
                    targetProshipId: targetProshipId 
                })
            });

            const printData = await printRes.json();
            console.log("📄 Proship Print Response:", printData);

            if (printData.success && printData.url) {
                window.open(printData.url, "_blank");
            } else {
                Swal.fire({ text: "ไม่สามารถดึงใบปะหน้าได้: " + (printData.error || "เกิดข้อผิดพลาดในการเชื่อมต่อ"), icon: 'error' });
            }
        } catch (e: any) {
            console.error("Print Error:", e);
            Swal.fire({ text: "Error: " + e.message, icon: 'error' });
        } finally {
            setPrintingLabel(false);
        }
    };

    // ─── ใบปะหน้าธรรมดา (Simple Shipping Label) ─────────────────
    const [showSenderEdit, setShowSenderEdit] = useState(false);
    const [senderInfo, setSenderInfo] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('shipping-sender-info');
            if (saved) {
                try { return JSON.parse(saved); } catch {}
            }
        }
        return { name: '', phone: '', address: '' };
    });

    const saveSenderInfo = (info: { name: string; phone: string; address: string }) => {
        setSenderInfo(info);
        localStorage.setItem('shipping-sender-info', JSON.stringify(info));
    };

    const printSimpleLabel = () => {
        if (!selectedOrder) return;
        if (!senderInfo.name || !senderInfo.phone) {
            setShowSenderEdit(true);
            return;
        }

        const w = window.open('', '_blank', 'width=500,height=700');
        if (!w) return;

        const recipientName = selectedOrder.customer || '-';
        const recipientPhone = selectedOrder.phone || '-';
        const recipientAddress = selectedOrder.address || '-';

        w.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>ใบปะหน้าพัสดุ - ${selectedOrder.id}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Sarabun', sans-serif; padding: 10mm; background: #fff; }
  .label { border: 2.5px solid #000; width: 100mm; min-height: 140mm; margin: 0 auto; }
  .section { padding: 4mm 5mm; }
  .sender { border-bottom: 2px dashed #000; }
  .section-title { font-size: 11pt; font-weight: 700; margin-bottom: 2mm; color: #333; }
  .name { font-size: 14pt; font-weight: 700; margin-bottom: 1mm; }
  .phone { font-size: 12pt; font-weight: 600; color: #333; margin-bottom: 1mm; }
  .address { font-size: 11pt; line-height: 1.5; color: #222; }
  .recipient .name { font-size: 18pt; }
  .recipient .phone { font-size: 14pt; }
  .recipient .address { font-size: 13pt; }
  .order-id { text-align: center; font-size: 9pt; color: #666; padding: 2mm 0; border-top: 1px solid #ccc; }
  @media print {
    body { padding: 0; }
    @page { size: auto; margin: 5mm; }
  }
</style></head><body>
<div class="label">
  <div class="section sender">
    <div class="section-title">ผู้ส่ง</div>
    <div class="name">${senderInfo.name}</div>
    <div class="phone">${senderInfo.phone}</div>
    ${senderInfo.address ? `<div class="address">${senderInfo.address.replace(/\n/g, '<br>')}</div>` : ''}
  </div>
  <div class="section recipient">
    <div class="section-title">ผู้รับ</div>
    <div class="name">${recipientName}</div>
    <div class="address">${recipientAddress.replace(/\n/g, '<br>')}</div>
    <div class="phone">${recipientPhone}</div>
  </div>
  <div class="order-id">${selectedOrder.id}</div>
</div>
<script>window.onload = function() { window.print(); }</script>
</body></html>`);
        w.document.close();
    };

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/orders", { cache: "no-store" });
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

    // Auto-select order from notification
    useEffect(() => {
        if (!focusOrderId || focusOrderId === handledFocusRef.current) return;
        if (orders.length === 0) return; // wait for orders to load

        const target = orders.find((o) => o.id === focusOrderId);
        if (target) {
            setSelectedOrder(target);
            setTrackingInput(target.trackingNumber || "");
            setProviderInput(target.shippingProvider || "");
            handledFocusRef.current = focusOrderId;
        } else {
            // Order not in current list yet — force re-fetch then try again
            handledFocusRef.current = focusOrderId;
            fetch("/api/orders", { cache: "no-store" })
                .then(r => r.json())
                .then(data => {
                    if (data.success && data.orders) {
                        setOrders(data.orders);
                        const found = data.orders.find((o: Order) => o.id === focusOrderId);
                        if (found) {
                            setSelectedOrder(found);
                            setTrackingInput(found.trackingNumber || "");
                            setProviderInput(found.shippingProvider || "");
                        }
                    }
                });
        }
    }, [focusOrderId, orders]);


    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        setUpdatingStatus(orderId);
        try {
            const res = await fetch(`/api/orders`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, status: newStatus }),
            });
            const data = await res.json();
            if (data.success) {
                setOrders((prev) =>
                    prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as Order["status"] } : o))
                );
                if (selectedOrder?.id === orderId) {
                    setSelectedOrder({ ...selectedOrder, status: newStatus as Order["status"] });
                }
            }
        } catch (err) {
            console.error("Failed to update order:", err);
        } finally {
            setUpdatingStatus(null);
        }
    };

    const deleteOrder = async (orderId: string) => {
        setBulkDeleting(true);
        try {
            const res = await fetch(`/api/orders?id=${orderId}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (data.success) {
                setOrders((prev) => prev.filter((o) => o.id !== orderId));
                if (selectedOrder?.id === orderId) {
                    setSelectedOrder(null);
                }
                setConfirmDeleteSingle(null);
            }
        } catch (err) {
            console.error("Failed to delete order:", err);
        } finally {
            setBulkDeleting(false);
        }
    };

    const saveTracking = async (orderId: string, overrideTracking?: string, overrideProvider?: string, overrideProshipId?: string) => {
        setSavingTracking(true);
        try {
            const finalTracking = overrideTracking !== undefined ? overrideTracking : trackingInput;
            const body: any = {
                orderId,
                trackingNumber: finalTracking,
                shippingProvider: overrideProvider !== undefined ? overrideProvider : providerInput,
                proshipId: overrideProshipId !== undefined ? overrideProshipId : (proshipId || selectedOrder?.proshipId)
            };
            // Auto-set status to shipped if has tracking and not already shipped/completed
            if (finalTracking?.trim() && selectedOrder && selectedOrder.status !== "shipped" && selectedOrder.status !== "completed") {
                body.status = "shipped";
            }
            const res = await fetch(`/api/orders`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success) {
                setOrders((prev) =>
                    prev.map((o) => (o.id === orderId ? { ...o, ...data.order } : o))
                );
                if (selectedOrder?.id === orderId) {
                    setSelectedOrder({ ...selectedOrder, ...data.order });
                }
                setTrackingMsg("บันทึกเลข tracking สำเร็จ!");
                setTimeout(() => setTrackingMsg(null), 2000);
            }
        } catch (err) {
            console.error("Failed to save tracking:", err);
        } finally {
            setSavingTracking(false);
        }
    };

    const copyTracking = (text: string) => {
        navigator.clipboard.writeText(text);
        setTrackingMsg("คัดลอกแล้ว!");
        setTimeout(() => setTrackingMsg(null), 1500);
    };

    const checkToken = async () => {
        setTokenStatus("unknown");
        const res = await fetch("/api/admin/test-messenger", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "ping" }),
        });
        const data = await res.json();
        setTokenStatus(data.success ? "valid" : "invalid");
        setMessengerMsg({
            type: data.success ? "success" : "error",
            text: data.success ? `✅ Token ใช้งานได้ (เพจ: ${data.page?.name})` : `❌ Token ไม่ถูกต้อง: ${data.error}`,
        });
        setTimeout(() => setMessengerMsg(null), 5000);
    };

    const sendOrderMessage = async (order: Order) => {
        const psid = psidInput.trim() || order.facebookPsid || order.facebookId;
        if (!psid) {
            setMessengerMsg({ type: "error", text: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "❌ Please enter customer PSID." : "❌ กรุณากรอก PSID ลูกค้า") });
            setTimeout(() => setMessengerMsg(null), 3000);
            return;
        }
        setSendingMsg(true);
        try {
            const res = await fetch("/api/admin/test-messenger", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "resend_order",
                    psid,
                    orderNumber: order.id,
                    orderData: {
                        total: order.total,
                        customer: order.customer,
                        address: order.address,
                        phone: order.phone,
                        note: order.note,
                        items: order.items,
                    },
                }),
            });
            const data = await res.json();
            setMessengerMsg({
                type: data.success ? "success" : "error",
                text: data.success ? "✅ ส่งข้อความยืนยันออเดอร์สำเร็จ!" : `❌ ส่งไม่สำเร็จ: ${data.error}`,
            });
            setTimeout(() => setMessengerMsg(null), 5000);
        } catch (err) {
            setMessengerMsg({ type: "error", text: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "❌ An error occurred." : "❌ เกิดข้อผิดพลาด") });
        } finally {
            setSendingMsg(false);
        }
    };

    const getTrackingUrl = (provider: string, tracking: string) => {
        const p = provider.toLowerCase();
        if (p.includes("flash")) return `https://www.flashexpress.co.th/fle/tracking?se=${tracking}`;
        if (p.includes("kerry")) return `https://th.kerryexpress.com/th/track/?track=${tracking}`;
        if (p.includes("j&t") || p.includes("jt") || p.includes("j\u0026t")) return `https://jtexpress.co.th/service/track?waybillNo=${tracking}`;
        if (p.includes("thaipost") || p.includes("ไปรษณีย์")) return `https://track.thailandpost.co.th/?trackNumber=${tracking}`;
        if (p.includes("ems")) return `https://track.thailandpost.co.th/?trackNumber=${tracking}`;
        if (p.includes("shopee")) return `https://spx.co.th/track?id=${tracking}`;
        if (p.includes("ninja") || p.includes("ninjavan")) return `https://www.ninjavan.co/th-th/tracking?id=${tracking}`;
        if (p.includes("best")) return `https://www.best-inc.co.th/track?bills=${tracking}`;
        // Fallback: universal tracker that supports all Thai carriers
        return `https://jtexpress.co.th/service/track?waybillNo=${tracking}`;
    };

    const filtered = orders.filter((order) => {
        const matchesSearch =
            order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.phone.includes(searchQuery);
        const matchesStatus = filterStatus === "all" || order.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const statusCounts = {
        pending: orders.filter((o) => o.status === "pending").length,
        confirmed: orders.filter((o) => o.status === "confirmed").length,
        shipped: orders.filter((o) => o.status === "shipped").length,
        completed: orders.filter((o) => o.status === "completed").length,
        cancelled: orders.filter((o) => o.status === "cancelled").length,
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'), { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: 'Asia/Bangkok' });
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName;
            const isInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA';
            if (isInput) return;

            if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
                e.preventDefault();
                selectAll();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filtered.length, selectedIds.size]); // Re-bind if selection logic dependencies change

    return (
        <div className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-pink-500 flex items-center gap-2">
                    <ClipboardList className="w-6 h-6" />
                    <Trans th="สรุปออเดอร์" en="Order summary" />
                                    </h1>
                <div className="flex gap-2">
                    <button
                        onClick={selectAll}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                        <CheckSquare className="w-4 h-4" />
                        {selectedIds.size === filtered.length && filtered.length > 0 ? (typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? "Deselect All" : "ยกเลิกเลือกทั้งหมด") : (typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? "Select All" : "เลือกทั้งหมด")}
                    </button>
                    <button
                        onClick={exportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors text-sm font-medium"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                    <button
                        onClick={syncGoogleSheets}
                        disabled={syncingSheets}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors text-sm font-medium"
                    >
                        <Save className={`w-4 h-4 ${syncingSheets ? "animate-spin" : ""}`} />
                        Sync Google Sheets
                    </button>
                    <button
                        onClick={fetchOrders}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-600 rounded-xl hover:bg-pink-100 transition-colors text-sm font-medium"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        <Trans th="รีเฟรช" en="Refresh" />
                                            </button>
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 mb-4 flex items-center gap-3">
                    <CheckSquare className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-blue-700 font-medium"><Trans th="เลือก" en="choose" /> {selectedIds.size} {<Trans th="รายการ" en="list" />}</span>
                    <select
                        value={bulkStatus}
                        onChange={e => setBulkStatus(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-sm outline-none flex-1 max-w-xs"
                    >
                        <option value="">{<Trans th="เปลี่ยนสถานะเป็น..." en="Change status to..." />}</option>
                        <option value="pending">{<Trans th="รอดำเนินการ" en="Pending" />}</option>
                        <option value="confirmed">{<Trans th="ยืนยันแล้ว" en="Confirmed" />}</option>
                        <option value="shipped">{<Trans th="จัดส่งแล้ว" en="Already shipped" />}</option>
                        <option value="completed">{<Trans th="สำเร็จ" en="succeed" />}</option>
                        <option value="cancelled">{<Trans th="ยกเลิก" en="cancel" />}</option>
                    </select>
                    <button
                        onClick={bulkUpdateStatus}
                        disabled={!bulkStatus || bulkUpdating}
                        className="px-4 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-600 transition-colors"
                    >
                        {bulkUpdating ? 'กำลังอัปเดต...' : 'อัปเดต'}
                    </button>
                    <button
                        onClick={() => setConfirmDelete(true)}
                        disabled={bulkDeleting}
                        className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-red-600 transition-colors flex items-center gap-1"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        {bulkDeleting ? 'กำลังลบ...' : 'ลบ'}
                    </button>
                    <button onClick={() => setSelectedIds(new Set())} className="text-blue-400 hover:text-blue-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                {[
                    { value: "pending", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Pending" : "รอดำเนินการ"), count: statusCounts.pending, color: "from-yellow-400 to-orange-400" },
                    { value: "confirmed", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Confirmed" : "ยืนยันแล้ว"), count: statusCounts.confirmed, color: "from-blue-400 to-blue-500" },
                    { value: "shipped", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Already shipped" : "จัดส่งแล้ว"), count: statusCounts.shipped, color: "from-purple-400 to-purple-500" },
                    { value: "completed", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "succeed" : "สำเร็จ"), count: statusCounts.completed, color: "from-green-400 to-green-500" },
                    { value: "cancelled", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Cancelled" : "ยกเลิก"), count: statusCounts.cancelled, color: "from-red-400 to-red-500" },
                ].map((stat) => (
                    <div
                        key={stat.value}
                        className={`bg-gradient-to-br ${stat.color} rounded-2xl p-4 text-white cursor-pointer hover:scale-105 transition-transform`}
                        onClick={() => setFilterStatus(stat.value)}
                    >
                        <p className="text-2xl font-bold">{stat.count}</p>
                        <p className="text-xs opacity-80">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Search & Filter */}
            <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-pink-100 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Search for orders (name, order number, phone number)..." : "ค้นหาออเดอร์ (ชื่อ, เลขออเดอร์, เบอร์โทร)...")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300"
                >
                    <option value="all">{typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? "All (" : "ทั้งหมด ("}{orders.length})</option>
                    <option value="pending">{<Trans th="รอดำเนินการ (" en="Pending action (" />}{statusCounts.pending})</option>
                    <option value="confirmed">{<Trans th="ยืนยันแล้ว (" en="confirmed (" />}{statusCounts.confirmed})</option>
                    <option value="shipped">{<Trans th="จัดส่งแล้ว (" en="Already shipped (" />}{statusCounts.shipped})</option>
                    <option value="completed">{<Trans th="สำเร็จ (" en="succeed (" />}{statusCounts.completed})</option>
                    <option value="cancelled">{<Trans th="ยกเลิก (" en="cancelled (" />}{statusCounts.cancelled})</option>
                </select>
            </div>

            {/* Order List */}
            {loading ? (
                <div className="text-center py-12">
                    <RefreshCw className="w-8 h-8 text-pink-400 animate-spin mx-auto mb-3" />
                    <p className="text-gray-500">{<Trans th="กำลังโหลด..." en="Loading..." />}</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                    <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">{<Trans th="ยังไม่มีออเดอร์" en="There is no order yet." />}</p>
                    <p className="text-gray-400 text-sm mt-1">{<Trans th="เมื่อมีลูกค้าสั่งซื้อ ออเดอร์จะแสดงที่นี่" en="When a customer orders Orders will be displayed here." />}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Select All */}
                    <div className="flex items-center gap-2 px-1">
                        <button onClick={selectAll} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selectedIds.size === filtered.length && filtered.length > 0 ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                {selectedIds.size === filtered.length && filtered.length > 0 && <span className="text-white text-[10px]">✓</span>}
                            </div>
                            {<Trans th="เลือกทั้งหมด (" en="Select all (" />}{filtered.length})
                        </button>
                    </div>
                    {filtered.map((order) => {
                        const status = statusConfig[order.status] || statusConfig.pending;
                        return (
                            <div
                                key={order.id}
                                className={`bg-white rounded-2xl p-5 shadow-sm border hover:shadow-md transition-all cursor-pointer ${selectedIds.has(order.id) ? 'border-blue-400 bg-blue-50/30' : 'border-pink-100'}`}
                                onClick={() => { setSelectedOrder(order); setTrackingInput(order.trackingNumber || ""); setProviderInput(order.shippingProvider || ""); }}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleSelect(order.id); }}
                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${selectedIds.has(order.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300 hover:border-blue-400'}`}
                                        >
                                            {selectedIds.has(order.id) && <span className="text-white text-xs">✓</span>}
                                        </button>
                                        <span className="text-sm font-bold text-gray-800">{order.id}</span>
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                                            {status.label}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-400">{formatDate(order.date)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {order.facebookAvatar ? (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <img
                                                    src={order.facebookAvatar}
                                                    alt=""
                                                    className="w-10 h-10 rounded-full object-cover border-2 border-blue-400 hover:border-blue-500 transition-colors"
                                                    referrerPolicy="no-referrer"
                                                />
                                            </div>
                                        ) : order.facebookId ? (
                                            <a href={`https://facebook.com/${order.facebookId}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                                <img
                                                    src={`https://graph.facebook.com/${order.facebookId}/picture?type=normal`}
                                                    alt=""
                                                    className="w-10 h-10 rounded-full object-cover border-2 border-blue-400 hover:border-blue-500 transition-colors"
                                                />
                                            </a>
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                <User className="w-5 h-5 text-gray-400" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm text-gray-700 font-medium">{order.customer}</p>
                                            <p className="text-xs text-gray-400">
                                                {order.phone} • {order.items?.length || order.itemCount} <Trans th="ชิ้น" en="item" />
                                                                                                {order.shipping && ` • ${order.shipping}`}
                                            </p>
                                            {order.trackingNumber && (
                                                <p className="text-xs text-blue-500 font-mono">📦 {order.trackingNumber}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-gray-800">
                                            ฿{order.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                        </span>
                                        <button className="p-2 rounded-lg hover:bg-pink-50 text-pink-400 transition-colors">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedOrder(null)}>
                    <div
                        className="bg-white rounded-3xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white rounded-t-3xl px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10">
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">{selectedOrder.id}</h2>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig[selectedOrder.status]?.color}`}>
                                    {statusConfig[selectedOrder.status]?.label}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                                    {isProshipAvailable(selectedOrder) && (
                                    <button
                                        onClick={printProshipSticker}
                                        disabled={printingLabel}
                                        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                                        title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Print Proship Stickers" : "พิมพ์สติ๊กเกอร์ Proship")}
                                    >
                                        <Printer className={`w-4 h-4 ${printingLabel ? 'animate-spin' : ''}`} />
                                        <span className="text-[10px] font-bold">
                                            {printingLabel ? 'กำลังโหลด...' : 'สติ๊กเกอร์ (Proship)'}
                                        </span>
                                    </button>
                                    )}
                                    <button
                                        onClick={printSimpleLabel}
                                        className="px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center gap-2 shadow-sm"
                                        title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Print a normal cover page" : "พิมพ์ใบปะหน้าธรรมดา")}
                                    >
                                        <Printer className="w-4 h-4" />
                                        <span className="text-[10px] font-bold">{<Trans th="ใบปะหน้า" en="cover sheet" />}</span>
                                    </button>
                                    <button
                                        onClick={() => window.print()}
                                        className="px-3 py-1.5 rounded-lg bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 transition-colors flex items-center gap-2"
                                        title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Print A4 sheet" : "พิมพ์ใบรายการ A4")}
                                    >
                                        <Printer className="w-4 h-4 text-pink-500" />
                                        <span className="text-[10px] font-bold">{<Trans th="ใบปลิว (A4)" en="Flyer (A4)" />}</span>
                                    </button>
                                </div>
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-4 space-y-5">
                            {/* ─── Sender Info Edit Modal ─── */}
                            {showSenderEdit && (
                                <div className="bg-amber-50 rounded-xl p-4 space-y-3 border border-amber-200">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-amber-700 flex items-center gap-2">
                                            <Trans th="📮 ข้อมูลผู้ส่ง (แก้ไขได้)" en="📮 Sender information (editable)" />
                                                                                    </h3>
                                        <button onClick={() => setShowSenderEdit(false)} className="text-gray-400 hover:text-gray-600">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        <div>
                                            <label className="text-[10px] text-gray-500 mb-0.5 block">{<Trans th="ชื่อผู้ส่ง *" en="Sender name *" />}</label>
                                            <input
                                                type="text"
                                                value={senderInfo.name}
                                                onChange={(e) => setSenderInfo({ ...senderInfo, name: e.target.value })}
                                                placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "such as Kittichai Bunsuk" : "เช่น กิตติชัย บุญสุข")}
                                                className="w-full px-3 py-2 bg-white rounded-lg text-sm border border-amber-200 outline-none focus:ring-2 focus:ring-amber-300"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 mb-0.5 block">{<Trans th="เบอร์โทรผู้ส่ง *" en="Sender phone number *" />}</label>
                                            <input
                                                type="text"
                                                value={senderInfo.phone}
                                                onChange={(e) => setSenderInfo({ ...senderInfo, phone: e.target.value })}
                                                placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "For example: 0944370266" : "เช่น 0944370266")}
                                                className="w-full px-3 py-2 bg-white rounded-lg text-sm border border-amber-200 outline-none focus:ring-2 focus:ring-amber-300"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 mb-0.5 block">{<Trans th="ที่อยู่ผู้ส่ง (ไม่บังคับ)" en="Return address (optional)" />}</label>
                                            <textarea
                                                value={senderInfo.address}
                                                onChange={(e) => setSenderInfo({ ...senderInfo, address: e.target.value })}
                                                placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "For example, 123/45 Soi Sukhumvit 55, Khlong Tan Subdistrict ..." : "เช่น 123/45 ซ.สุขุมวิท 55 แขวงคลองตัน ...")}
                                                rows={2}
                                                className="w-full px-3 py-2 bg-white rounded-lg text-sm border border-amber-200 outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { saveSenderInfo(senderInfo); setShowSenderEdit(false); }}
                                            className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors"
                                        >
                                            <Trans th="💾 บันทึก" en="💾 Save" />
                                                                                    </button>
                                        <button
                                            onClick={() => { saveSenderInfo(senderInfo); setShowSenderEdit(false); printSimpleLabel(); }}
                                            disabled={!senderInfo.name || !senderInfo.phone}
                                            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 transition-colors disabled:opacity-50"
                                        >
                                            <Trans th="🖨️ บันทึก & พิมพ์" en="🖨️ Save & Print" />
                                                                                    </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400 text-center">{<Trans th="ข้อมูลผู้ส่งจะจำไว้ ไม่ต้องกรอกซ้ำทุกครั้ง" en="Sender information will be remembered. No need to fill in again every time." />}</p>
                                </div>
                            )}

                            {/* Customer Info */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <User className="w-4 h-4 text-pink-500" />
                                    <Trans th="ข้อมูลลูกค้า" en="Customer information" />
                                                                        <button
                                        onClick={() => setShowSenderEdit(!showSenderEdit)}
                                        className="ml-auto text-[10px] px-2 py-1 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 transition-colors font-medium"
                                    >
                                        <Trans th="📮 แก้ไขผู้ส่ง" en="📮 Edit sender" />
                                                                            </button>
                                </h3>
                                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                                    <div className="flex items-center gap-3">
                                        {selectedOrder.facebookAvatar ? (
                                            <img
                                                src={selectedOrder.facebookAvatar}
                                                alt=""
                                                className="w-12 h-12 rounded-full object-cover border-2 border-blue-400"
                                                referrerPolicy="no-referrer"
                                            />
                                        ) : selectedOrder.facebookId ? (
                                            <a href={`https://facebook.com/${selectedOrder.facebookId}`} target="_blank" rel="noopener noreferrer">
                                                <img
                                                    src={`https://graph.facebook.com/${selectedOrder.facebookId}/picture?type=normal`}
                                                    alt=""
                                                    className="w-12 h-12 rounded-full object-cover border-2 border-blue-400"
                                                />
                                            </a>
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                                                <User className="w-6 h-6 text-gray-400" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm text-gray-800 font-medium">{selectedOrder.customer}</p>
                                            {selectedOrder.facebookName && selectedOrder.facebookName !== selectedOrder.customer && (
                                                <p className="text-xs text-blue-500">FB: {selectedOrder.facebookName}</p>
                                            )}
                                        </div>
                                    </div>
                                    {/* Phone */}
                                    {selectedOrder.phone && selectedOrder.phone !== '-' ? (
                                        <p className="text-sm text-gray-600 flex items-center gap-1">
                                            <Phone className="w-3.5 h-3.5" /> {selectedOrder.phone}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-gray-400 flex items-center gap-1 italic">
                                            <Phone className="w-3.5 h-3.5" /> <Trans th="ยังไม่ระบุเบอร์โทร" en="Phone number not specified yet" />
                                                                                        </p>
                                    )}
                                    {/* Address */}
                                    {selectedOrder.address ? (
                                        <p className="text-sm text-gray-600 flex items-start gap-1">
                                            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {selectedOrder.address}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-gray-400 flex items-center gap-1 italic">
                                            <MapPin className="w-3.5 h-3.5" /> <Trans th="ยังไม่ระบุที่อยู่" en="Address not yet specified" />
                                                                                        </p>
                                    )}
                                    {selectedOrder.facebookId && (
                                        <a
                                            href={`https://facebook.com/${selectedOrder.facebookId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                            <Trans th="ดูโปรไฟล์ Facebook" en="View Facebook profile" />
                                                                                    </a>
                                    )}
                                </div>
                            </div>

                            {/* Items */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-pink-500" />
                                    {<Trans th="สินค้า (" en="product (" />}{selectedOrder.items?.length || 0} <Trans th="รายการ)" en="list)" />
                                                                    </h3>
                                <div className="space-y-2">
                                    {selectedOrder.items?.map((item, idx) => (
                                        <div key={idx} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                                            {item.image && (
                                                <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                                            )}
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
                                    {allShippingMethods.length > 0 ? (
                                        <select
                                            value={selectedOrder.shipping || ""}
                                            onChange={async (e) => {
                                                const newShipping = e.target.value;
                                                setSelectedOrder({ ...selectedOrder, shipping: newShipping });
                                                setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, shipping: newShipping } : o));
                                                await fetch('/api/orders', {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ orderId: selectedOrder.id, shipping: newShipping }),
                                                });
                                            }}
                                            className="w-full px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-pink-300 font-medium text-gray-800"
                                        >
                                            {!allShippingMethods.find(m => m.name === selectedOrder.shipping || m.id === selectedOrder.shipping) && (
                                                <option value={selectedOrder.shipping || ""}>{selectedOrder.shipping || "-"}</option>
                                            )}
                                            {allShippingMethods.map(m => (
                                                <option key={m.id} value={m.name}>{m.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="text-sm font-medium text-gray-800">{selectedOrder.shipping || "-"}</p>
                                    )}
                                    <div className="mt-2 flex items-center gap-1">
                                        <span className="text-xs text-gray-500">฿</span>
                                        <input
                                            id="shipping-cost-input"
                                            type="number"
                                            min="0"
                                            value={selectedOrder.shippingCost ?? 0}
                                            onChange={async (e) => {
                                                const newCost = Number(e.target.value);
                                                setSelectedOrder({ ...selectedOrder, shippingCost: newCost });
                                                setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, shippingCost: newCost } : o));
                                                // Auto-save to DB
                                                await fetch('/api/orders', {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ orderId: selectedOrder.id, shippingCost: newCost }),
                                                });
                                            }}
                                            placeholder="0"
                                            className="w-full px-2 py-1 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-pink-300"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">แก้ไขค่าส่งจริง (บันทึกอัตโนมัติ)</p>
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

                            {/* Note */}
                            {selectedOrder.note && (
                                <div className="bg-yellow-50 rounded-xl p-3">
                                    <p className="text-xs text-yellow-600 flex items-center gap-1 mb-1">
                                        <StickyNote className="w-3 h-3" /> <Trans th="หมายเหตุ" en="note" />
                                                                            </p>
                                    <p className="text-sm text-gray-700">{selectedOrder.note}</p>
                                </div>
                            )}

                            {/* Total */}
                            <div className="bg-pink-50 rounded-xl p-4 flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-700">{<Trans th="ยอดรวมทั้งหมด" en="Grand total" />}</span>
                                <span className="text-xl font-bold text-pink-600">
                                    ฿{selectedOrder.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </span>
                            </div>

                            {/* Tracking Number */}
                            <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                                <h3 className="text-sm font-bold text-blue-700 flex items-center gap-2">
                                    <Trans th="📦 เลข Tracking" en="📦 Tracking number" />
                                                                    </h3>

                                {/* Success message */}
                                {trackingMsg && (
                                    <div className="bg-green-100 text-green-700 text-xs px-3 py-2 rounded-lg">
                                        ✅ {trackingMsg}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-gray-500 mb-0.5 block">{<Trans th="ขนส่ง" en="transport" />}</label>
                                        <select
                                            value={providerInput}
                                            onChange={(e) => setProviderInput(e.target.value)}
                                            className="w-full px-3 py-2 bg-white rounded-lg text-sm border border-blue-200 outline-none focus:ring-2 focus:ring-blue-300"
                                        >
                                            <option value="">{<Trans th="เลือกขนส่ง" en="Choose transportation" />}</option>
                                            <option value="Flash Express">Flash Express</option>
                                            <option value="Kerry Express">Kerry Express</option>
                                            <option value="J&T Express">J&T Express</option>
                                            <option value={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Thailand Post" : "ไปรษณีย์ไทย")}>{<Trans th="ไปรษณีย์ไทย" en="Thailand Post" />}</option>
                                            <option value="EMS">EMS</option>
                                            <option value="Shopee Express">Shopee Express</option>
                                            <option value="NinjaVan">NinjaVan</option>
                                            <option value="Best Express">Best Express</option>
                                            <option value={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "other" : "อื่นๆ")}>{<Trans th="อื่นๆ" en="other" />}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 mb-0.5 block">{<Trans th="เลข Tracking" en="Tracking number" />}</label>
                                        <input
                                            type="text"
                                            value={trackingInput}
                                            onChange={(e) => setTrackingInput(e.target.value)}
                                            placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Enter tracking number" : "กรอกเลข tracking")}
                                            className="w-full px-3 py-2 bg-white rounded-lg text-sm border border-blue-200 outline-none focus:ring-2 focus:ring-blue-300 font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => saveTracking(selectedOrder.id)}
                                        disabled={savingTracking}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        {savingTracking ? "กำลังบันทึก..." : "บันทึกด้วยตัวเอง"}
                                    </button>
                                    {isProshipAvailable(selectedOrder) && (
                                    <button
                                        onClick={() => sendToProship(selectedOrder.id)}
                                        disabled={sendingProship}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        <Truck className="w-3.5 h-3.5" />
                                        {sendingProship ? "กำลังส่งข้อมูล..." : "ดึงเลขจาก Proship ตัวเต็ม"}
                                    </button>
                                    )}
                                </div>
                                <div className="flex gap-2 mt-2 justify-center">
                                    {selectedOrder.trackingNumber && (
                                        <>
                                            <button
                                                onClick={() => copyTracking(selectedOrder.trackingNumber!)}
                                                className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200 transition-colors"
                                            >
                                                <Copy className="w-3.5 h-3.5" /> <Trans th="คัดลอก" en="Copy" />
                                                                                            </button>
                                            {getTrackingUrl(selectedOrder.shippingProvider || "", selectedOrder.trackingNumber) && (
                                                <a
                                                    href={getTrackingUrl(selectedOrder.shippingProvider || "", selectedOrder.trackingNumber)!}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 px-3 py-2 bg-purple-100 text-purple-600 rounded-lg text-xs hover:bg-purple-200 transition-colors"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" /> <Trans th="ติดตาม" en="follow" />
                                                                                                    </a>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Currently saved tracking */}
                                {selectedOrder.trackingNumber && (
                                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                                        <p className="text-[10px] text-gray-400 mb-1">{<Trans th="เลขที่บันทึกไว้" en="recorded number" />}</p>
                                        <p className="text-sm font-mono font-bold text-blue-700">
                                            {selectedOrder.shippingProvider && <span className="text-xs text-gray-500 font-sans">{selectedOrder.shippingProvider}: </span>}
                                            {selectedOrder.trackingNumber}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Update Status */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-gray-700">{<Trans th="อัพเดทสถานะ" en="Status update" />}</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {(["pending", "confirmed", "shipped", "completed", "cancelled"] as const).map((s) => (
                                        <button
                                            key={s}
                                            disabled={selectedOrder.status === s || updatingStatus === selectedOrder.id}
                                            onClick={() => updateOrderStatus(selectedOrder.id, s)}
                                            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${selectedOrder.status === s
                                                ? `${statusConfig[s].color} ring-2 ring-offset-1 ring-current`
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                } disabled:opacity-50`}
                                        >
                                            {statusConfig[s].label}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setConfirmDeleteSingle(selectedOrder.id)}
                                    className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <Trans th="ลบออเดอร์ทิ้ง (ลบถาวร รวมถึงใน Proship)" en="Delete an order (permanently delete it, including in Proship)" />
                                                                    </button>
                            </div>

                            {/* Date */}
                            <p className="text-xs text-gray-400 text-center">
                                <Trans th="สั่งเมื่อ" en="Order when" /> {formatDate(selectedOrder.date)}
                            </p>

                            {/* ─── Messenger Section ─── */}
                            <div className="bg-indigo-50 rounded-xl p-4 space-y-3 border border-indigo-100">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                                        <MessageCircle className="w-4 h-4" /> <Trans th="ส่ง Messenger" en="Send Messenger" />
                                                                            </h3>
                                    <button
                                        onClick={checkToken}
                                        className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${
                                            tokenStatus === "valid" ? "bg-green-100 text-green-700" :
                                            tokenStatus === "invalid" ? "bg-red-100 text-red-600" :
                                            "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                        }`}
                                    >
                                        <Wifi className="w-3 h-3" />
                                        {tokenStatus === "valid" ? "Token OK" : tokenStatus === "invalid" ? "Token ผิด" : "ตรวจ Token"}
                                    </button>
                                </div>

                                {/* Messenger status message */}
                                {messengerMsg && (
                                    <div className={`text-xs px-3 py-2 rounded-lg font-medium ${
                                        messengerMsg.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                                    }`}>
                                        {messengerMsg.text}
                                    </div>
                                )}

                                {/* PSID input */}
                                <div>
                                    <label className="text-[10px] text-gray-500 mb-0.5 block">
                                        <Trans th="Facebook PSID ลูกค้า" en="Facebook PSID Customer" />
                                                                                {selectedOrder.facebookPsid && <span className="ml-1 text-green-600">{<Trans th="✓ มีใน system" en="✓ Available in the system" />}</span>}
                                        {!selectedOrder.facebookPsid && selectedOrder.facebookId && <span className="ml-1 text-yellow-600">{<Trans th="(ใช้ facebookId แทน)" en="(use facebookId instead)" />}</span>}
                                    </label>
                                    <input
                                        type="text"
                                        value={psidInput || selectedOrder.facebookPsid || selectedOrder.facebookId || ""}
                                        onChange={(e) => setPsidInput(e.target.value)}
                                        placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Enter your PSID or view it in Unified Chat." : "กรอก PSID หรือดูจาก Unified Chat")}
                                        className="w-full px-3 py-2 bg-white rounded-lg text-xs border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-300 font-mono"
                                    />
                                </div>

                                <button
                                    onClick={() => sendOrderMessage(selectedOrder)}
                                    disabled={sendingMsg}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50"
                                >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    {sendingMsg ? "กำลังส่ง..." : "ส่งข้อความยืนยันออเดอร์ซ้ำ"}
                                </button>

                                <p className="text-[10px] text-gray-400 text-center">
                                    <Trans th="ใช้กรณีที่ลูกค้าไม่ได้รับข้อความยืนยัน" en="Used if the customer does not receive a confirmation message." />
                                                                    </p>
                            </div>
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

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setConfirmDelete(false)}>
                    <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-4">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Trash2 className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">ยืนยันการลบ</h3>
                            <p className="text-sm text-gray-500 mt-2">
                                ต้องการลบ {selectedIds.size} ออเดอร์ที่เลือก?
                            </p>
                            <p className="text-xs text-red-400 mt-1">⚠️ การลบไม่สามารถกู้คืนได้</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDelete(false)}
                                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={bulkDelete}
                                disabled={bulkDeleting}
                                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {bulkDeleting ? (
                                    <><RefreshCw className="w-4 h-4 animate-spin" /> กำลังลบ...</>
                                ) : (
                                    <><Trash2 className="w-4 h-4" /> ลบเลย</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Single Delete Confirmation Modal */}
            {confirmDeleteSingle && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setConfirmDeleteSingle(null)}>
                    <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-4">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Trash2 className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">ยืนยันการลบ</h3>
                            <p className="text-sm text-gray-500 mt-2">
                                ต้องการลบออเดอร์ <span className="font-bold text-gray-700">{confirmDeleteSingle}</span> ถาวร?
                            </p>
                            <p className="text-xs text-red-400 mt-1">⚠️ รวมถึงลบใน Proship (ถ้ามี)</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDeleteSingle(null)}
                                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={() => deleteOrder(confirmDeleteSingle)}
                                disabled={bulkDeleting}
                                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {bulkDeleting ? (
                                    <><RefreshCw className="w-4 h-4 animate-spin" /> กำลังลบ...</>
                                ) : (
                                    <><Trash2 className="w-4 h-4" /> ลบเลย</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


