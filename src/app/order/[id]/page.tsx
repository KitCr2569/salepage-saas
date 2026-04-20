"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Package, Truck, MapPin, ShoppingCart } from "lucide-react";
import { products as allProducts } from "@/data";
import { useSettingsStore } from "@/store/useSettingsStore";
import { ShippingLogoIcon } from "@/components/ShippingLogos";
import Swal from 'sweetalert2';

export default function OrderPage() {
    const params = useParams();
    const orderId = params?.id as string;

    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [alreadyCompleted, setAlreadyCompleted] = useState(false);
    const [orderData, setOrderData] = useState<any>(null);

    const [form, setForm] = useState({
        name: "",
        email: "",
        postalCode: "",
        province: "",
        district: "",
        subdistrict: "",
        address: "",
        phone: "",
        taxName: "",
        taxAddress: "",
        taxId: "",
    });
    const [wantTaxInvoice, setWantTaxInvoice] = useState(false);

    // Admin settings
    const { shippingMethods: storeShipping, addressRequired, phoneRequired, emailRequired, customerEditAddress, receiptEnabled, receiptName: receiptAuthorName, receiptSignature: receiptSig } = useSettingsStore();
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => setHydrated(true), []);
    const showAddress = !hydrated || addressRequired !== "off";
    const showPhone = !hydrated || phoneRequired !== "off";
    const showEmail = !hydrated || emailRequired !== "off";
    const showReceipt = !hydrated || receiptEnabled !== false;

    const searchParams = useSearchParams();

    useEffect(() => {
        if (typeof window !== "undefined") {
            if (localStorage.getItem(`hdg_completed_edit_${orderId}`)) {
                setAlreadyCompleted(true);
            }
        }
    }, [orderId]);

    // Fetch order from DB + fallback to localStorage + save PSID
    useEffect(() => {
        const loadFetch = async () => {
            try {
                const urlPsid = searchParams.get("psid");
                if (urlPsid) {
                    localStorage.setItem(`hdg_psid_${orderId}`, urlPsid);
                }

                const res = await fetch(`/api/orders/${orderId}`);
                const json = await res.json();
                
                if (json.success && json.order) {
                    setOrderData(json.order);
                    if (json.order.customer) {
                         setForm(json.order.customer);
                    }
                    localStorage.setItem(`hdg_order_${orderId}`, JSON.stringify(json.order));
                } else {
                    const stored = localStorage.getItem(`hdg_order_${orderId}`);
                    if (stored) {
                        const localData = JSON.parse(stored);
                        setOrderData(localData);
                        if (localData.customer) setForm(localData.customer);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch order:", e);
                const stored = localStorage.getItem(`hdg_order_${orderId}`);
                if (stored) {
                    const localData = JSON.parse(stored);
                    setOrderData(localData);
                    if (localData.customer) setForm(localData.customer);
                }
            }
        };
        loadFetch();
    }, [orderId, searchParams]);

    const handleChange = (field: string, value: string) => {
        setForm((p) => ({ ...p, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (orderData) {
                const updated = { ...orderData, customer: form };
                localStorage.setItem(`hdg_order_${orderId}`, JSON.stringify(updated));
                setOrderData(updated);
            }

            // Send confirmation message to Messenger
            const psid = localStorage.getItem(`hdg_psid_${orderId}`);
            if (psid) {
                await fetch("/api/confirm-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orderId, psid, form }),
                }).catch(() => { });
            }

            localStorage.setItem(`hdg_completed_edit_${orderId}`, "true");
            setAlreadyCompleted(true);
        } catch (e) {
            console.error("Failed to save:", e);
        } finally {
            setIsSaving(false);
        }
    };

    // Resolve cart items with product data
    const resolvedItems = orderData?.cartItems?.map((item: any) => {
        // Handle mapped data from API
        const qty = item.quantity || item.qty || 1;
        const price = item.price || 0;
        const name = item.name || item.pid || "สินค้า";
        const variantName = item.variantName || item.variant || item.option || "";
        
        let image = item.image;
        if (!image || !item.name) {
             const product = allProducts.find((p) => p.id === item.pid || p.id === item.productId);
             if (product) {
                 if (!item.name) item.name = product.name;
                 if (!image) image = product.images?.[0] || "";
             }
        }
        
        return {
            image: image || "",
            name: name,
            variant: variantName,
            qty: qty,
            price: price,
        };
    }) || [];

    const subtotal = resolvedItems.reduce((sum: number, item: any) => sum + (item.price * item.qty), 0);

    const isCancelled = orderData?.status === "cancelled" || orderData?.status === "CANCELLED";

    if (isCancelled) {
        return (
            <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center">
                <div className="bg-white border-b border-gray-200 fixed top-0 w-full z-10">
                    <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-gray-800 truncate">HDG Wrap</span>
                        </div>
                    </div>
                </div>
                <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center justify-center w-full" style={{ minHeight: '100vh' }}>
                    <div className="bg-white rounded-lg shadow-sm p-8 w-full max-w-md text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">ยกเลิกออเดอร์เรียบร้อย ✅</h2>
                        <p className="text-sm text-gray-500 mb-2">ออเดอร์ #{orderId}</p>
                        <p className="text-sm text-gray-500 mb-6">รายการสั่งซื้อนี้ถูกยกเลิกแล้ว</p>
                        <a
                            href={`https://m.me/114336388182180`}
                            className="inline-block bg-[#4267B2] text-white w-full py-3 rounded-lg text-sm font-medium hover:bg-[#365899] transition-colors"
                        >
                            กลับสู่แชท
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    if (alreadyCompleted) {
        return (
            <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center">
                <div className="bg-white border-b border-gray-200 fixed top-0 w-full z-10">
                    <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-gray-800 truncate">HDG Wrap</span>
                        </div>
                    </div>
                </div>
                <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center justify-center w-full" style={{ minHeight: '100vh' }}>
                    <div className="bg-white rounded-lg shadow-sm p-8 w-full max-w-md text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">ตรวจสอบยืนยันเรียบร้อย ✅</h2>
                        <p className="text-sm text-gray-500 mb-2">ออเดอร์ #{orderId}</p>
                        <p className="text-sm text-gray-500 mb-6">ผู้จัดส่งได้รับข้อมูลยืนยันของท่านเรียบร้อยแล้ว</p>
                        {orderData && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                                <p className="text-sm text-green-700 font-bold">ยอดรวมทั้งหมด ฿{subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                            </div>
                        )}
                        <a
                            href={`https://m.me/114336388182180`}
                            className="inline-block bg-[#4267B2] text-white w-full py-3 rounded-lg text-sm font-medium hover:bg-[#365899] transition-colors"
                        >
                            กลับสู่แชท
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f5f5]">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <a href="https://www.hdgwrapskin.com" className="p-1.5 hover:bg-gray-100 rounded-full">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </a>
                        <span className="text-sm font-medium text-gray-800">HDG Wrap</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-lg">🇹🇭</span>
                        <span className="text-xs text-gray-500">TH</span>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* ======= Order Status ======= */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-base font-bold text-[#8B6914] mb-3">ตรวจสอบสถานะการจัดส่ง</h2>
                    <div className="text-sm text-gray-700 space-y-1">
                        <p>เลขที่การสั่งซื้อ : <span className="font-bold">{orderId}</span></p>
                        <p>สถานะ : <span className={`font-bold ${orderData?.paymentSlipUrl ? 'text-green-600' : 'text-[#4267B2]'}`}>
                            {orderData?.paymentSlipUrl ? 'ชำระเงินเรียบร้อย! 🎉' : 'รอชำระเงิน'}
                        </span></p>
                    </div>
                </div>

                {/* Admin Note */}
                {orderData?.note && orderData.note.trim() !== '' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                        <div className="flex items-start gap-2">
                            <span className="text-amber-500 mt-0.5">📝</span>
                            <div>
                                <h3 className="text-xs font-bold text-amber-800 mb-1">หมายเหตุจากร้านค้า</h3>
                                <p className="text-sm text-amber-700 whitespace-pre-wrap">{orderData.note}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ======= Order Items ======= */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-sm font-bold text-[#8B6914] mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4" /> รายละเอียดสินค้า
                    </h3>
                    <div className="space-y-3">
                        {resolvedItems.map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-14 h-14 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                    {item.image && (
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-800">
                                        {item.name} x {item.qty} ({item.variant})
                                    </p>
                                </div>
                                <span className="text-sm font-bold text-[#8B6914]">
                                    ฿{(item.price * item.qty).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">ยอดรวม:</span>
                            <span>฿{subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">ค่าขนส่ง:</span>
                            <span>฿0.00</span>
                        </div>
                        <div className="flex justify-between font-bold">
                            <span>ยอดรวมทั้งหมด:</span>
                            <span className="text-[#8B6914]">฿{subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    {/* Shipping Method with Logo */}
                    <div className="mt-4 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-3">
                            <ShippingLogoIcon name={orderData?.shippingIcon || orderData?.shipping || "EMS"} size={40} />
                            <div className="flex-1">
                                <p className="text-sm text-gray-700">
                                    จัดส่งผ่าน: <span className="font-medium">{storeShipping?.find(m => m.id === orderData?.shipping)?.name || orderData?.shipping || "EMS"}</span>
                                </p>
                                <p className="text-xs text-gray-400">
                                    วันที่ (ออกใบเสร็จ/ใบกำกับภาษี) {new Date().toISOString().split("T")[0]}
                                </p>
                            </div>
                        </div>

                        {/* Tracking Number */}
                        {orderData?.trackingNumber && (
                            <div className="mt-3 bg-blue-50 rounded-lg p-3">
                                <p className="text-xs text-blue-600 font-medium mb-1">📦 เลขพัสดุ (Tracking)</p>
                                <p className="text-sm font-mono font-bold text-blue-800">
                                    {orderData.shippingProvider && <span className="text-xs text-gray-500 font-sans">{orderData.shippingProvider}: </span>}
                                    {orderData.trackingNumber}
                                </p>
                                {(() => {
                                    const p = (orderData.shippingProvider || orderData.shipping || "").toLowerCase();
                                    let url = "";
                                    if (p.includes("flash")) url = `https://www.flashexpress.co.th/fle/tracking?se=${orderData.trackingNumber}`;
                                    else if (p.includes("kerry")) url = `https://th.kerryexpress.com/th/track/?track=${orderData.trackingNumber}`;
                                    else if (p.includes("j&t") || p.includes("jt")) url = `https://www.jtexpress.co.th/index/query/gzquery.html?billcode=${orderData.trackingNumber}`;
                                    else if (p.includes("thaipost") || p.includes("\u0e44\u0e1b\u0e23\u0e29\u0e13\u0e35\u0e22\u0e4c") || p.includes("ems")) url = `https://track.thailandpost.co.th/?trackNumber=${orderData.trackingNumber}`;
                                    else if (p.includes("shopee")) url = `https://spx.co.th/track?id=${orderData.trackingNumber}`;
                                    else if (p.includes("ninja")) url = `https://www.ninjavan.co/th-th/tracking?id=${orderData.trackingNumber}`;
                                    else if (p.includes("best")) url = `https://www.best-inc.co.th/track?bills=${orderData.trackingNumber}`;
                                    return url ? (
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 mt-2 text-xs text-white bg-blue-500 px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors"
                                        >
                                            🔍 ติดตามพัสดุ
                                        </a>
                                    ) : null;
                                })()}
                            </div>
                        )}
                    </div>
                </div>

                {/* ======= Upload Slip ======= */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    {orderData?.paymentSlipUrl ? (
                         <div className="flex flex-col items-center gap-3">
                             <p className="text-sm font-bold text-green-600 flex items-center gap-2">✅ แนบหลักฐานเรียบร้อยแล้ว</p>
                             <img src={orderData.paymentSlipUrl} alt="สลิป" className="max-w-xs max-h-64 rounded-lg border border-gray-200 mt-2 object-contain" />
                         </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                             <label className={`cursor-pointer text-white px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#4267B2] hover:bg-[#365899]'}`}>
                                 {isSaving ? "กำลังอัพโหลด..." : "📎 แนบหลักฐานการชำระเงิน"}
                                 <input type="file" accept="image/*" className="hidden" disabled={isSaving} onChange={(e) => {
                                     const file = e.target.files?.[0];
                                     if (file) {
                                         if (file.size > 5 * 1024 * 1024) {
                                            Swal.fire({ text: "⚠️ ไฟล์ใหญ่เกินไป กรุณาเลือกไฟล์ขนาดไม่เกิน 5MB", icon: 'error' });
                                            return;
                                         }
                                         setIsSaving(true);
                                         const img = new window.Image();
                                         const objectUrl = URL.createObjectURL(file);
                                         img.onload = async () => {
                                             const maxW = 1200;
                                             const scale = Math.min(1, maxW / img.width);
                                             const canvas = document.createElement("canvas");
                                             canvas.width = img.width * scale;
                                             canvas.height = img.height * scale;
                                             const ctx = canvas.getContext("2d");
                                             ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                                             const compressed = canvas.toDataURL("image/jpeg", 0.80);
                                             URL.revokeObjectURL(objectUrl);
                                             
                                             try {
                                                // Sync to server
                                                await fetch("/api/orders", {
                                                    method: "PATCH",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ orderId, paymentSlipUrl: compressed }),
                                                });
                                                
                                                // Sync local storage
                                                if (orderData) {
                                                    const updated = { ...orderData, paymentSlipUrl: compressed, status: 'confirmed' };
                                                    localStorage.setItem(`hdg_order_${orderId}`, JSON.stringify(updated));
                                                    setOrderData(updated);
                                                }
                                             } catch (e) {
                                                console.error("Upload error", e);
                                             } finally {
                                                setIsSaving(false);
                                             }
                                         };
                                         img.src = objectUrl;
                                     }
                                 }} />
                             </label>
                             <p className="text-[10px] text-gray-400">อัพโหลดไฟล์ขนาดไม่เกิน 5MB</p>
                        </div>
                    )}
                </div>

                {/* ======= Shipping Address ======= */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-base font-bold text-[#8B6914] mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> ที่อยู่จัดส่ง
                    </h3>

                    <div className="space-y-4">
                        <div className="relative">
                            <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400">ชื่อ - นามสกุล</label>
                            <input type="text" value={form.name} onChange={(e) => handleChange("name", e.target.value)}
                                readOnly={hydrated && !customerEditAddress}
                                className={`w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#8B6914] ${hydrated && !customerEditAddress ? "bg-gray-100 cursor-not-allowed" : ""}`} />
                        </div>
                        {showEmail && (
                            <div className="relative">
                                <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400">อีเมล</label>
                                <input type="email" value={form.email || ""} onChange={(e) => handleChange("email", e.target.value)}
                                    readOnly={hydrated && !customerEditAddress}
                                    placeholder="example@email.com"
                                    className={`w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#8B6914] ${hydrated && !customerEditAddress ? "bg-gray-100 cursor-not-allowed" : ""}`} />
                            </div>
                        )}
                        {showAddress && (
                            <>
                                <div className="relative">
                                    <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400">รหัสไปรษณีย์</label>
                                    <input type="text" value={form.postalCode} onChange={(e) => handleChange("postalCode", e.target.value)}
                                        readOnly={hydrated && !customerEditAddress}
                                        className={`w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#8B6914] ${hydrated && !customerEditAddress ? "bg-gray-100 cursor-not-allowed" : ""}`} />
                                </div>
                                <div className="relative">
                                    <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400">จังหวัด</label>
                                    <input type="text" value={form.province} onChange={(e) => handleChange("province", e.target.value)}
                                        readOnly={hydrated && !customerEditAddress}
                                        className={`w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#8B6914] ${hydrated && !customerEditAddress ? "bg-gray-100 cursor-not-allowed" : ""}`} />
                                </div>
                                <div className="relative">
                                    <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400">อำเภอ/เขต</label>
                                    <input type="text" value={form.district} onChange={(e) => handleChange("district", e.target.value)}
                                        readOnly={hydrated && !customerEditAddress}
                                        className={`w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#8B6914] ${hydrated && !customerEditAddress ? "bg-gray-100 cursor-not-allowed" : ""}`} />
                                </div>
                                <div className="relative">
                                    <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400">ตำบล/แขวง</label>
                                    <input type="text" value={form.subdistrict} onChange={(e) => handleChange("subdistrict", e.target.value)}
                                        readOnly={hydrated && !customerEditAddress}
                                        className={`w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#8B6914] ${hydrated && !customerEditAddress ? "bg-gray-100 cursor-not-allowed" : ""}`} />
                                </div>
                                <div className="relative">
                                    <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400">ที่อยู่</label>
                                    <textarea value={form.address} onChange={(e) => handleChange("address", e.target.value)}
                                        readOnly={hydrated && !customerEditAddress}
                                        rows={3}
                                        className={`w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 resize-none focus:outline-none focus:border-[#8B6914] ${hydrated && !customerEditAddress ? "bg-gray-100 cursor-not-allowed" : ""}`} />
                                </div>
                            </>
                        )}
                        {showPhone && (
                            <div className="relative">
                                <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400">เบอร์โทรศัพท์</label>
                                <input type="tel" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)}
                                    readOnly={hydrated && !customerEditAddress}
                                    className={`w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#8B6914] ${hydrated && !customerEditAddress ? "bg-gray-100 cursor-not-allowed" : ""}`} />
                            </div>
                        )}
                    </div>

                    {/* Tax Invoice Section */}
                    {showReceipt && (
                        <div className="mt-6 space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={wantTaxInvoice} onChange={(e) => setWantTaxInvoice(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300" />
                                <span className="text-sm text-gray-600">ต้องการใบกำกับภาษี / ใบแจ้ง</span>
                            </label>

                            {wantTaxInvoice && (
                                <div className="space-y-4 pt-2">
                                    <h3 className="text-base font-bold text-[#8B6914]">ข้อมูลในการออกใบเสร็จ / ใบกำกับภาษี</h3>
                                    <div className="relative">
                                        <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400">ชื่อ</label>
                                        <input type="text" value={form.taxName} onChange={(e) => handleChange("taxName", e.target.value)}
                                            readOnly={hydrated && !customerEditAddress}
                                            className={`w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#8B6914] ${hydrated && !customerEditAddress ? "bg-gray-100 cursor-not-allowed" : ""}`} />
                                    </div>
                                    <div className="relative">
                                        <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400">ที่อยู่</label>
                                        <textarea value={form.taxAddress} onChange={(e) => handleChange("taxAddress", e.target.value)} rows={3}
                                            readOnly={hydrated && !customerEditAddress}
                                            placeholder="บ้านเลขที่, หมู่, ซอย, และถนน"
                                            className={`w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#8B6914] resize-none ${hydrated && !customerEditAddress ? "bg-gray-100 cursor-not-allowed" : ""}`} />
                                    </div>
                                    <div className="relative">
                                        <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400">หมายเลขประจำตัวผู้เสียภาษี หรือหมายเลขบัตรประชาชน</label>
                                        <input type="text" value={form.taxId} onChange={(e) => handleChange("taxId", e.target.value)}
                                            readOnly={hydrated && !customerEditAddress}
                                            className={`w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#8B6914] ${hydrated && !customerEditAddress ? "bg-gray-100 cursor-not-allowed" : ""}`} />
                                    </div>

                                    {/* Receipt preview */}
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-3">
                                        <p className="text-xs text-gray-500 mb-2">ตัวอย่างลายเซ็นในใบเสร็จ</p>
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-gray-700">{receiptAuthorName || "HDG"}</p>
                                                <p className="text-xs text-gray-400">ผู้มีอำนาจลงนาม</p>
                                            </div>
                                            {receiptSig && (
                                                <img src={receiptSig} alt="ลายเซ็น" className="h-12 object-contain" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Save Button */}
                    {hydrated && customerEditAddress && (
                        <div className="mt-6 pb-4">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full bg-[#4267B2] text-white py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#365899] transition-colors"
                            >
                                <ShoppingCart className="w-4 h-4" />
                                {isSaving ? "กำลังบันทึก..." : "ยืนยันการแก้ไข"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Bottom spacer */}
                <div className="h-6"></div>
            </div>

            {/* Bottom spacer */}
            <div className="h-6"></div>
        </div>
    );
}
