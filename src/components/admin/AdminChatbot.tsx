"use client";

import { useState, useEffect, useCallback } from "react";
import { Trans } from "@/components/Trans";
import { useAuthStore } from "@/store/useAuthStore";
import Swal from 'sweetalert2';

// ─── AI Chatbot Management ───────────────────────────────────
const defaultBotConfig = {
    greeting: "สวัสดีค่ะ ยินดีต้อนรับสู่ร้านของเรา 🚗✨\nสนใจสินค้าตัวไหน สอบถามได้เลยค่ะ!",
    greetingOptions: ["ดูสินค้าทั้งหมด", "ติดต่อแอดมิน", "โปรโมชั่น"],
    carouselMainTitle: "Please select an option / กรุณาเลือกรายการ 👇",
    carouselMoreTitle: "More options / เพิ่มเติม ({number}) 👇",
    outOfHours: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "We are currently outside of business hours. I will contact you back as soon as possible 🙏" : "ขณะนี้อยู่นอกเวลาทำการค่ะ จะติดต่อกลับโดยเร็วที่สุดนะคะ 🙏"),
    orderConfirm: "ได้รับออเดอร์เรียบร้อยแล้วค่ะ! 🎉\nทีมงานจะตรวจสอบและยืนยันภายใน 30 นาทีค่ะ",
    isAutoReplyEnabled: true,
    isGreetingEnabled: true,
    isOutOfHoursEnabled: false,
    isOrderConfirmEnabled: true,
    faq: [
        { q: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "How much?" : "ราคาเท่าไหร่"), a: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Please chat with us to tell us the car model you want. I will offer you a price immediately." : "รบกวนทักแชทบอกรุ่นรถที่ต้องการนะคะ จะเสนอราคาให้ทันทีค่ะ 💰") },
        { q: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Can it be delivered nationwide?" : "ส่งได้ทั่วประเทศไหม"), a: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Can deliver all over the country! Free delivery when purchasing 1,000 baht 📦" : "ส่งได้ทั่วประเทศค่ะ! ส่งฟรีเมื่อซื้อครบ 1,000 บาท 📦") },
        { q: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Is there a guarantee?" : "มีรับประกันไหม"), a: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Quality guaranteed for 1 year. If there is a problem, replace it for a new one. ✅" : "รับประกันคุณภาพ 1 ปีค่ะ ถ้ามีปัญหาเปลี่ยนให้ใหม่เลยค่ะ ✅") },
        { q: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Can you install it yourself?" : "ติดเองได้ไหม"), a: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "You can install it yourself! There is a teaching clip included. Or you can have a technician install it." : "ติดเองได้ค่ะ! มีคลิปสอนติดให้ด้วย หรือจะให้ช่างติดก็ได้ค่ะ 🔧") },
    ],
    hours: { start: "09:00", end: "21:00" }
};

