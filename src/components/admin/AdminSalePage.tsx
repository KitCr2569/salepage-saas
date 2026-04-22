"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, Eye, Image, Type, Palette, Link2, Phone, MessageCircle, Shield, Upload, X, Check } from "lucide-react";
import { useSettingsStore, type BannerSlide } from "@/store/useSettingsStore";
import { useShopStore } from "@/store/useShopStore";
import { useAuthStore } from "@/store/useAuthStore";
import { SALE_PAGE_THEMES } from "@/lib/themes";
import { Trans } from "@/components/Trans";
import Swal from 'sweetalert2';

export default function AdminSalePage() {
    const { shopConfig } = useShopStore();
    const connectedPage = useAuthStore((s) => s.connectedPage);
    const {
        lineUrl, setLineUrl,
        phoneNumber, setPhoneNumber,
        refundPolicyUrl, setRefundPolicyUrl,
        salePageTheme, setSalePageTheme,
        bannerSlides, setBannerSlides,
    } = useSettingsStore();

    // Local state for editing
    const [shopDesc, setShopDesc] = useState("ร้านขายสติ๊กเกอร์กันรอยกล้องและอุปกรณ์ คุณภาพระดับพรีเมียม");
    const [localLineUrl, setLocalLineUrl] = useState(lineUrl);
    const [localPhone, setLocalPhone] = useState(phoneNumber);
    const [localRefundUrl, setLocalRefundUrl] = useState(refundPolicyUrl);
    const [saved, setSaved] = useState(false);
    const [localSlides, setLocalSlides] = useState<BannerSlide[]>(bannerSlides);
    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null]);

    useEffect(() => {
        setLocalLineUrl(lineUrl);
        setLocalPhone(phoneNumber);
        setLocalRefundUrl(refundPolicyUrl);
        setLocalSlides(bannerSlides);
    }, [lineUrl, phoneNumber, refundPolicyUrl, bannerSlides]);

    const handleSave = async () => {
        setLineUrl(localLineUrl);
        setPhoneNumber(localPhone);
        setRefundPolicyUrl(localRefundUrl);
        setBannerSlides(localSlides);
        
        try {
            const currentState = useSettingsStore.getState();
            await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(currentState),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error("Failed to save to db:", err);
        }
    };

    const handlePreview = () => {
        handleSave();
        const pageId = connectedPage?.id || process.env.NEXT_PUBLIC_FB_PAGE_ID || "";
        setTimeout(() => window.open(`/${pageId}`, "_blank"), 200);
    };

    const handleSlideUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            Swal.fire({ text: "ไฟล์ต้องมีขนาดไม่เกิน 5MB", icon: 'info' });
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;
            const newSlides = [...localSlides];
            newSlides[index] = { ...newSlides[index], image: result };
            setLocalSlides(newSlides);
        };
        reader.readAsDataURL(file);
    };

    const handleSlideTextChange = (index: number, text: string) => {
        const newSlides = [...localSlides];
        newSlides[index] = { ...newSlides[index], text };
        setLocalSlides(newSlides);
    };

    const handleRemoveSlide = (index: number) => {
        const newSlides = [...localSlides];
        newSlides[index] = { image: null, text: "" };
        setLocalSlides(newSlides);
        const ref = fileInputRefs.current[index];
        if (ref) ref.value = '';
    };

    const handleThemeSelect = (themeId: string) => {
        setSalePageTheme(themeId);
    };

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-pink-500 flex items-center gap-2">
                    <FileText className="w-6 h-6" />
                    <Trans th="จัดการเซลเพจ" en="Manage sales pages" />
                                    </h1>
                <div className="flex items-center gap-2">
                    {saved && (
                        <span className="text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-lg font-medium animate-pulse">
                            <Trans th="✅ บันทึกแล้ว" en="✅ Saved" />
                                                    </span>
                    )}
                    <button
                        onClick={handleSave}
                        className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-5 py-2 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                    >
                        <Trans th="💾 บันทึก" en="💾 Save" />
                                            </button>
                    <button
                        onClick={handlePreview}
                        className="bg-gradient-to-r from-orange-400 to-pink-400 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                    >
                        <Eye className="w-4 h-4" />
                        <Trans th="ดูตัวอย่าง" en="Preview" />
                                            </button>
                </div>
            </div>

            {/* Header Settings */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100 mb-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Type className="w-5 h-5 text-pink-400" />
                    <Trans th="ตั้งค่าส่วนหัว" en="Set the header" />
                                    </h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">{<Trans th="ชื่อร้านค้า" en="Store name" />}</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={shopConfig.shopName}
                                disabled
                                className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-400 outline-none cursor-not-allowed"
                            />
                            <span className="text-[10px] text-blue-500 bg-blue-50 px-2 py-1 rounded-lg whitespace-nowrap">{<Trans th="อัตโนมัติจากเพจที่เชื่อมต่อ" en="automatically from the connected page" />}</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">{<Trans th="คำอธิบายร้าน" en="Shop description" />}</label>
                        <textarea
                            value={shopDesc}
                            onChange={(e) => setShopDesc(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300 resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* Social & Contact Links */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100 mb-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-pink-400" />
                    <Trans th="ช่องทางติดต่อ" en="Contact channels" />
                                    </h2>
                <p className="text-xs text-gray-400 mb-4">{<Trans th="ลิงก์เหล่านี้จะแสดงใน Footer ของหน้าเซลเพจ" en="These links will be displayed in the footer of the sales page." />}</p>
                <div className="space-y-4">
                    {/* Facebook */}
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            Facebook Page
                        </label>
                        <div className="flex items-center gap-2">
                            <input type="text" value={`https://www.facebook.com/${connectedPage?.id || process.env.NEXT_PUBLIC_FB_PAGE_ID || ''}`} disabled className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-400 outline-none cursor-not-allowed" />
                            <span className="text-[10px] text-blue-500 bg-blue-50 px-2 py-1 rounded-lg whitespace-nowrap">{<Trans th="อัตโนมัติจากเพจที่เชื่อมต่อ" en="automatically from the connected page" />}</span>
                        </div>
                    </div>
                    {/* Messenger */}
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                            <MessageCircle className="w-3.5 h-3.5 text-purple-500" />
                            Messenger
                        </label>
                        <div className="flex items-center gap-2">
                            <input type="text" value={`https://m.me/${connectedPage?.id || process.env.NEXT_PUBLIC_FB_PAGE_ID || ''}`} disabled className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-400 outline-none cursor-not-allowed" />
                            <span className="text-[10px] text-purple-500 bg-purple-50 px-2 py-1 rounded-lg whitespace-nowrap">{<Trans th="อัตโนมัติจากเพจที่เชื่อมต่อ" en="automatically from the connected page" />}</span>
                        </div>
                    </div>
                    {/* LINE */}
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-[#06C755]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                            </svg>
                            LINE URL
                        </label>
                        <input type="text" value={localLineUrl} onChange={(e) => setLocalLineUrl(e.target.value)} placeholder="https://line.me/ti/p/xxxxx" className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-300" />
                    </div>
                    {/* Phone */}
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-orange-500" />
                            <Trans th="เบอร์โทรศัพท์" en="telephone number" />
                                                    </label>
                        <input type="text" value={localPhone} onChange={(e) => setLocalPhone(e.target.value)} placeholder="+66891234567" className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-300" />
                        <p className="text-[10px] text-gray-400 mt-1">{<Trans th="ใส่เบอร์พร้อมรหัสประเทศ เช่น +66891234567" en="Enter the number along with the country code, such as +66891234567" />}</p>
                    </div>
                </div>
            </div>

            {/* Refund Policy */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100 mb-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-pink-400" />
                    <Trans th="นโยบายการคืนเงิน" en="Refund Policy" />
                                    </h2>
                <p className="text-xs text-gray-400 mb-3">{<Trans th={`ลิงก์ "เงื่อนไขและนโยบายการคืนเงิน" ที่แสดงใน Footer`} en={`'Refund Terms and Policy' link displayed in Footer`} />}</p>
                <input type="text" value={localRefundUrl} onChange={(e) => setLocalRefundUrl(e.target.value)} placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "https://example.com/refund-policy or /refund" : "https://example.com/refund-policy หรือ /refund")} className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300" />
                <p className="text-[10px] text-gray-400 mt-1">{<Trans th="ถ้าเว้นว่างไว้ จะลิงก์ไปที่ # (ไม่มีหน้านโยบาย)" en="If left blank, it will link to # (no policy page)." />}</p>
            </div>

            {/* Theme Settings */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100 mb-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-pink-400" />
                    <Trans th="ธีมสี" en="color theme" />
                                    </h2>
                <p className="text-xs text-gray-400 mb-4">{<Trans th="เลือกธีมสีที่จะแสดงบนหน้าเซลเพจ กดบันทึกเพื่อใช้งาน" en="Choose a color theme to display on the sales page. Press save to use." />}</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {SALE_PAGE_THEMES.map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => handleThemeSelect(theme.id)}
                            className={`relative p-3 rounded-xl border-2 transition-all ${salePageTheme === theme.id
                                    ? "border-pink-400 shadow-lg scale-[1.02]"
                                    : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                                }`}
                        >
                            {/* Theme preview mini */}
                            <div className="w-full aspect-[4/3] rounded-lg mb-2 overflow-hidden relative" style={{ backgroundColor: theme.preview.bg }}>
                                {/* Mini header bar */}
                                <div className="h-2 w-full" style={{ backgroundColor: theme.preview.accent, opacity: 0.8 }} />
                                {/* Mini content blocks */}
                                <div className="p-1.5 space-y-1">
                                    <div className="h-1.5 w-3/4 rounded-full" style={{ backgroundColor: theme.preview.text, opacity: 0.3 }} />
                                    <div className="flex gap-1">
                                        <div className="h-3 w-3 rounded" style={{ backgroundColor: theme.preview.accent, opacity: 0.4 }} />
                                        <div className="h-3 w-3 rounded" style={{ backgroundColor: theme.preview.accent, opacity: 0.4 }} />
                                        <div className="h-3 w-3 rounded" style={{ backgroundColor: theme.preview.accent, opacity: 0.4 }} />
                                    </div>
                                </div>
                            </div>
                            {/* Selected check */}
                            {salePageTheme === theme.id && (
                                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center shadow-md">
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                            )}
                            <p className="text-[10px] text-gray-600 text-center font-medium truncate">{theme.name}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Banner Slides */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100">
                <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <Image className="w-5 h-5 text-pink-400" />
                    <Trans th="แบนเนอร์สไลด์ (3 ภาพ)" en="Slide banner (3 images)" />
                                    </h2>
                <p className="text-xs text-gray-400 mb-4">{<Trans th="อัปโหลดรูปแบนเนอร์ได้สูงสุด 3 ภาพ พร้อมข้อความประกอบ จะแสดงเป็นสไลด์อัตโนมัติบนหน้าเซลเพจ" en="Upload up to 3 banner images with accompanying text. It will be displayed as an automatic slide on the sales page." />}</p>
                <div className="space-y-4">
                    {localSlides.map((slide, index) => (
                        <div key={index} className="border border-pink-100 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center text-xs font-bold">{index + 1}</span>
                                <span className="text-sm font-medium text-gray-700"><Trans th="สไลด์ที่" en="Slide that" /> {index + 1}</span>
                                {slide.image && (
                                    <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{<Trans th="มีรูปแล้ว" en="I have a picture." />}</span>
                                )}
                            </div>
                            <input
                                ref={(el) => { fileInputRefs.current[index] = el; }}
                                type="file"
                                accept="image/jpeg,image/png,image/gif"
                                className="hidden"
                                onChange={(e) => handleSlideUpload(index, e)}
                            />
                            {slide.image ? (
                                <div className="relative mb-3">
                                    <img
                                        src={slide.image}
                                        alt={`Banner ${index + 1}`}
                                        className="w-full h-32 object-cover rounded-lg"
                                    />
                                    <button
                                        onClick={() => handleRemoveSlide(index)}
                                        className="absolute top-1.5 right-1.5 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => fileInputRefs.current[index]?.click()}
                                        className="absolute bottom-1.5 left-1.5 text-[10px] text-white bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg hover:bg-black/70 flex items-center gap-1"
                                    >
                                        <Upload className="w-3 h-3" /> <Trans th="เปลี่ยนรูป" en="change shape" />
                                                                            </button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => fileInputRefs.current[index]?.click()}
                                    className="border-2 border-dashed border-pink-200 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-pink-50 transition-colors cursor-pointer mb-3"
                                >
                                    <Upload className="w-6 h-6 text-pink-300 mb-1" />
                                    <p className="text-xs text-gray-500">{<Trans th="คลิกเพื่ออัปโหลดรูป" en="Click to upload photo." />}</p>
                                    <p className="text-[10px] text-gray-400">{<Trans th="JPG, PNG, GIF ไม่เกิน 5MB" en="JPG, PNG, GIF not more than 5MB" />}</p>
                                </div>
                            )}
                            <div>
                                <label className="text-[10px] font-medium text-gray-400 mb-1 block">{<Trans th="ข้อความบนแบนเนอร์ (ไม่บังคับ)" en="Banner text (optional)" />}</label>
                                <input
                                    type="text"
                                    value={slide.text}
                                    onChange={(e) => handleSlideTextChange(index, e.target.value)}
                                    placeholder={`เช่น โปรโมชั่นสุดพิเศษ ลด 50%`}
                                    className="w-full px-3 py-2 bg-pink-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-300"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
