"use client";

import { useSettingsStore } from "@/store/useSettingsStore";
import { Truck, Plus, Edit2, Trash2, X, Save, ToggleLeft, ToggleRight } from "lucide-react";
import { useState } from "react";
import Swal from "sweetalert2";
import { ShippingLogoIcon } from "@/components/ShippingLogos";
import { Trans } from "@/components/Trans";

const SHIPPING_PROVIDERS = [
    { id: "flash", name: "Flash Express" },
    { id: "kerry", name: "Kerry Express" },
    { id: "jt", name: "J&T Express" },
    { id: "thaipost", name: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Thailand Post" : "ไปรษณีย์ไทย") },
    { id: "ems", name: "EMS" },
    { id: "shopee", name: "Shopee Express" },
    { id: "lazada", name: "Lazada Express" },
    { id: "ninja", name: "NinjaVan" },
    { id: "best", name: "Best Express" },
    { id: "dhl", name: "DHL Express" },
    { id: "scg", name: "SCG Express" },
    { id: "grab", name: "GrabExpress" },
    { id: "pickup", name: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Pickup" : "รับพัสดุเอง") },
    { id: "custom", name: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "other" : "อื่นๆ") },
];

export default function AdminShipping() {
    const shippingMethods = useSettingsStore((s) => s.shippingMethods);
    const toggleShipping = useSettingsStore((s) => s.toggleShipping);
    const addShipping = useSettingsStore((s) => s.addShipping);
    const updateShipping = useSettingsStore((s) => s.updateShipping);
    const deleteShipping = useSettingsStore((s) => s.deleteShipping);

    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formName, setFormName] = useState("");
    const [formNameEn, setFormNameEn] = useState("");
    const [formPrice, setFormPrice] = useState(0);
    const [formDays, setFormDays] = useState("");
    const [formIcon, setFormIcon] = useState("");
    const [formProshipCode, setFormProshipCode] = useState("");
    const [formProshipApiKey, setFormProshipApiKey] = useState("");
    const [formProshipShopId, setFormProshipShopId] = useState("");
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const PROSHIP_CARRIERS = [
        { id: "", name: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Proship not connected" : "ไม่เชื่อมต่อ Proship") },
        { id: "flash", name: "Flash Express" },
        { id: "kerry", name: "Kerry Express" },
        { id: "jt", name: "J&T Express" },
        { id: "thaipost", name: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Thailand Post (Registered)" : "ไปรษณีย์ไทย (ลงทะเบียน)") },
        { id: "ems", name: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Thailand Post (EMS)" : "ไปรษณีย์ไทย (EMS)") },
        { id: "shopee", name: "Shopee Express" },
        { id: "ninja", name: "NinjaVan" },
        { id: "best", name: "Best Express" },
        { id: "dhl", name: "DHL Express" },
    ];

    const openAdd = () => {
        setFormName("");
        setFormNameEn("");
        setFormPrice(0);
        setFormDays("");
        setFormIcon("");
        setFormProshipCode("");
        setFormProshipApiKey("");
        setFormProshipShopId("");
        setEditingId(null);
        setShowAddModal(true);
    };

    const openEdit = (method: any) => {
        setFormName(method.name);
        setFormNameEn(method.nameEn);
        setFormPrice(method.price);
        setFormDays(method.days);
        setFormIcon(method.icon || "");
        setFormProshipCode(method.proshipCarrierCode || "");
        setFormProshipApiKey(method.proshipApiKey || "");
        setFormProshipShopId(method.proshipShopId || "");
        setEditingId(method.id);
        setShowAddModal(true);
    };

    const handleSave = async () => {
        if (!formName.trim()) return;

        if (editingId) {
            updateShipping(editingId, {
                name: formName,
                nameEn: formNameEn,
                price: formPrice,
                days: formDays,
                icon: formIcon,
                proshipCarrierCode: formProshipCode,
                proshipApiKey: formProshipApiKey,
                proshipShopId: formProshipShopId,
            });
            setSuccessMsg("อัพเดทช่องทางขนส่งสำเร็จ!");
        } else {
            const newId = `shipping-${Date.now()}`;
            addShipping({
                id: newId,
                name: formName,
                nameEn: formNameEn,
                price: formPrice,
                days: formDays,
                icon: formIcon,
                proshipCarrierCode: formProshipCode,
                proshipApiKey: formProshipApiKey,
                proshipShopId: formProshipShopId,
                enabled: true,
            });
            setSuccessMsg("เพิ่มช่องทางขนส่งสำเร็จ!");
        }
        
        // Sync to backend DB
        try {
            const currentState = useSettingsStore.getState();
            await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(currentState),
            });
        } catch (err) {
            console.error("Failed to save shipping to DB", err);
        }

        setShowAddModal(false);
        setTimeout(() => setSuccessMsg(null), 2000);
    };

    const handleDelete = async (id: string) => {
        const result = await Swal.fire({
            text: "ต้องการลบช่องทางขนส่งนี้?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ec4899',
            cancelButtonColor: '#9ca3af',
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก'
        });
        if (result.isConfirmed) {
            deleteShipping(id);
            setSuccessMsg("ลบช่องทางขนส่งสำเร็จ!");
            setTimeout(() => setSuccessMsg(null), 2000);
        }
    };

    return (
        <div className="p-6 md:p-8">
            {/* Success */}
            {successMsg && (
                <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg animate-pulse text-sm font-medium">
                    ✅ {successMsg}
                </div>
            )}

            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-pink-500 flex items-center gap-2">
                    <Truck className="w-6 h-6" />
                    <Trans th="จัดการช่องทางขนส่ง" en="Manage transportation channels" />
                                    </h1>
                <button
                    onClick={openAdd}
                    className="bg-gradient-to-r from-pink-400 to-pink-500 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-md shadow-pink-200 hover:shadow-lg transition-all"
                >
                    <Plus className="w-4 h-4" />
                    <Trans th="เพิ่มช่องทาง" en="Add a channel" />
                                    </button>
            </div>

            <div className="space-y-4">
                {shippingMethods.map((method) => (
                    <div
                        key={method.id}
                        className={`bg-white rounded-2xl p-5 shadow-sm border transition-all hover:shadow-md ${method.enabled ? "border-pink-100" : "border-gray-200 opacity-60"
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center overflow-hidden p-1">
                                    <ShippingLogoIcon name={method.icon || method.name} size={40} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-800">{method.name}</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-gray-400">{method.nameEn}</p>
                                        {method.proshipCarrierCode && (
                                            <span className="text-[10px] bg-indigo-50 text-indigo-500 px-1.5 rounded-md border border-indigo-100 font-medium whitespace-nowrap">
                                                🔗 Proship: {method.proshipCarrierCode}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-800">
                                        {method.price === 0 ? "ฟรี" : `฿${method.price}`}
                                    </p>
                                    <p className="text-xs text-gray-400">{method.days} {<Trans th="วัน" en="day" />}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => openEdit(method)}
                                        className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(method.id)}
                                        className="p-2 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <button
                                    onClick={async () => {
                                        // Compute the new state BEFORE toggling (avoid Zustand batch timing)
                                        const currentState = useSettingsStore.getState();
                                        const updatedShipping = currentState.shippingMethods.map((m) =>
                                            m.id === method.id ? { ...m, enabled: !m.enabled } : m
                                        );
                                        // Toggle UI first
                                        toggleShipping(method.id);
                                        // Save updated state to DB immediately
                                        try {
                                            await fetch("/api/settings", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ ...currentState, shippingMethods: updatedShipping }),
                                            });
                                        } catch (err) {
                                            console.error("Failed to sync shipping toggle", err);
                                        }
                                    }}
                                    className="transition-colors"
                                >
                                    {method.enabled ? (
                                        <ToggleRight className="w-8 h-8 text-green-500" />
                                    ) : (
                                        <ToggleLeft className="w-8 h-8 text-gray-300" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Shipping Zones */}
            <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm border border-pink-100">
                <h2 className="text-lg font-bold text-gray-800 mb-4">{<Trans th="โซนการจัดส่ง" en="Delivery zone" />}</h2>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-pink-50 rounded-xl">
                        <span className="text-sm text-gray-700">{<Trans th="ทั่วประเทศ (ไทย)" en="Nationwide (Thailand)" />}</span>
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">{<Trans th="เปิดใช้งาน" en="Activate" />}</span>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-800">
                                {editingId ? "แก้ไขช่องทางขนส่ง" : "เพิ่มช่องทางขนส่ง"}
                            </h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Icon Picker */}
                        <div className="mb-4">
                            <label className="text-xs font-medium text-gray-500 mb-2 block">{<Trans th="เลือกโลโก้ขนส่ง" en="Choose a shipping logo" />}</label>
                            <div className="grid grid-cols-4 gap-2">
                                {SHIPPING_PROVIDERS.map((s) => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => {
                                            setFormIcon(s.id);
                                            if (!formName && s.name !== "อื่นๆ") setFormName(s.name);
                                            if (!formNameEn && s.name !== "อื่นๆ") setFormNameEn(s.name);
                                        }}
                                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${formIcon === s.id
                                            ? "border-pink-400 bg-pink-50 shadow-sm"
                                            : "border-gray-200 hover:border-gray-300"
                                            }`}
                                    >
                                        <ShippingLogoIcon name={s.id} size={36} />
                                        <span className="text-[9px] text-gray-500 text-center leading-tight">{s.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1 block">{<Trans th="ชื่อวิธีขนส่ง (ไทย)" en="Name of transportation method (Thai)" />}</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "such as standard delivery" : "เช่น จัดส่งมาตรฐาน")}
                                    className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1 block">{<Trans th="ชื่อวิธีขนส่ง (English)" en="Name of transportation method (English)" />}</label>
                                <input
                                    type="text"
                                    value={formNameEn}
                                    onChange={(e) => setFormNameEn(e.target.value)}
                                    placeholder="e.g. Standard Shipping"
                                    className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">{<Trans th="ราคา (บาท)" en="Price (Baht)" />}</label>
                                    <input
                                        type="number"
                                        value={formPrice}
                                        onChange={(e) => setFormPrice(Number(e.target.value))}
                                        className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">{<Trans th="ระยะเวลา (วัน)" en="Duration (days)" />}</label>
                                    <input
                                        type="text"
                                        value={formDays}
                                        onChange={(e) => setFormDays(e.target.value)}
                                        placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "such as 3-5" : "เช่น 3-5")}
                                        className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300"
                                    />
                                </div>
                            </div>

                            {/* Proship Integration Dropdown */}
                            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                <label className="text-xs font-bold text-indigo-600 mb-2 flex items-center gap-1">
                                    <Trans th="🚚 เชื่อมต่อ Proship" en="🚚 Connect Proship" />
                                                                    </label>
                                <select
                                    value={formProshipCode}
                                    onChange={(e) => setFormProshipCode(e.target.value)}
                                    className="w-full px-3 py-2 bg-white rounded-xl text-sm outline-none border border-indigo-200 focus:ring-2 focus:ring-indigo-300 font-medium"
                                >
                                    {PROSHIP_CARRIERS.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                
                                <div className="mt-3 space-y-2 pt-3 border-t border-indigo-100 bg-white/50 p-3 rounded-xl">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-indigo-500 block uppercase">📦 Proship API Key</label>
                                        <input 
                                            type="text" 
                                            value={formProshipApiKey} 
                                            onChange={(e) => setFormProshipApiKey(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-[11px] outline-none focus:ring-1 focus:ring-indigo-400"
                                            placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "eyJh... (enter only this transport or leave blank to use the default value)" : "eyJh... (ใส่เฉพาะของขนส่งนี้ หรือเว้นว่างเพื่อใช้ค่า Default)")}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-indigo-500 block uppercase">🏪 Proship Shop ID</label>
                                        <input 
                                            type="text" 
                                            value={formProshipShopId} 
                                            onChange={(e) => setFormProshipShopId(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-[11px] outline-none focus:ring-1 focus:ring-indigo-400"
                                            placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "shop-xxx... (leave blank to use default value)" : "shop-xxx... (เว้นว่างเพื่อใช้ค่า Default)")}
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-indigo-400 mt-2 leading-tight italic">
                                    <Trans th="* ตั้งค่า API Key เฉพาะของขนส่งนี้ (หากไม่ระบุจะใช้ค่า Default)" en="* Set a unique API Key for this transport. (If not specified, the default value will be used)" />
                                                                    </p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                            >
                                <Trans th="ยกเลิก" en="cancel" />
                                                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-xl text-sm font-medium shadow-md shadow-pink-200 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {editingId ? "อัพเดท" : "เพิ่ม"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
