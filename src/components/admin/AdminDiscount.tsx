"use client";

import { useState, useEffect } from "react";
import { useDiscountStore, DiscountCode, QuantityTier } from "@/store/useDiscountStore";
import { Plus, Trash2, Edit2, X, Save, Tag, ToggleLeft, ToggleRight, Percent, DollarSign, Truck, Copy, ShoppingBag } from "lucide-react";
import { Trans } from "@/components/Trans";

const emptyDiscount: Omit<DiscountCode, "id" | "createdAt" | "usedCount"> = {
    name: "",
    code: "",
    type: "percent",
    value: 10,
    quantityTiers: [{ minQty: 2, discountPercent: 10 }, { minQty: 3, discountPercent: 15 }],
    minOrder: 0,
    minQty: 0,
    maxUses: 0,
    startDate: "",
    endDate: "",
    enabled: true,
};

export default function AdminDiscount() {
    const { discounts, addDiscount, updateDiscount, deleteDiscount, toggleDiscount } = useDiscountStore();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...emptyDiscount });
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);

    // ─── Load discounts from DB on mount ────────────────────────
    useEffect(() => {
        fetch('/api/discounts')
            .then(r => r.json())
            .then(json => {
                if (json.success && Array.isArray(json.data)) {
                    useDiscountStore.setState({ discounts: json.data as DiscountCode[] });
                }
            })
            .catch(() => {});
    }, []);

    const showSuccess = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(null), 2000);
    };

    const openAdd = () => {
        setEditingId(null);
        setForm({ ...emptyDiscount, code: `SHOP${Math.floor(Math.random() * 100)}` });
        setModalOpen(true);
    };

    const openEdit = (d: DiscountCode) => {
        setEditingId(d.id);
        setForm({
            name: d.name,
            code: d.code,
            type: d.type,
            value: d.value,
            quantityTiers: d.quantityTiers || [{ minQty: 2, discountPercent: 10 }],
            minOrder: d.minOrder,
            minQty: d.minQty || 0,
            maxUses: d.maxUses,
            startDate: d.startDate,
            endDate: d.endDate,
            enabled: d.enabled,
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.code.trim()) return;

        if (editingId) {
            const autoName = form.name || (form.type === "percent" ? `ส่วนลด${form.value}%` : form.type === "free_shipping" ? "ฟรีค่าส่ง" : form.type === "quantity" ? "ส่วนลดตามจำนวน" : `ลด฿${form.value}`);
            updateDiscount(editingId, { ...form, name: autoName });
            // Sync to DB
            fetch('/api/discounts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...form, name: autoName }) }).catch(() => {});
            showSuccess("แก้ไขโค้ดส่วนลดสำเร็จ!");
        } else {
            const autoName = form.name || (form.type === "percent" ? `ส่วนลด${form.value}%` : form.type === "free_shipping" ? "ฟรีค่าส่ง" : form.type === "quantity" ? "ส่วนลดตามจำนวน" : `ลด฿${form.value}`);
            // Save to DB first, use returned ID
            try {
                const res = await fetch('/api/discounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, name: autoName }) });
                const json = await res.json();
                if (json.success && json.data) {
                    addDiscount(json.data);
                } else {
                    // Fallback: add locally
                    addDiscount({ id: `disc-${Date.now()}`, name: autoName, code: form.code.toUpperCase(), type: form.type, value: form.value, minOrder: form.minOrder, minQty: form.minQty, maxUses: form.maxUses, startDate: form.startDate, endDate: form.endDate, enabled: form.enabled, usedCount: 0, createdAt: Date.now() });
                }
            } catch {
                addDiscount({ id: `disc-${Date.now()}`, name: autoName, code: form.code.toUpperCase(), type: form.type, value: form.value, minOrder: form.minOrder, minQty: form.minQty, maxUses: form.maxUses, startDate: form.startDate, endDate: form.endDate, enabled: form.enabled, usedCount: 0, createdAt: Date.now() });
            }
            showSuccess("เพิ่มโค้ดส่วนลดสำเร็จ!");
        }

        setModalOpen(false);
        setEditingId(null);
    };

    const handleDelete = (id: string) => {
        deleteDiscount(id);
        // Sync to DB
        fetch(`/api/discounts?id=${id}`, { method: 'DELETE' }).catch(() => {});
        setDeleteConfirm(null);
        showSuccess("ลบโค้ดส่วนลดสำเร็จ!");
    };


    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        showSuccess(`คัดลอกโค้ด "${code}" แล้ว!`);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "percent": return <Percent className="w-4 h-4" />;
            case "fixed": return <DollarSign className="w-4 h-4" />;
            case "free_shipping": return <Truck className="w-4 h-4" />;
            case "quantity": return <ShoppingBag className="w-4 h-4" />;
            default: return <Tag className="w-4 h-4" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case "percent": return "เปอร์เซ็นต์";
            case "fixed": return "ลดราคาคงที่";
            case "free_shipping": return "ฟรีค่าส่ง";
            case "quantity": return "ลดตามจำนวนชิ้น";
            default: return type;
        }
    };

    const isExpired = (d: DiscountCode) => {
        return d.endDate && new Date(d.endDate) < new Date();
    };

    const isNotStarted = (d: DiscountCode) => {
        return d.startDate && new Date(d.startDate) > new Date();
    };

    return (
        <div>
            {/* Success Toast */}
            {successMsg && (
                <div className="fixed top-20 right-6 z-[100] bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-[slideIn_0.3s_ease]">
                    ✅ {successMsg}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-pink-500 flex items-center gap-2">
                    <Trans th="🏷️ โค้ดส่วนลด" en="🏷️ Discount code" />
                                    </h2>
                <button
                    onClick={openAdd}
                    className="bg-gradient-to-r from-pink-400 to-pink-500 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-md shadow-pink-200 hover:shadow-lg transition-all"
                >
                    <Plus className="w-4 h-4" />
                    <Trans th="เพิ่มโค้ดส่วนลด" en="Add a discount code" />
                                    </button>
            </div>

            {/* Discount Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Add New Card */}
                <button
                    onClick={openAdd}
                    className="border-2 border-dashed border-pink-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-pink-400 hover:bg-pink-50/50 transition-all group"
                >
                    <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                        <Plus className="w-6 h-6 text-pink-500" />
                    </div>
                    <span className="text-sm text-pink-500 font-medium">{<Trans th="เพิ่มโค้ดส่วนลด" en="Add a discount code" />}</span>
                </button>

                {/* Existing Discount Cards */}
                {discounts.map((d) => (
                    <div
                        key={d.id}
                        className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${!d.enabled ? "opacity-60" : ""
                            } ${isExpired(d) ? "border-red-200" : isNotStarted(d) ? "border-yellow-200" : "border-pink-100"}`}
                    >
                        {/* Card Header */}
                        <div className="p-4 pb-3">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`p-1.5 rounded-lg ${d.type === "percent" ? "bg-blue-100 text-blue-600" :
                                        d.type === "free_shipping" ? "bg-green-100 text-green-600" :
                                            "bg-purple-100 text-purple-600"
                                        }`}>
                                        {getTypeIcon(d.type)}
                                    </span>
                                    <div>
                                        <p className="text-xs text-gray-400">{d.name || getTypeLabel(d.type)}</p>
                                        <p className="text-lg font-bold text-gray-800 tracking-wider">
                                            {d.code}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleDiscount(d.id)}
                                    className="flex-shrink-0"
                                >
                                    {d.enabled ? (
                                        <ToggleRight className="w-8 h-8 text-green-500" />
                                    ) : (
                                        <ToggleLeft className="w-8 h-8 text-gray-300" />
                                    )}
                                </button>
                            </div>

                            {/* Discount Value */}
                            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-3 mb-3">
                                <p className="text-2xl font-bold text-pink-600">
                                    {d.type === "percent" ? `${d.value}%` :
                                        d.type === "free_shipping" ? "ฟรีค่าส่ง" :
                                            d.type === "quantity" ? "ลดตามจำนวน" :
                                                `฿${d.value.toLocaleString()}`}
                                </p>
                                {d.type === "quantity" && d.quantityTiers && (
                                    <div className="mt-1 space-y-0.5">
                                        {[...d.quantityTiers].sort((a, b) => a.minQty - b.minQty).map((t, i) => (
                                            <p key={i} className="text-xs text-purple-600">
                                                <Trans th="ซื้อ" en="buy" /> {t.minQty} <Trans th="ชิ้นขึ้นไป → ลด" en="Pieces up → Reduce" /> {t.discountPercent}%
                                            </p>
                                        ))}
                                    </div>
                                )}
                                <p className="text-xs text-gray-500">
                                    {getTypeLabel(d.type)}
                                    {d.minOrder > 0 && ` • ขั้นต่ำ ฿${d.minOrder.toLocaleString()}`}
                                </p>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-gray-50 rounded-lg p-2">
                                    <p className="text-gray-400">{<Trans th="ใช้แล้ว" en="Used" />}</p>
                                    <p className="font-bold text-gray-700">
                                        {d.usedCount} / {d.maxUses || "∞"}
                                    </p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2">
                                    <p className="text-gray-400">{<Trans th="สถานะ" en="status" />}</p>
                                    <p className={`font-bold ${isExpired(d) ? "text-red-500" :
                                        isNotStarted(d) ? "text-yellow-500" :
                                            d.enabled ? "text-green-500" : "text-gray-400"
                                        }`}>
                                        {isExpired(d) ? "หมดอายุ" :
                                            isNotStarted(d) ? "ยังไม่เริ่ม" :
                                                d.enabled ? "ใช้งานอยู่" : "ปิดอยู่"}
                                    </p>
                                </div>
                            </div>

                            {/* Dates */}
                            {(d.startDate || d.endDate) && (
                                <div className="mt-2 text-[10px] text-gray-400">
                                    {d.startDate && <span><Trans th="เริ่ม:" en="start:" /> {new Date(d.startDate).toLocaleDateString("th", { timeZone: "Asia/Bangkok" })} </span>}
                                    {d.endDate && <span><Trans th="• ถึง:" en="• to:" /> {new Date(d.endDate).toLocaleDateString("th", { timeZone: "Asia/Bangkok" })}</span>}
                                </div>
                            )}
                        </div>

                        {/* Card Actions */}
                        <div className="flex border-t border-gray-100">
                            <button
                                onClick={() => copyCode(d.code)}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                <Copy className="w-3.5 h-3.5" /> <Trans th="คัดลอก" en="Copy" />
                                                            </button>
                            <button
                                onClick={() => openEdit(d)}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs text-pink-500 hover:bg-pink-50 transition-colors border-x border-gray-100"
                            >
                                <Edit2 className="w-3.5 h-3.5" /> <Trans th="แก้ไข" en="correct" />
                                                            </button>
                            <button
                                onClick={() => setDeleteConfirm(d.id)}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> <Trans th="ลบ" en="delete" />
                                                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {discounts.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <p className="text-4xl mb-2">🏷️</p>
                    <p className="text-sm">{<Trans th="ยังไม่มีโค้ดส่วนลด" en="There is no discount code yet." />}</p>
                    <p className="text-xs mt-1">{<Trans th="กดปุ่ม &quot;เพิ่มโค้ดส่วนลด&quot; เพื่อเริ่มต้น" en="Press the 'Add Promo Code' button to get started." />}</p>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="text-center">
                            <div className="text-5xl mb-3">🗑️</div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">{<Trans th="ยืนยันการลบ" en="Confirm deletion" />}</h3>
                            <p className="text-sm text-gray-500 mb-1">
                                <Trans th="คุณต้องการลบโค้ด" en="Do you want to delete the code?" /> <strong>{discounts.find((d) => d.id === deleteConfirm)?.code}</strong> <Trans th="หรือไม่?" en="Or not?" />
                                                            </p>
                            <p className="text-xs text-red-400 mb-6">{<Trans th="การลบจะไม่สามารถย้อนกลับได้" en="Deletion cannot be reversed." />}</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 transition-colors">{<Trans th="ยกเลิก" en="cancel" />}</button>
                                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm hover:bg-red-600 transition-colors">{<Trans th="ลบโค้ด" en="Delete code" />}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-pink-100">
                            <h2 className="text-lg font-bold text-pink-500">
                                {editingId ? "✏️ แก้ไขโค้ดส่วนลด" : "➕ เพิ่มโค้ดส่วนลดใหม่"}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Name */}
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">{<Trans th="ชื่อส่วนลด" en="Discount name" />}</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "such as 10% discount" : "เช่น ส่วนลด10%")}
                                    className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300"
                                />
                            </div>

                            {/* Code */}
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">{<Trans th="โค้ด *" en="Code *" />}</label>
                                <input
                                    type="text"
                                    value={form.code}
                                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                    placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "such as SHOP10" : "เช่น SHOP10")}
                                    className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300 font-mono font-bold tracking-wider"
                                />
                            </div>

                            {/* Type */}
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">{<Trans th="ประเภทส่วนลด" en="Discount type" />}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { t: "percent" as const, label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "percent" : "เปอร์เซ็นต์"), icon: <Percent className="w-4 h-4" /> },
                                        { t: "fixed" as const, label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Fixed price reduction" : "ลดราคาคงที่"), icon: <DollarSign className="w-4 h-4" /> },
                                        { t: "free_shipping" as const, label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Free shipping" : "ฟรีค่าส่ง"), icon: <Truck className="w-4 h-4" /> },
                                        { t: "quantity" as const, label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Discount according to the number of pieces" : "ลดตามจำนวนชิ้น"), icon: <ShoppingBag className="w-4 h-4" /> },
                                    ].map((item) => (
                                        <button
                                            key={item.t}
                                            onClick={() => setForm({ ...form, type: item.t })}
                                            className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl text-xs font-medium border-2 transition-all ${form.type === item.t
                                                ? "border-pink-400 bg-pink-50 text-pink-600"
                                                : "border-gray-200 text-gray-500 hover:border-gray-300"
                                                }`}
                                        >
                                            {item.icon}
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Value (percent/fixed) */}
                            {(form.type === "percent" || form.type === "fixed") && (
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                                        {form.type === "percent" ? "เปอร์เซ็นต์ (%)" : "จำนวนเงิน (บาท)"}
                                    </label>
                                    <input
                                        type="number"
                                        value={form.value || ""}
                                        onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
                                        placeholder={form.type === "percent" ? "10" : "100"}
                                        className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300"
                                    />
                                </div>
                            )}

                            {/* Quantity Tiers */}
                            {form.type === "quantity" && (
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-2 block">{<Trans th="ขั้นส่วนลดตามจำนวนชิ้น" en="Discount level according to the number of pieces" />}</label>
                                    <div className="space-y-2">
                                        {(form.quantityTiers || []).map((tier, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-purple-50 rounded-xl p-3">
                                                <div className="flex-1">
                                                    <label className="text-[10px] text-gray-400">{<Trans th="จำนวนชิ้นขั้นต่ำ" en="Minimum number of pieces" />}</label>
                                                    <input
                                                        type="number"
                                                        value={tier.minQty || ""}
                                                        onChange={(e) => {
                                                            const tiers = [...(form.quantityTiers || [])];
                                                            tiers[i] = { ...tiers[i], minQty: parseInt(e.target.value) || 0 };
                                                            setForm({ ...form, quantityTiers: tiers });
                                                        }}
                                                        placeholder="2"
                                                        className="w-full px-3 py-2 bg-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-300"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-[10px] text-gray-400">{<Trans th="ลด (%)" en="reduce (%)" />}</label>
                                                    <input
                                                        type="number"
                                                        value={tier.discountPercent || ""}
                                                        onChange={(e) => {
                                                            const tiers = [...(form.quantityTiers || [])];
                                                            tiers[i] = { ...tiers[i], discountPercent: parseInt(e.target.value) || 0 };
                                                            setForm({ ...form, quantityTiers: tiers });
                                                        }}
                                                        placeholder="10"
                                                        className="w-full px-3 py-2 bg-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-300"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const tiers = (form.quantityTiers || []).filter((_, idx) => idx !== i);
                                                        setForm({ ...form, quantityTiers: tiers });
                                                    }}
                                                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors mt-3"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => {
                                                const tiers = [...(form.quantityTiers || []), { minQty: (form.quantityTiers?.length || 0) + 2, discountPercent: 5 }];
                                                setForm({ ...form, quantityTiers: tiers });
                                            }}
                                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 border-2 border-dashed border-purple-200 rounded-xl text-xs text-purple-500 hover:border-purple-400 hover:bg-purple-50/50 transition-all"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> <Trans th="เพิ่มขั้นส่วนลด" en="Increase the discount level" />
                                                                                    </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">{<Trans th="ตัวอย่าง: ซื้อ 2 ชิ้น ลด 10%, ซื้อ 3 ชิ้น ลด 15%" en="Example: Buy 2 items, get 10% off, Buy 3 items, get 15% off." />}</p>
                                </div>
                            )}

                            {/* Min Order, Min Qty & Max Uses */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">{<Trans th="ยอดขั้นต่ำ (฿)" en="Minimum amount (฿)" />}</label>
                                    <input
                                        type="number"
                                        value={form.minOrder || ""}
                                        onChange={(e) => setForm({ ...form, minOrder: parseFloat(e.target.value) || 0 })}
                                        placeholder="0"
                                        className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">{<Trans th="จำนวนชิ้นขั้นต่ำ" en="Minimum number of pieces" />}</label>
                                    <input
                                        type="number"
                                        value={form.minQty || ""}
                                        onChange={(e) => setForm({ ...form, minQty: parseInt(e.target.value) || 0 })}
                                        placeholder="0"
                                        className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">{<Trans th="ใช้ได้ (ครั้ง)" en="Can be used (times)" />}</label>
                                    <input
                                        type="number"
                                        value={form.maxUses || ""}
                                        onChange={(e) => setForm({ ...form, maxUses: parseInt(e.target.value) || 0 })}
                                        placeholder="0 = ∞"
                                        className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300"
                                    />
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">{<Trans th="เริ่มวันที่" en="Start date" />}</label>
                                    <input
                                        type="date"
                                        value={form.startDate}
                                        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">{<Trans th="ถึงวันที่" en="up to date" />}</label>
                                    <input
                                        type="date"
                                        value={form.endDate}
                                        onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300"
                                    />
                                </div>
                            </div>

                            {/* Enabled */}
                            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                                <span className="text-sm text-gray-600">{<Trans th="เปิดใช้งานทันที" en="Activate now" />}</span>
                                <button onClick={() => setForm({ ...form, enabled: !form.enabled })}>
                                    {form.enabled ? (
                                        <ToggleRight className="w-8 h-8 text-green-500" />
                                    ) : (
                                        <ToggleLeft className="w-8 h-8 text-gray-300" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-pink-100">
                            <button onClick={() => setModalOpen(false)} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 transition-colors">
                                <Trans th="ยกเลิก" en="cancel" />
                                                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!form.code.trim()}
                                className="px-6 py-2.5 bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-md shadow-pink-200 hover:shadow-lg transition-all disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {editingId ? "บันทึกการแก้ไข" : "เพิ่มโค้ดส่วนลด"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
