"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { banks } from "@/data";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useShopStore } from "@/store/useShopStore";
import { ShoppingCart, ChevronDown, ChevronUp } from "lucide-react";
import PostalCodeAutocomplete from "@/components/PostalCodeAutocomplete";
import { t, type Lang } from "@/lib/translations";
import { ShippingLogoIcon } from "@/components/ShippingLogos";

interface OrderData {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone?: string | null;
    customerAddress?: string | null;
    adminFilledAddress?: boolean;
    total: number;
    status: string;
    paymentMethod: string;
    shippingMethod: string;
    paymentSlipUrl: string | null;
    paidAt: string | null;
    note?: string | null;
    items: { name: string; quantity: number; unitPrice: number; total: number; image?: string; variant?: string }[];
}

export default function PaymentPage() {
    const params = useParams();
    const token = params.token as string;
    const [order, setOrder] = useState<OrderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [uploading, setUploading] = useState(false);
    const [slipPreview, setSlipPreview] = useState<string | null>(null);
    const [slipName, setSlipName] = useState("");
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [showSlipWarning, setShowSlipWarning] = useState(false);
    const [showCart, setShowCart] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [lang, setLang] = useState<Lang>("th");

    // Form fields (same as checkout)
    const [form, setForm] = useState({
        name: "",
        postalCode: "",
        province: "",
        district: "",
        subdistrict: "",
        address: "",
        phone: "",
        email: "",
        taxName: "",
        taxAddress: "",
        taxId: "",
    });
    const [wantTaxInvoice, setWantTaxInvoice] = useState(false);

    // Sync settings from admin
    const { shippingMethods: storeShipping, bankAccount, paymentMethods, promptPayQR, addressRequired, phoneRequired, emailRequired, receiptEnabled, receiptName: receiptAuthorName, receiptSignature: receiptSig } = useSettingsStore();
    const shopConfig = useShopStore((s) => s.shopConfig);

    // Hydration
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => { setHydrated(true); }, []);
    const showAddress = !hydrated || (addressRequired !== "off" && !order?.adminFilledAddress);
    const showEmail = !hydrated || emailRequired !== "off";
    const showPhone = !hydrated || (phoneRequired !== "off" && !order?.adminFilledAddress);
    const showReceipt = !hydrated || receiptEnabled !== false;

    const handleChange = (field: string, value: string) => {
        setForm((p) => ({ ...p, [field]: value }));
    };

    const getShippingLogo = (id: string) => {
        const logoMap: Record<string, string> = {
            registered: "thaipost",
            ems: "ems",
            kerry: "kerry",
            flash: "flash",
            jt: "jt",
            thaipost: "thaipost",
            dhl: "dhl",
            grab: "grab",
            best: "best",
            ninjavan: "ninjavan",
            scg: "scg",
            shopee: "shopee",
            lazada: "lazada",
        };
        return `/logos/${logoMap[id] || id}.png`;
    };

    const FALLBACK_SHIPPING = [
        { id: "ems", name: "EMS", price: 0, logo: "/logos/ems.png" },
        { id: "flash", name: "Flash Express", price: 0, logo: "/logos/flash.png" },
        { id: "jt", name: "J&T Express", price: 0, logo: "/logos/jt.png" },
        { id: "kerry", name: "Kerry Express", price: 0, logo: "/logos/kerry.png" },
        { id: "thaipost", name: "ไปรษณีย์ไทย", price: 0, logo: "/logos/thaipost.png" },
    ];

    useEffect(() => {
        if (!token) return;
        
        // First load the actual system settings specifically from DB
        fetch("/api/settings")
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data && Object.keys(data.data).length > 0) {
                     // Override localStorage with fresh DB states
                     useSettingsStore.setState(data.data);
                }
            })
            .catch(err => console.error("Failed to load settings:", err));

        fetch(`/api/pay/${token}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setOrder(data.data);
                    // Pre-fill customer data from order
                    setForm(prev => ({ 
                        ...prev, 
                        name: data.data.customerName || prev.name,
                        phone: (data.data.customerPhone && data.data.customerPhone !== '-') ? data.data.customerPhone : prev.phone,
                        address: data.data.customerAddress || prev.address 
                    }));
                } else {
                    setError(data.error || t.orderNotFound[lang]);
                }
            })
            .catch(() => setError(t.loading[lang]))
            .finally(() => setLoading(false));
    }, [token, lang]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setUploadError(lang === "th" ? "⚠️ ไฟล์ใหญ่เกินไป กรุณาเลือกไฟล์ขนาดไม่เกิน 5MB" : "⚠️ File too large. Max size is 5MB.");
            return;
        }
        setUploadError("");
        setSlipName(file.name);
        setShowSlipWarning(false);
        // Compress image using canvas before storing
        const img = new window.Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            const maxW = 1200;
            const scale = Math.min(1, maxW / img.width);
            const canvas = document.createElement("canvas");
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressed = canvas.toDataURL("image/jpeg", 0.80);
            setSlipPreview(compressed);
            URL.revokeObjectURL(objectUrl);
        };
        img.src = objectUrl;
    };

    const handleUpload = async () => {
        // Validate customer info - only name is required
        if (!form.name.trim()) {
            setUploadError(lang === "th" ? "⚠️ กรุณากรอกชื่อ-นามสกุล" : "⚠️ Please enter your name");
            return;
        }

        if (!slipPreview) return;
        setUploading(true);
        setUploadError("");
        try {
            const res = await fetch(`/api/pay/${token}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    slipImage: slipPreview,
                    customerData: form
                }),
            });
            const data = await res.json();
            if (data.success) {
                setUploadSuccess(true);
                setOrder((prev) => prev ? { ...prev, status: "PAID", paymentSlipUrl: slipPreview } : prev);
                // Close the window after a short delay so customer sees success briefly
                setTimeout(() => {
                    try { window.close(); } catch { /* ignore */ }
                }, 2500);
            } else {
                setUploadError(data.error || (lang === "th" ? "⚠️ อัปโหลดไม่สำเร็จ กรุณาลองใหม่" : "⚠️ Upload failed. Please try again."));
            }
        } catch {
            setUploadError(lang === "th" ? "⚠️ เกิดข้อผิดพลาด กรุณาลองใหม่" : "⚠️ Error, please try again");
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-[#4267B2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm text-gray-500">{t.loading[lang]}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4">
                <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">❌</span>
                    </div>
                    <h1 className="text-lg font-bold text-gray-800 mb-2">{t.orderNotFound[lang]}</h1>
                    <p className="text-sm text-gray-500">{error}</p>
                </div>
            </div>
        );
    }

    if (!order) return null;

    const isPaid = order.status === "PAID" || order.status === "CONFIRMED" || order.status === "SHIPPED" || order.status === "DELIVERED";
    const isCancelled = order.status === "CANCELLED";
    const slipAttached = !!slipPreview;

    // Cancelled state
    if (isCancelled) {
        return (
            <div className="min-h-screen bg-[#f5f5f5]">
                <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            <img src={shopConfig.shopLogo} alt={shopConfig.shopName} className="w-9 h-9 rounded-full flex-shrink-0 object-cover border border-gray-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            <span className="text-sm font-bold text-gray-800 truncate">{shopConfig.shopName}</span>
                        </div>
                    </div>
                </div>
                <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 56px)' }}>
                    <div className="bg-white rounded-lg shadow-sm p-8 w-full max-w-md text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">ยกเลิกออเดอร์เรียบร้อย ✅</h2>
                        <p className="text-sm text-gray-500 mb-2">{t.orderLabel[lang]} #{order.orderNumber}</p>
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

    // Success state
    if (isPaid || uploadSuccess) {
        return (
            <div className="min-h-screen bg-[#f5f5f5]">
                <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            <img src={shopConfig.shopLogo} alt={shopConfig.shopName} className="w-9 h-9 rounded-full flex-shrink-0 object-cover border border-gray-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            <span className="text-sm font-bold text-gray-800 truncate">{shopConfig.shopName}</span>
                        </div>
                    </div>
                </div>
                <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 56px)' }}>
                    <div className="bg-white rounded-lg shadow-sm p-8 w-full max-w-md text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">{t.successTitle[lang]}</h2>
                        <p className="text-sm text-gray-500 mb-2">{t.orderLabel[lang]} #{order.orderNumber}</p>
                        <p className="text-sm text-gray-500 mb-6">{t.successMsg[lang]}</p>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-sm text-green-700 font-bold">{t.total[lang]} ฿{order.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                        </div>
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
                    <div className="flex items-center gap-3 min-w-0">
                        <img src={shopConfig.shopLogo} alt={shopConfig.shopName} className="w-9 h-9 rounded-full flex-shrink-0 object-cover border border-gray-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <span className="text-sm font-bold text-gray-800 truncate">{shopConfig.shopName}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <button
                            onClick={() => setLang(lang === "th" ? "en" : "th")}
                            className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded w-[32px] text-center hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                            {lang === "th" ? "EN" : "TH"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* ======= Address Form (same as Checkout) ======= */}
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="flex items-center justify-between px-6 pt-5 pb-3">
                        <h2 className="text-lg font-bold text-[#8B6914]">{t.payment[lang]}</h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {isPaid ? t.paidStatus[lang] : t.waitingPayment[lang]}
                        </span>
                    </div>
                    <div className="px-6 pb-6 space-y-4">
                        {/* Order Number */}
                        <p className="text-sm text-gray-500 font-medium">#{order.orderNumber}</p>

                        {/* Name */}
                        <div className="relative">
                            <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400">{t.fullName[lang]}</label>
                            <input type="text" value={form.name} onChange={(e) => handleChange("name", e.target.value)}
                                className="w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#8B6914]" />
                        </div>

                        {/* Address Fields */}
                        {showAddress && (
                            <>
                                <PostalCodeAutocomplete value={form.postalCode} onChange={handleChange} lang={lang} />
                                <div className="relative">
                                    <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400">{t.province[lang]}</label>
                                    <input type="text" value={form.province} onChange={(e) => handleChange("province", e.target.value)}
                                        className="w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#8B6914]" />
                                </div>
                                <div className="relative">
                                    <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400">{t.district[lang]}</label>
                                    <input type="text" value={form.district} onChange={(e) => handleChange("district", e.target.value)}
                                        className="w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#8B6914]" />
                                </div>
                                <div className="relative">
                                    <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400">{t.subdistrict[lang]}</label>
                                    <input type="text" value={form.subdistrict} onChange={(e) => handleChange("subdistrict", e.target.value)}
                                        className="w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#8B6914]" />
                                </div>
                                <div className="relative">
                                    <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400">{t.address[lang]}</label>
                                    <textarea value={form.address} onChange={(e) => handleChange("address", e.target.value)} rows={3}
                                        placeholder={t.addressPlaceholder[lang]}
                                        className="w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#8B6914] resize-none" />
                                </div>
                            </>
                        )}

                        {/* Phone */}
                        {showPhone && (
                            <div className="relative">
                                <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400">{t.phone[lang]}</label>
                                <input type="tel" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)}
                                    className="w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#8B6914]" />
                            </div>
                        )}

                        {/* Email */}
                        {showEmail && (
                            <div className="relative">
                                <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400">{t.email[lang]}</label>
                                <input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)}
                                    placeholder={t.emailPlaceholder[lang]}
                                    className="w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#8B6914]" />
                            </div>
                        )}

                        {/* Tax Invoice */}
                        {showReceipt && (
                            <>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={wantTaxInvoice} onChange={(e) => setWantTaxInvoice(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300" />
                                    <span className="text-sm text-gray-600">{t.wantTaxInvoice[lang]}</span>
                                </label>
                                {wantTaxInvoice && (
                                    <div className="space-y-4 pt-2">
                                        <h3 className="text-base font-bold text-[#8B6914]">{t.taxTitle[lang]}</h3>
                                        <div className="relative">
                                            <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400">{t.taxName[lang]}</label>
                                            <input type="text" value={form.taxName} onChange={(e) => handleChange("taxName", e.target.value)}
                                                className="w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#8B6914]" />
                                        </div>
                                        <div className="relative">
                                            <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400">{t.taxAddress[lang]}</label>
                                            <textarea value={form.taxAddress} onChange={(e) => handleChange("taxAddress", e.target.value)} rows={3}
                                                placeholder={t.addressPlaceholder[lang]}
                                                className="w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#8B6914] resize-none" />
                                        </div>
                                        <div className="relative">
                                            <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400">{t.taxId[lang]}</label>
                                            <input type="text" value={form.taxId} onChange={(e) => handleChange("taxId", e.target.value)}
                                                className="w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#8B6914]" />
                                        </div>
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-3">
                                            <p className="text-xs text-gray-500 mb-2">{t.receiptPreview[lang]}</p>
                                            <div className="flex items-end justify-between">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-700">{receiptAuthorName || "HDG"}</p>
                                                    <p className="text-xs text-gray-400">{t.authorizedSigner[lang]}</p>
                                                </div>
                                                {receiptSig && <img src={receiptSig} alt="ลายเซ็น" className="h-12 object-contain" />}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* ======= ตัวเลือกในการจัดส่ง ======= */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-sm font-bold text-gray-700 mb-4">{t.shippingTitle[lang]}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(() => {
                            const SHIPPING_METHODS = storeShipping.filter(m => m.enabled).length > 0
                                ? storeShipping.filter(m => m.enabled).map(m => ({ id: m.id, name: m.name, price: m.price, logo: getShippingLogo(m.id) }))
                                : FALLBACK_SHIPPING;
                            
                            const selectedMethod = SHIPPING_METHODS.find(m => m.id === order.shippingMethod) || 
                                                 SHIPPING_METHODS.find(m => m.name.toLowerCase() === order.shippingMethod?.toLowerCase()) ||
                                                 { id: order.shippingMethod, name: order.shippingMethod || 'จัดส่งมาตรฐาน', price: 0, logo: getShippingLogo(order.shippingMethod || 'kerry') };

                            return SHIPPING_METHODS.map((method) => {
                                const isSelected = selectedMethod.id === method.id || selectedMethod.name === method.name;
                                return (
                                    <div 
                                        key={method.id || method.name} 
                                        className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                                            isSelected 
                                                ? "border-[#4267B2] bg-blue-50" 
                                                : "border-gray-200 bg-white opacity-60"
                                        }`}
                                    >
                                        <div className="mb-2">
                                            <ShippingLogoIcon name={method.id || method.name} size={60} />
                                        </div>
                                        <span className={`text-xs font-medium text-center ${isSelected ? "text-gray-800" : "text-gray-500"}`}>
                                            {method.name}
                                        </span>
                                        <span className={`text-xs font-bold mt-0.5 ${isSelected ? "text-green-600" : "text-gray-400"}`}>
                                            {method.price === 0 ? t.free[lang] : `฿${method.price}`}
                                        </span>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>

                {/* ======= รายละเอียดการชำระเงิน ======= */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-bold text-[#8B6914] text-center mb-4">{t.paymentDetails[lang]}</h2>

                    {/* Admin Note */}
                    {order.note && order.note.trim() !== '' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                            <div className="flex items-start gap-2">
                                <span className="text-amber-500 mt-0.5">📝</span>
                                <div>
                                    <h3 className="text-xs font-bold text-amber-800 mb-1">{lang === 'th' ? 'หมายเหตุจากร้านค้า' : 'Note from shop'}</h3>
                                    <p className="text-sm text-amber-700 whitespace-pre-wrap">{order.note}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Cart Items Dropdown */}
                    <button
                        onClick={() => setShowCart(!showCart)}
                        className="w-full flex items-center justify-between border border-gray-300 rounded px-4 py-3 mb-4 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        <span>{t.viewCart[lang]}</span>
                        {showCart ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showCart && (
                        <div className="border border-gray-200 rounded mb-4">
                            {order.items.length > 0 ? (
                                order.items.map((item, i) => (
                                    <div key={i} className={`flex gap-4 p-4 ${i < order.items.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                        {/* Product Image */}
                                        {item.image && (
                                            <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                                <img src={item.image} alt={item.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }} />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-800 font-medium">
                                                {item.name} {item.variant && !item.name.includes(item.variant) ? `[${item.variant}]` : ''} x {item.quantity}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                @ ฿{item.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div className="text-sm font-bold text-[#8B6914] flex-shrink-0">
                                            ฿{item.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-sm text-gray-400 text-center">{t.emptyCart[lang]}</div>
                            )}
                        </div>
                    )}

                    {/* Price Summary */}
                    <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                            <span className="text-gray-600">{t.price[lang]}</span>
                            <span className="text-[#8B6914] font-bold">
                                ฿{order.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-2">
                            <span className="font-bold text-gray-800">{t.total[lang]}</span>
                            <span className="font-bold text-[#8B6914]">
                                ฿{order.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ======= Payment Methods from Admin ======= */}
                <div className="bg-white rounded-lg shadow-sm p-6">

                    {/* โอนเงินผ่านธนาคาร */}
                    {paymentMethods.find(m => m.id === "bank")?.enabled && (
                        <>
                            <h2 className="text-base font-bold text-gray-700 text-center mb-4 flex items-center justify-center gap-2">
                                {t.bankTransfer[lang]}
                            </h2>

                            <div className="bg-gradient-to-r from-[#1a3a6b] to-[#2a5298] rounded-lg p-6 text-center mb-4">
                                <p className="text-white text-2xl font-bold mb-1">{t.bankTransferChannelLine1[lang]}</p>
                                <p className="text-white text-2xl font-bold">{t.bankTransferChannelLine2[lang]}</p>
                            </div>

                            {(() => {
                                const bank = banks.find(b => b.name === bankAccount.bankName) || banks[0];
                                return (
                                    <div style={{ background: bank.color }} className="rounded-lg p-5 flex items-center gap-4 mb-4 shadow-md">
                                        <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center flex-shrink-0 p-2 shadow-sm">
                                            <img src={bank.logo} alt={bank.name} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="text-white">
                                            <p className="text-xs opacity-90 mb-0.5">{t.bankPrefix[lang]} {bank.name}</p>
                                            <p className="text-sm font-medium mb-1">{t.accountName[lang]} : <span className="font-bold">{bankAccount.accountName}</span></p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-lg font-bold tracking-wider">{bankAccount.accountNumber}</p>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(bankAccount.accountNumber.replace(/-/g, ''))}
                                                    className="bg-white/20 hover:bg-white/30 text-white text-[10px] px-2 py-0.5 rounded transition-colors"
                                                >
                                                    {t.copyBtn[lang]}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="bg-gray-100 rounded-lg p-4 text-center mb-4">
                                <p className="text-sm text-gray-700 whitespace-pre-line">{t.transferInstructions[lang]}</p>
                            </div>
                            <p className="text-xs text-gray-500 text-center mb-4">{t.transferDeadline[lang]}</p>
                        </>
                    )}

                    {/* พร้อมเพย์ */}
                    {paymentMethods.find(m => m.id === "promptpay")?.enabled && (
                        <div className="mb-4">
                            <h2 className="text-base font-bold text-gray-700 text-center mb-4 flex items-center justify-center gap-2">
                                {t.promptPay[lang]}
                            </h2>
                            {promptPayQR && (
                                <div className="flex justify-center mb-3">
                                    <img src={promptPayQR} alt="PromptPay QR" className="max-w-xs rounded-lg border border-gray-200" />
                                </div>
                            )}
                            <div className="bg-gray-100 rounded-lg p-4 text-center">
                                <p className="text-sm text-gray-700">{t.scanQR[lang]}</p>
                            </div>
                        </div>
                    )}

                    {/* เก็บเงินปลายทาง */}
                    {paymentMethods.find(m => m.id === "cod")?.enabled && (
                        <div className="mb-4">
                            <h2 className="text-base font-bold text-gray-700 text-center mb-4 flex items-center justify-center gap-2">
                                {t.cod[lang]}
                            </h2>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                <p className="text-sm text-green-700">{t.codDesc[lang]}</p>
                            </div>
                        </div>
                    )}

                    {/* No payment methods */}
                    {!paymentMethods.some(m => m.enabled) && (
                        <div className="text-center text-sm text-gray-400 py-4">{t.noPayment[lang]}</div>
                    )}

                    {/* Upload Slip Section */}
                    <div className={`border rounded-lg p-5 mb-4 ${showSlipWarning && !slipAttached ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
                        <h3 className="text-sm font-bold text-gray-800 mb-3">{t.slipTitle[lang]}</h3>
                        <div className="flex flex-col items-center gap-2">
                            <label className="cursor-pointer bg-[#4267B2] text-white px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-[#365899] transition-colors">
                                {t.attachSlip[lang]}
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            </label>
                            {slipAttached ? (
                                <>
                                    <p className="text-xs text-green-600 font-medium flex items-center gap-1">✅ {slipName}</p>
                                    {slipPreview && <img src={slipPreview} alt="สลิป" className="max-w-xs max-h-48 rounded-lg border border-gray-200 mt-2" />}
                                </>
                            ) : (
                                <p className="text-[10px] text-gray-400">{t.fileSize[lang]}</p>
                            )}
                            {showSlipWarning && !slipAttached && (
                                <p className="text-sm text-red-500 font-medium mt-1">{t.slipRequired[lang]}</p>
                            )}
                        </div>
                    </div>

                    {/* Terms */}
                    <p className="text-[11px] text-gray-400 text-center mb-4">
                        {t.termsPrefix[lang]}<br />
                        <a href="#" className="text-[#4267B2] underline">{t.termsLink[lang]}</a>
                    </p>

                    {/* Submit Button */}
                    <button
                        onClick={() => {
                            if (!slipAttached) { setShowSlipWarning(true); return; }
                            handleUpload();
                        }}
                        disabled={uploading}
                        className={`w-full py-3.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${slipAttached
                            ? 'bg-[#4267B2] text-white hover:bg-[#365899]'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        <ShoppingCart className="w-4 h-4" />
                        {uploading ? t.submitting[lang] : t.submitBtn[lang]}
                    </button>

                    {/* Inline error message */}
                    {uploadError && (
                        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 text-center font-medium animate-pulse">
                            {uploadError}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