export default function AdminChatbot() {
    const { accessToken, connectedPage } = useAuthStore();
 
    const getAuthHeaders = useCallback((): Record<string, string> => {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (accessToken && accessToken !== 'demo_token') {
            headers['x-fb-token'] = accessToken;
        }
        if (connectedPage) {
            headers['x-page-id'] = connectedPage.id;
            headers['x-page-token'] = connectedPage.accessToken;
        }
        return headers;
    }, [accessToken, connectedPage]);
 
    const [config, setConfig] = useState<any>(defaultBotConfig);
    const [activeSection, setActiveSection] = useState<'greeting' | 'faq' | 'auto' | 'settings'>('greeting');
    const [saved, setSaved] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [newQ, setNewQ] = useState('');
    const [newA, setNewA] = useState('');
    
    // For Option Link/Replies
    const [newOption, setNewOption] = useState('');
    const [newOptionUrl, setNewOptionUrl] = useState('');
    const [newOptionImg, setNewOptionImg] = useState('');

    const [fbStatus, setFbStatus] = useState<{ connected: boolean, pageName: string | null, error: string | null }>({ connected: false, pageName: null, error: null });

    useEffect(() => {
        fetch('/api/shop/chatbot', { headers: getAuthHeaders() })
            .then(r => r.json())
            .then(data => {
                if (data.success && data.config) {
                    setConfig({ ...defaultBotConfig, ...data.config });
                }
                if (data.fbConnection) {
                    setFbStatus(data.fbConnection);
                }
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, []);

    const handleSave = async () => {
        try {
            const res = await fetch('/api/shop/chatbot', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ config })
            });
            const data = await res.json();
            if (data.success) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            } else {
                Swal.fire({ text: "บันทึกไม่สำเร็จ: " + data.error, icon: 'error' });
            }
        } catch (e: any) {
            Swal.fire({ text: "Error saving chatbot config: " + e.message, icon: 'error' });
        }
    };

    const addFAQ = () => {
        if (!newQ.trim() || !newA.trim()) return;
        setConfig((prev: any) => ({
            ...prev,
            faq: [...prev.faq, { q: newQ, a: newA }],
        }));
        setNewQ('');
        setNewA('');
    };

    const removeFAQ = (index: number) => {
        setConfig((prev: any) => ({
            ...prev,
            faq: prev.faq.filter((_: any, i: number) => i !== index),
        }));
    };

    const addOption = () => {
        if (!newOption.trim()) return;
        
        let newOpt: any = newOption.trim();
        if (newOptionUrl.trim().length > 0) {
            newOpt = { label: newOption.trim(), url: newOptionUrl.trim() }
        }

        setConfig((prev: any) => ({
            ...prev,
            greetingOptions: [...(prev.greetingOptions || []), newOpt]
        }));
        setNewOption('');
        setNewOptionUrl('');
    };

    const removeOption = (index: number) => {
        setConfig((prev: any) => ({
            ...prev,
            greetingOptions: (prev.greetingOptions || []).filter((_: any, i: number) => i !== index)
        }));
    };

    const editOption = (index: number) => {
        const opt = (config.greetingOptions || [])[index];
        const isString = typeof opt === 'string';
        setNewOption(isString ? opt : opt.label);
        setNewOptionUrl(isString ? '' : (opt.url || ''));
        setNewOptionImg(isString ? '' : (opt.imageUrl || ''));
        removeOption(index);
    };

    const sections = [
        { id: 'greeting' as const, icon: '👋', label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Welcome message/button" : "ข้อความต้อนรับ/ปุ่ม") },
        { id: 'faq' as const, icon: '❓', label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Frequently asked questions" : "คำถามที่พบบ่อย") },
        { id: 'auto' as const, icon: '🤖', label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Auto reply" : "ตอบอัตโนมัติ") },
        { id: 'settings' as const, icon: '⚙️', label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Set up" : "ตั้งค่า") },
    ];

    if (isLoading) return <div className="p-6 text-center text-gray-500">{<Trans th="กำลังโหลดการตั้งค่า..." en="Loading settings..." />}</div>;

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-200">
                    <span className="text-white text-xl">💬</span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{<Trans th="แชทบอท AI" en="AI chatbot" />}</h2>
                    <p className="text-xs text-gray-400">{<Trans th="ตั้งค่าข้อความต้อนรับ, ปุ่มตัวเลือกแบบลิ้งก์ และ FAQ" en="Set up welcome messages, link radio buttons, and FAQs." />}</p>
                </div>
                {saved && (
                    <span className="ml-auto px-4 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-xl animate-pulse">
                        <Trans th="✅ บันทึกแล้ว!" en="✅ Saved!" />
                    </span>
                )}
            </div>

            {/* Agent Connection Status */}
            <div className="mb-6">
                {fbStatus.connected ? (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl shadow-sm">
                        <span className="text-xl">🟢</span>
                        <div>
                            <p className="font-bold text-sm">{<Trans th="Agent เชื่อมต่อสมบูรณ์" en="Agent connected successfully" />}</p>
                            <p className="text-xs opacity-80">{<Trans th="กำลังทำงานบนเพจ: " en="Working on page: " />}{fbStatus.pageName}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-sm">
                        <span className="text-xl">🔴</span>
                        <div>
                            <p className="font-bold text-sm">{<Trans th="Agent ขาดการเชื่อมต่อ" en="Agent disconnected" />}</p>
                            <p className="text-xs opacity-80">{fbStatus.error}</p>
                        </div>
                        <button onClick={() => window.location.reload()} className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition-colors">
                            <Trans th="เช็คอีกครั้ง" en="Check again" />
                        </button>
                    </div>
                )}
            </div>

            {/* Section Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
                {sections.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                            activeSection === s.id
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-200'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
                        }`}
                    >
                        <span>{s.icon}</span> {s.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Editor */}
                <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
                    {activeSection === 'greeting' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-800">{<Trans th="👋 ข้อความต้อนรับ" en="👋 Welcome message" />}</h3>
                            <p className="text-xs text-gray-400">{<Trans th="ข้อความแรกที่จะถูกส่งเมื่อลูกค้าเริ่มทักแชทมา" en="The first message will be sent when a customer starts chatting." />}</p>
                            <textarea
                                value={config.greeting}
                                onChange={e => setConfig((prev: any) => ({ ...prev, greeting: e.target.value }))}
                                rows={4}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                            />

                            <div className="flex flex-wrap gap-2 mt-2">
                                <p className="w-full text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1"><Trans th="เทมเพลตด่วน" en="Quick Templates" /></p>
                                {[
                                    { label: "เทมเพลต EN (อัดวีดีโอ)", options: ["Browse Products", "Promotions", "Texture", "Contact Agent", "Install Guide", "Reviews"] },
                                    { label: "เทมเพลต TH (ภาษาไทย)", options: ["ดูสินค้าทั้งหมด", "โปรโมชั่น", "เนื้อฟิล์ม", "ติดต่อเจ้าหน้าที่", "วิธีติดตั้ง", "รีวิวลูกค้า"] }
                                ].map((tmpl, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => {
                                            setConfig((prev: any) => ({
                                                ...prev,
                                                greeting: tmpl.label,
                                                greetingOptions: tmpl.options
                                            }));
                                        }}
                                        className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                                    >
                                        {tmpl.label}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-6 border-t pt-4">
                                <h4 className="text-sm font-bold text-gray-800 mb-2">{<Trans th="ปุ่มตัวเลือก (Quick Replies / URL Links / รูปภาพโปรโมชั่น)" en="Options buttons (Quick Replies / URL Links / Promotional Images)" />}</h4>
                                
                                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">{<Trans th="หัวข้อการ์ดแรกสุด" en="First Card Title" />}</label>
                                        <input
                                            value={config.carouselMainTitle || defaultBotConfig.carouselMainTitle}
                                            onChange={e => setConfig((prev: any) => ({ ...prev, carouselMainTitle: e.target.value }))}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">{<Trans th="หัวข้อการ์ดถัดไป (ใส่ {number} แทนตัวเลขลำดับได้)" en="Next Cards Title (Use {number} for sequence)" />}</label>
                                        <input
                                            value={config.carouselMoreTitle || defaultBotConfig.carouselMoreTitle}
                                            onChange={e => setConfig((prev: any) => ({ ...prev, carouselMoreTitle: e.target.value }))}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        />
                                    </div>
                                </div>

                                <p className="text-xs text-gray-400 mb-3">
                                    <Trans th="สร้างปุ่มเพื่อให้ลูกค้าคลิกเลือกดูข้อมูลง่ายๆ" en="Create buttons for customers to easily click and view information." /> <br/>
                                    <span className="text-red-500">{<Trans th={`*ถ้าใส่ "รูปภาพ" ระบบจะแสดงผลเป็นแบบการ์ดสไลด์ (Carousel) สวยงาม! ส่งได้สูงสุด 10 ปุ่ม (อิงตามลิมิต Facebook)`} en={`*If you enter a 'picture' the system will display it as a beautiful carousel! Send up to 10 buttons (based on Facebook limits)`} />}</span><br/>
                                    <span className="text-orange-500">{<Trans th={`*ถ้าใส่เฉพาะ "ลิ้งก์เว็บ" ไม่เกิน 3 ปุ่ม จะแสดงผลควบคู่กับข้อความต้อนรับ หากเกิน 3 ปุ่ม ระบบจะแสดงเป็นเมนูการ์ดให้แบบอัตโนมัติ (รองรับสูงสุด 30 ปุ่ม)`} en={`*If fewer than 3 'web link' options are added, they will attach to the welcome text. If more are added, the system automatically converts them to card menus.`} />}</span>
                                </p>
                                <div className="flex flex-col gap-2 mb-3">
                                    {(config.greetingOptions || []).map((opt: any, i: number) => {
                                        const isString = typeof opt === 'string';
                                        const label = isString ? opt : opt.label;
                                        const url = isString ? '' : opt.url;
                                        const imageUrl = isString ? '' : opt.imageUrl;
                                        return (
                                            <div key={i} className="flex flex-col gap-2 bg-blue-50 text-blue-600 border border-blue-200 px-3 py-2 rounded-xl text-sm w-full">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col flex-1 overflow-hidden">
                                                        <span className="font-bold">{label}</span>
                                                        {url && <span className="text-[10px] text-blue-400 truncate">🔗 {url}</span>}
                                                    </div>
                                                    <div className="flex items-center">
                                                        <button onClick={() => editOption(i)} className="hover:text-blue-800 text-blue-500 font-bold px-2 py-1 bg-white/50 rounded-md transition-colors mr-1">✎</button>
                                                        <button onClick={() => removeOption(i)} className="hover:text-red-500 text-red-400 font-bold px-2 py-1 bg-white/50 rounded-md transition-colors">✕</button>
                                                    </div>
                                                </div>
                                                {imageUrl && (
                                                    <div className="relative w-full h-24 rounded-lg overflow-hidden border border-blue-100 bg-white">
                                                        <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                <div className="flex flex-col gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                                    <h4 className="text-xs font-bold text-gray-600">{<Trans th="➕ เพิ่มปุ่มใหม่" en="➕ Add new button" />}</h4>
                                    <input
                                        value={newOption}
                                        onChange={e => setNewOption(e.target.value)}
                                        placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "1. Enter the button name (what the button will say) **Must be entered" : "1. ใส่ชื่อปุ่ม (สิ่งที่ปุ่มจะบอก) **ต้องใส่")}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        onKeyDown={e => e.key === 'Enter' && addOption()}
                                    />
                                    <input
                                        value={newOptionUrl}
                                        onChange={e => setNewOptionUrl(e.target.value)}
                                        placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "2. Web link (if any) - press the button and go to the web page." : "2. ลิ้งก์เว็บ (ถ้ามี) ให้ปุ่มกดแล้วไปหน้าเว็บ")}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        onKeyDown={e => e.key === 'Enter' && addOption()}
                                    />
                                    <div className="flex flex-col gap-1">
                                        <div className="flex gap-2">
                                            <input
                                                value={newOptionImg}
                                                onChange={e => setNewOptionImg(e.target.value)}
                                                placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "3. Image link (paste the image URL from ImgBB or Facebook)" : "3. ลิ้งก์รูปภาพ (นำ URL รูปจาก ImgBB หรือ Facebook มาแปะ)")}
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                                onKeyDown={e => e.key === 'Enter' && addOption()}
                                            />
                                            <button 
                                                onClick={() => window.open('https://imgbb.com/', 'ImgBB', 'width=800,height=600,scrollbars=yes')} 
                                                className={`whitespace-nowrap px-3 py-2 rounded-lg text-xs font-bold transition-all bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200`}
                                            >
                                                <Trans th="☁️ อัปโหลดรูป (ImgBB)" en="☁️ Upload photo (ImgBB)" />
                                                                                            </button>
                                        </div>
                                        <p className="text-[10px] text-gray-400 px-1">
                                            <Trans th={`*เนื่องจากเว็บไม่อนุญาตให้ฝังหน้าเว็บ กดปุ่มด้านขวาเพื่อเปิดหน้าต่างอัปโหลด อัปโหลดเสร็จก็อปปี้ "ลิ้งก์ตรง (Direct Link)" หรือ URL ของรูปมาแปะได้เลยครับ`} en={`*Because the website does not allow embedding web pages. Press the right button to open the upload window. After uploading, copy and paste the 'Direct Link' or URL of the image.`} />
                                                                                    </p>
                                    </div>
                                    <button onClick={() => {
                                        if (!newOption.trim()) return;
                                        let newOpt: any = newOption.trim();
                                        const imgUrl = newOptionImg;
                                        if (newOptionUrl.trim().length > 0 || imgUrl.trim().length > 0) {
                                            newOpt = { label: newOption.trim(), url: newOptionUrl.trim(), imageUrl: imgUrl.trim() };
                                        }
                                        setConfig((prev: any) => ({
                                            ...prev,
                                            greetingOptions: [...(prev.greetingOptions || []), newOpt]
                                        }));
                                        setNewOption('');
                                        setNewOptionUrl('');
                                        setNewOptionImg('');
                                    }} className="mt-2 w-full py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors">
                                        <Trans th="เพิ่มปุ่ม" en="Add a button" />
                                                                            </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'faq' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-800">{<Trans th="❓ คำถามที่พบบ่อย (" en="❓ Frequently asked questions (" />}{config.faq.length})</h3>
                            <p className="text-xs text-gray-400">{<Trans th="บอทจะตอบอัตโนมัติหากลูกค้าพิมพ์หรือกดปุ่มที่ตรงกับคำถามเหล่านี้" en="The bot will automatically answer if the customer types or presses a button corresponding to one of these questions." />}</p>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                {config.faq.map((item: any, i: number) => (
                                    <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100 relative group">
                                        <div className="pr-6">
                                            <p className="text-sm font-bold text-gray-800 mb-1 leading-snug">Q: {item.q}</p>
                                            <p className="text-xs text-gray-600 leading-snug">A: {item.a}</p>
                                        </div>
                                        <button onClick={() => removeFAQ(i)} className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-red-100 text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t pt-4">
                                <p className="text-sm font-medium text-gray-600 mb-2">{<Trans th="➕ เพิ่มคำถาม-ตอบใหม่" en="➕ Add new questions and answers." />}</p>
                                <input
                                    value={newQ}
                                    onChange={e => setNewQ(e.target.value)}
                                    placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Questions (what the customer says/buttons)..." : "คำถาม (สิ่งที่ลูกค้าพูด/กดปุ่ม)...")}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                />
                                <textarea
                                    value={newA}
                                    onChange={e => setNewA(e.target.value)}
                                    placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Bot's answer..." : "คำตอบของบอท...")}
                                    rows={2}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                />
                                <button onClick={addFAQ} className="px-4 py-2 bg-blue-500 text-white text-sm rounded-xl hover:bg-blue-600 transition-colors">
                                    <Trans th="บันทึกลงรายการ" en="Save to list" />
                                                                    </button>
                            </div>
                        </div>
                    )}

                    {activeSection === 'auto' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-800">{<Trans th="🤖 ระบบเปิด-ปิดบอท" en="🤖 Bot on-off system" />}</h3>
                            <div className="space-y-3">
                                {[
                                    { key: 'isAutoReplyEnabled', label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Instant automatic reply" : "ตอบกลับอัตโนมัติทันที"), desc: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Respond to customer messages within 1 second." : "ตอบข้อความลูกค้าภายใน 1 วินาที") },
                                    { key: 'isGreetingEnabled', label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Send a welcome message" : "ส่งข้อความต้อนรับ"), desc: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Send a greeting message when a customer starts chatting." : "ส่งข้อความทักทายเมื่อลูกค้าเริ่มแชท") },
                                    { key: 'isOutOfHoursEnabled', label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Out of hours notification" : "แจ้งเตือนนอกเวลา"), desc: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Notify customers when outside of business hours" : "แจ้งลูกค้าเมื่ออยู่นอกเวลาทำการ") },
                                    { key: 'isOrderConfirmEnabled', label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Automatic order confirmation" : "ยืนยันออเดอร์อัตโนมัติ"), desc: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Send a confirmation message when you receive your order." : "ส่งข้อความยืนยันเมื่อได้รับออเดอร์") },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">{item.label}</p>
                                            <p className="text-xs text-gray-400">{item.desc}</p>
                                        </div>
                                        <div 
                                            onClick={() => setConfig((prev: any) => ({ ...prev, [item.key]: !prev[item.key] }))}
                                            className={`w-12 h-7 rounded-full relative cursor-pointer transition-colors ${(config as any)[item.key] ? 'bg-green-500' : 'bg-gray-300'}`}>
                                            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${(config as any)[item.key] ? 'left-5.5' : 'left-0.5'}`}
                                                style={{ left: (config as any)[item.key] ? '22px' : '2px' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 pt-4 border-t space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-2">{<Trans th="ข้อความนอกเวลาทำการ" en="Messages outside business hours" />}</label>
                                    <textarea
                                        value={config.outOfHours}
                                        onChange={e => setConfig((prev: any) => ({ ...prev, outOfHours: e.target.value }))}
                                        rows={2}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-2">{<Trans th="ข้อความยืนยันออเดอร์อัตโนมัติ" en="Automatic order confirmation message" />}</label>
                                    <textarea
                                        value={config.orderConfirm}
                                        onChange={e => setConfig((prev: any) => ({ ...prev, orderConfirm: e.target.value }))}
                                        rows={2}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'settings' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-800">{<Trans th="⚙️ ตั้งค่าทั่วไป" en="⚙️ General settings" />}</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-2">{<Trans th="เวลาทำการทำการร้านค้า (ชั่วโมงแอดมิน)" en="Store business hours (Admin hours)" />}</label>
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="time" 
                                            value={config.hours?.start || "09:00"} 
                                            onChange={e => setConfig((prev: any) => ({ ...prev, hours: { start: e.target.value, end: prev.hours?.end || "18:00"} }))}
                                            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-blue-500/30 focus:border-blue-300" 
                                        />
                                        <span className="text-gray-400">{<Trans th="ถึง" en="to" />}</span>
                                        <input 
                                            type="time" 
                                            value={config.hours?.end || "18:00"} 
                                            onChange={e => setConfig((prev: any) => ({ ...prev, hours: { start: prev.hours?.start || "09:00", end: e.target.value} }))}
                                            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-blue-500/30 focus:border-blue-300" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <button onClick={handleSave} className="w-full mt-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-xl shadow-md shadow-blue-200 hover:shadow-lg transition-all active:scale-[0.98]">
                        <Trans th="💾 บันทึกการตั้งค่าแชทบอท" en="💾 Save chatbot settings." />
                                            </button>
                </div>

                {/* Preview */}
                <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">📱</span>
                        <Trans th="ตัวอย่างบทสนทนา (Live Preview)" en="Example conversation (Live Preview)" />
                                            </h3>
                    <div className="flex-1 flex justify-center items-start pt-4 w-full">
                        <div className="bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl w-full max-w-[320px] h-[640px] border-4 border-gray-800 relative ring-1 ring-gray-900 shrink-0">
                            <div className="bg-white rounded-[2rem] overflow-hidden h-full flex flex-col relative z-10">
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center gap-3">
                                    <span className="text-white text-lg font-light">‹</span>
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex-shrink-0" />
                                    <span className="text-white text-sm font-semibold flex-1">{connectedPage?.name || <Trans th="ร้านค้าของฉัน" en="My Shop" />}</span>
                                </div>
                                
                                <div className="flex-1 bg-gray-50/50 p-4 flex flex-col justify-end gap-3 pb-[80px] overflow-y-auto">
                                    {/* System Date */}
                                    <div className="flex justify-center mb-1 mt-auto">
                                        <span className="text-[10px] text-gray-400 font-medium bg-white/50 px-2 py-0.5 rounded-full">{<Trans th="10:00 น." en="10:00 a.m." />}</span>
                                    </div>
                                    
                                    {/* User message (say hi) */}
                                    <div className="flex justify-end">
                                        <div className="bg-blue-500 text-white px-3 py-2 rounded-2xl rounded-br-sm max-w-[85%] text-xs shadow-sm">
                                            <Trans th="สวัสดีครับ สนใจสินค้าครับ" en="Hello, I am interested in the product." />
                                                                                    </div>
                                    </div>

                                    {/* Bot greeting */}
                                    {config.isGreetingEnabled !== false && (
                                        <div className="flex items-end gap-2 mt-1">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex-shrink-0 mb-1 flex items-center justify-center">
                                                <span className="text-[10px] text-white">🤖</span>
                                            </div>
                                            <div className="flex flex-col gap-1.5 max-w-[85%]">
                                                <div className="bg-white px-3 py-2.5 rounded-2xl rounded-bl-sm border border-gray-100 shadow-sm">
                                                    <p className="text-xs text-gray-800 whitespace-pre-wrap">{config.greeting}</p>
                                                </div>
                                                
                                                {/* Options / Buttons preview */}
                                                {(config.greetingOptions || []).length > 0 && (
                                                    <div className="flex flex-col gap-1.5 w-full">
                                                        {(config.greetingOptions || []).map((opt: any, i: number) => {
                                                            const isString = typeof opt === 'string';
                                                            const label = isString ? opt : opt.label;
                                                            return (
                                                                <div key={i} className="bg-white border text-center border-blue-200 text-blue-600 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm cursor-pointer hover:bg-blue-50 active:bg-blue-100 transition-colors w-full truncate">
                                                                    {label}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="absolute bottom-0 w-full h-[60px] border-t border-gray-100 bg-white flex flex-col justify-center px-4">
                                    <div className="w-full h-9 bg-gray-100 rounded-full flex items-center px-4">
                                        <span className="text-gray-400 text-xs text-center w-full">{<Trans th={`เขียนว่า "สวัสดี" ปุ๊บ บอทจะตอบปั๊บ...`} en={`Write 'Hello' and the bot will reply right away...`} />}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
