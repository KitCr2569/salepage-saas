"use client";

import { CreditCard, ToggleLeft, ToggleRight, Upload, Image, X, Save, FileText, Phone, Mail, MapPin, Pencil, RotateCcw } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { banks } from "@/data";
import { Trans } from "@/components/Trans";
import {
    ORDER_CONFIRMATION,
    PAYMENT_CONFIRMATION,
    TRACKING_BUTTON_MSG,
    AUTO_CANCEL_MSG,
    ADMIN_PAYMENT_NOTIFICATION,
    ADDRESS_UPDATE_CONFIRM,
    FOLLOW_UP_REMINDER,
    CHECKOUT_ORDER_SUMMARY,
    PAY_ORDER_SUMMARY,
} from "@/lib/message-templates";

const DEFAULT_SHIPPING_NOTIFY = `📦 แจ้งจัดส่งสินค้า
────────────────
🧾 ออเดอร์: #{orderNumber}
👤 ชื่อ: {customerName}

🚚 จัดส่งโดย: {shippingProvider}
📦 เลขพัสดุ: {trackingNumber}
🔍 ติดตามพัสดุ: {trackingUrl}
────────────────
ขอบคุณที่สั่งซื้อสินค้านะครับ 🙏
หากมีข้อสงสัย ทักแชทได้เลยครับ`;

type SubTab = "payment" | "settings";

export default function AdminPayment() {
    const [activeSubTab, setActiveSubTab] = useState<SubTab>("payment");

    // Use shared store for payment methods, bank, transfer, etc.
    const methods = useSettingsStore((s) => s.paymentMethods);
    const toggleMethod = useSettingsStore((s) => s.togglePayment);
    const bankAccount = useSettingsStore((s) => s.bankAccount);
    const setBankAccount = useSettingsStore((s) => s.setBankAccount);
    const transferImage = useSettingsStore((s) => s.transferImage);
    const setTransferImage = useSettingsStore((s) => s.setTransferImage);
    const transferInfo = useSettingsStore((s) => s.transferInfo);
    const setTransferInfo = useSettingsStore((s) => s.setTransferInfo);
    const allowCancel = useSettingsStore((s) => s.allowCancelPayment);
    const setAllowCancel = useSettingsStore((s) => s.setAllowCancelPayment);
    const promptPayQR = useSettingsStore((s) => s.promptPayQR);
    const setPromptPayQR = useSettingsStore((s) => s.setPromptPayQR);

    // Settings tab state - persisted in store
    const orderFieldsEnabled = useSettingsStore((s) => s.orderFieldsEnabled);
    const setOrderFieldsEnabled = useSettingsStore((s) => s.setOrderFieldsEnabled);
    const addressRequired = useSettingsStore((s) => s.addressRequired);
    const setAddressRequired = useSettingsStore((s) => s.setAddressRequired);
    const emailRequired = useSettingsStore((s) => s.emailRequired);
    const setEmailRequired = useSettingsStore((s) => s.setEmailRequired);
    const phoneRequired = useSettingsStore((s) => s.phoneRequired);
    const setPhoneRequired = useSettingsStore((s) => s.setPhoneRequired);
    const phoneHomeNumber = useSettingsStore((s) => s.phoneHomeNumber);
    const setPhoneHomeNumber = useSettingsStore((s) => s.setPhoneHomeNumber);
    const phonePhoneNumber = useSettingsStore((s) => s.phonePhoneNumber);
    const setPhonePhoneNumber = useSettingsStore((s) => s.setPhonePhoneNumber);
    const receiptEnabled = useSettingsStore((s) => s.receiptEnabled);
    const setReceiptEnabled = useSettingsStore((s) => s.setReceiptEnabled);
    const receiptName = useSettingsStore((s) => s.receiptName);
    const setReceiptName = useSettingsStore((s) => s.setReceiptName);
    const signatureImage = useSettingsStore((s) => s.receiptSignature);
    const setSignatureImage = useSettingsStore((s) => s.setReceiptSignature);
    const signatureInputRef = useRef<HTMLInputElement>(null);
    const customerEditAddress = useSettingsStore((s) => s.customerEditAddress);
    const setCustomerEditAddress = useSettingsStore((s) => s.setCustomerEditAddress);
    const metaAdsEnabled = useSettingsStore((s) => s.metaAdsEnabled);
    const setMetaAdsEnabled = useSettingsStore((s) => s.setMetaAdsEnabled);



    // Confirmation messages (real templates)
    const confirmOrderMsg = useSettingsStore((s) => s.confirmOrderMsg);
    const setConfirmOrderMsg = useSettingsStore((s) => s.setConfirmOrderMsg);
    const confirmPaymentMsg = useSettingsStore((s) => s.confirmPaymentMsg);
    const setConfirmPaymentMsg = useSettingsStore((s) => s.setConfirmPaymentMsg);
    const tplTrackingButton = useSettingsStore((s) => s.tplTrackingButton);
    const setTplTrackingButton = useSettingsStore((s) => s.setTplTrackingButton);
    const tplAutoCancel = useSettingsStore((s) => s.tplAutoCancel);
    const setTplAutoCancel = useSettingsStore((s) => s.setTplAutoCancel);
    const tplAdminNotify = useSettingsStore((s) => s.tplAdminNotify);
    const setTplAdminNotify = useSettingsStore((s) => s.setTplAdminNotify);
    const tplAddressConfirm = useSettingsStore((s) => s.tplAddressConfirm);
    const setTplAddressConfirm = useSettingsStore((s) => s.setTplAddressConfirm);
    const tplFollowUpReminder = useSettingsStore((s) => s.tplFollowUpReminder);
    const setTplFollowUpReminder = useSettingsStore((s) => s.setTplFollowUpReminder);
    const tplCheckoutOrderSummary = useSettingsStore((s) => s.tplCheckoutOrderSummary);
    const setTplCheckoutOrderSummary = useSettingsStore((s) => s.setTplCheckoutOrderSummary);
    const tplPayOrderSummary = useSettingsStore((s) => s.tplPayOrderSummary);
    const setTplPayOrderSummary = useSettingsStore((s) => s.setTplPayOrderSummary);

    const tplShippingNotify = useSettingsStore((s) => s.tplShippingNotify);
    const setTplShippingNotify = useSettingsStore((s) => s.setTplShippingNotify);

    // Follow-up settings
    const followUpEnabled = useSettingsStore((s) => s.followUpEnabled);
    const setFollowUpEnabled = useSettingsStore((s) => s.setFollowUpEnabled);
    const followUpHours = useSettingsStore((s) => s.followUpHours);
    const setFollowUpHours = useSettingsStore((s) => s.setFollowUpHours);
    const followUpMinutes = useSettingsStore((s) => s.followUpMinutes);
    const setFollowUpMinutes = useSettingsStore((s) => s.setFollowUpMinutes);

    // Success message
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const promptPayInputRef = useRef<HTMLInputElement>(null);

    // Textarea refs for focus-on-edit buttons
    const confirmOrderRef = useRef<HTMLTextAreaElement>(null);
    const confirmPaymentRef = useRef<HTMLTextAreaElement>(null);
    const fbPaymentRef = useRef<HTMLTextAreaElement>(null);

    // Which template textarea is currently in edit mode (null = all read-only)
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const startEdit = (key: string, ref?: React.RefObject<HTMLTextAreaElement | null>) => {
        setEditingKey(key);
        setTimeout(() => ref?.current?.focus(), 50);
    };

    // Reload state from DB (for Cancel)
    const reloadFromDB = async () => {
        try {
            const res = await fetch("/api/settings");
            const data = await res.json();
            if (data.success && data.data) {
                const cfg = data.data;
                if (cfg.confirmOrderMsg !== undefined) setConfirmOrderMsg(cfg.confirmOrderMsg);
                if (cfg.confirmPaymentMsg !== undefined) setConfirmPaymentMsg(cfg.confirmPaymentMsg);
                if (cfg.tplTrackingButton !== undefined) setTplTrackingButton(cfg.tplTrackingButton);
                if (cfg.tplAutoCancel !== undefined) setTplAutoCancel(cfg.tplAutoCancel);
                if (cfg.tplAdminNotify !== undefined) setTplAdminNotify(cfg.tplAdminNotify);
                if (cfg.tplAddressConfirm !== undefined) setTplAddressConfirm(cfg.tplAddressConfirm);
                if (cfg.tplFollowUpReminder !== undefined) setTplFollowUpReminder(cfg.tplFollowUpReminder);
                if (cfg.tplCheckoutOrderSummary !== undefined) setTplCheckoutOrderSummary(cfg.tplCheckoutOrderSummary);
                if (cfg.tplPayOrderSummary !== undefined) setTplPayOrderSummary(cfg.tplPayOrderSummary);
                if (cfg.tplShippingNotify !== undefined) setTplShippingNotify(cfg.tplShippingNotify);
                if (cfg.followUpEnabled !== undefined) setFollowUpEnabled(cfg.followUpEnabled);
                if (cfg.followUpHours !== undefined) setFollowUpHours(cfg.followUpHours);
                if (cfg.followUpMinutes !== undefined) setFollowUpMinutes(cfg.followUpMinutes);
            }
            setIsDirty(false);
        } catch (err) {
            console.error("Failed to reload settings", err);
        }
    };

    // Track changes to mark as dirty
    const originalBankAccount = useRef(JSON.stringify(bankAccount));
    useEffect(() => {
        if (JSON.stringify(bankAccount) !== originalBankAccount.current) {
            setIsDirty(true);
        }
    }, [bankAccount, transferInfo, transferImage, promptPayQR]);

    // ── Sync templates from DB on mount ──────────────────────────────────────
    // Zustand uses localStorage persist, but templates may have been edited
    // via the chat SettingsPanel which saves directly to DB. Pull DB values
    // on mount to ensure AdminPayment always shows the freshest templates.
    useEffect(() => {
        fetch("/api/settings")
            .then((r) => r.json())
            .then((data) => {
                if (!data.success || !data.data) return;
                const cfg = data.data;
                if (cfg.confirmOrderMsg) setConfirmOrderMsg(cfg.confirmOrderMsg);
                if (cfg.confirmPaymentMsg) setConfirmPaymentMsg(cfg.confirmPaymentMsg);
                if (cfg.tplTrackingButton) setTplTrackingButton(cfg.tplTrackingButton);
                if (cfg.tplAutoCancel) setTplAutoCancel(cfg.tplAutoCancel);
                if (cfg.tplAdminNotify) setTplAdminNotify(cfg.tplAdminNotify);
                if (cfg.tplAddressConfirm !== undefined) setTplAddressConfirm(cfg.tplAddressConfirm);
                if (cfg.tplFollowUpReminder !== undefined) setTplFollowUpReminder(cfg.tplFollowUpReminder);
                if (cfg.tplCheckoutOrderSummary !== undefined) setTplCheckoutOrderSummary(cfg.tplCheckoutOrderSummary);
                if (cfg.tplPayOrderSummary !== undefined) setTplPayOrderSummary(cfg.tplPayOrderSummary);
                if (cfg.tplShippingNotify !== undefined) setTplShippingNotify(cfg.tplShippingNotify);
                if (cfg.followUpEnabled !== undefined) setFollowUpEnabled(cfg.followUpEnabled);
                if (cfg.followUpHours !== undefined) setFollowUpHours(cfg.followUpHours);
                if (cfg.followUpMinutes !== undefined) setFollowUpMinutes(cfg.followUpMinutes);
            })
            .catch(() => { /* fail silently */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setTransferImage(ev.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        try {
            const s = useSettingsStore.getState();
            // Extract only serializable data fields (exclude functions)
            const payload = {
                paymentMethods: s.paymentMethods,
                shippingMethods: s.shippingMethods,
                bankAccount: s.bankAccount,
                transferInfo: s.transferInfo,
                transferImage: s.transferImage,
                promptPayQR: s.promptPayQR,
                allowCancelPayment: s.allowCancelPayment,
                orderFieldsEnabled: s.orderFieldsEnabled,
                addressRequired: s.addressRequired,
                emailRequired: s.emailRequired,
                phoneRequired: s.phoneRequired,
                phoneHomeNumber: s.phoneHomeNumber,
                phonePhoneNumber: s.phonePhoneNumber,
                receiptEnabled: s.receiptEnabled,
                receiptName: s.receiptName,
                receiptSignature: s.receiptSignature,
                customerEditAddress: s.customerEditAddress,
                lineUrl: s.lineUrl,
                phoneNumber: s.phoneNumber,
                refundPolicyUrl: s.refundPolicyUrl,
                salePageTheme: s.salePageTheme,
                bannerImage: s.bannerImage,
                bannerSlides: s.bannerSlides,
                metaAdsEnabled: s.metaAdsEnabled,
                fbMsgLang: s.fbMsgLang,
                fbOrderMsgTh: s.fbOrderMsgTh,
                fbOrderMsgEn: s.fbOrderMsgEn,
                followUpEnabled: s.followUpEnabled,
                followUpHours: s.followUpHours,
                followUpMinutes: s.followUpMinutes,
                confirmOrderMsg: s.confirmOrderMsg,
                confirmPaymentMsg: s.confirmPaymentMsg,
                tplTrackingButton: s.tplTrackingButton,
                tplAutoCancel: s.tplAutoCancel,
                tplAdminNotify: s.tplAdminNotify,
                tplAddressConfirm: s.tplAddressConfirm,
                tplFollowUpReminder: s.tplFollowUpReminder,
                tplCheckoutOrderSummary: s.tplCheckoutOrderSummary,
                tplPayOrderSummary: s.tplPayOrderSummary,
                tplShippingNotify: (s as any).tplShippingNotify ?? DEFAULT_SHIPPING_NOTIFY,
            };
            await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            setIsDirty(false);
            originalBankAccount.current = JSON.stringify(bankAccount);
            setSuccessMsg("บันทึกข้อมูลและอัปเดตระบบแล้ว!");
            setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err) {
            console.error("Failed to save settings", err);
            setSuccessMsg("เกิดข้อผิดพลาดในการบันทึก");
        }
    };

    const RadioOption = ({ label, value, current, onChange }: { label: string; value: string; current: string; onChange: (v: string) => void }) => (
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onChange(value)}>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${current === value ? 'border-pink-500' : 'border-gray-300'}`}>
                {current === value && <div className="w-2 h-2 rounded-full bg-pink-500" />}
            </div>
            <span className="text-sm text-gray-600">{label}</span>
        </div>
    );
    
    // Find selected bank data
    const selectedBank = banks.find(b => b.name === bankAccount.bankName);

    return (
        <div className="p-6 md:p-8">
            {/* Unsaved Changes Banner */}
            {isDirty && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-sm font-medium px-6 py-2.5 flex items-center justify-between shadow-md">
                    <span>{<Trans th="⚠️ มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก — กดบันทึกเพื่ออัปเดตระบบ" en="⚠️ There are unsaved changes — press Save to update the system." />}</span>
                    <button onClick={handleSave} className="bg-white text-amber-600 text-xs font-bold px-4 py-1.5 rounded-full hover:bg-amber-50 transition-colors">
                        <Trans th="บันทึกเดี๋ยวนี้" en="Save now" />
                                            </button>
                </div>
            )}

            {/* Success Toast */}
            {successMsg && (
                <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium animate-bounce">
                    ✅ {successMsg}
                </div>
            )}

            {/* Sub tabs */}
            <div className="flex gap-3 mb-6">
                <button
                    onClick={() => setActiveSubTab("payment")}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${activeSubTab === "payment"
                        ? "bg-gradient-to-r from-pink-400 to-pink-500 text-white shadow-md"
                        : "bg-pink-100 text-pink-500 hover:bg-pink-200"
                        }`}
                >
                    <Trans th="ช่องทางการชำระเงิน" en="Payment channels" />
                                    </button>
                <button
                    onClick={() => setActiveSubTab("settings")}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${activeSubTab === "settings"
                        ? "bg-gradient-to-r from-pink-400 to-pink-500 text-white shadow-md"
                        : "bg-pink-100 text-pink-500 hover:bg-pink-200"
                        }`}
                >
                    <Trans th="ตั้งค่าเพิ่มเติม" en="Additional settings" />
                                    </button>
            </div>

            {/* ========== TAB 1: ช่องทางการชำระเงิน ========== */}
            {activeSubTab === "payment" && (
                <>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-pink-500 flex items-center gap-2">
                            <CreditCard className="w-6 h-6" />
                            <Trans th="ช่องทางการชำระเงิน" en="Payment channels" />
                                                    </h1>
                    </div>

                    {/* Payment Methods List */}
                    <div className="space-y-3 mb-8">
                        {methods.map((method) => (
                            <div
                                key={method.id}
                                className="bg-white rounded-2xl p-4 shadow-sm border border-pink-100 flex items-center justify-between hover:shadow-md transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center text-xl">
                                        {method.icon}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? method.nameEn : method.name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {method.id === "bank" && (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full transition-colors shadow-sm"
                                        >
                                            <Upload className="w-3.5 h-3.5" />
                                            <Trans th="อัพโหลดรูปบัญชี" en="Upload account picture" />
                                                                                    </button>
                                    )}
                                    {method.id === "promptpay" && (
                                        <button
                                            onClick={() => promptPayInputRef.current?.click()}
                                            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-full transition-colors shadow-sm"
                                        >
                                            <Upload className="w-3.5 h-3.5" />
                                            <Trans th="อัพโหลด QR Code" en="Upload QR Code" />
                                                                                    </button>
                                    )}
                                    <button
                                        onClick={async () => {
                                            // Compute the new state BEFORE toggling (avoid Zustand batch timing)
                                            const currentState = useSettingsStore.getState();
                                            const updatedPayment = currentState.paymentMethods.map((m) =>
                                                m.id === method.id ? { ...m, enabled: !m.enabled } : m
                                            );
                                            // Toggle UI first
                                            toggleMethod(method.id);
                                            // Save updated state to DB immediately
                                            try {
                                                await fetch("/api/settings", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ ...currentState, paymentMethods: updatedPayment }),
                                                });
                                            } catch (err) {
                                                console.error("Failed to sync payment toggle", err);
                                            }
                                        }}
                                        className="transition-colors"
                                    >
                                        {method.enabled ? (
                                            <ToggleRight className="w-10 h-10 text-green-500" />
                                        ) : (
                                            <ToggleLeft className="w-10 h-10 text-gray-300" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Transfer Image */}
                    {/* Hidden file inputs */}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <input
                        ref={promptPayInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => setPromptPayQR(ev.target?.result as string);
                                reader.readAsDataURL(file);
                            }
                        }}
                        className="hidden"
                    />
                    {transferImage && (
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-pink-100 mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Image className="w-4 h-4 text-pink-500" />
                                    <Trans th="รูปข้อมูลการโอนเงิน" en="Picture of money transfer information" />
                                                                    </h3>
                                <button onClick={() => setTransferImage(null)} className="text-red-400 hover:text-red-500 p-1">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <img src={transferImage} alt="Transfer Info" className="max-w-md rounded-xl border border-gray-200" />
                        </div>
                    )}

                    {/* Transfer Info Textarea */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-pink-100 mb-6">
                        <label className="text-sm font-medium text-gray-700 mb-2 block">{<Trans th="ข้อมูลการโอนเงิน" en="Money transfer information" />}</label>
                        <textarea
                            value={transferInfo}
                            onChange={(e) => setTransferInfo(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300 resize-none transition-all"
                        />
                    </div>

                    {/* Allow Cancel */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-pink-100 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-medium text-red-500">{<Trans th="เปิดให้ลูกค้ายกเลิกรายการชำระเงินภายหลัง" en="Allow customers to cancel payment transactions later." />}</h3>
                                <p className="text-xs text-gray-400 mt-1">{<Trans th="ถ้าหากเปิดการใช้งานส่วนนี้ ลูกค้าจะสามารถกดยกเลิกการชำระเงินได้เองในภายหลัง" en="If this section is enabled Customers will be able to cancel the payment themselves later." />}</p>
                                <p className="text-xs text-red-400 mt-0.5">{<Trans th="หมายเหตุ: ฟีเจอร์นี้รองรับเฉพาะแพลตฟอร์ม Facebook เท่านั้น" en="Note: This feature is supported only on the Facebook platform." />}</p>
                            </div>
                            <button onClick={() => setAllowCancel(!allowCancel)} className="ml-4 flex-shrink-0">
                                {allowCancel ? (
                                    <ToggleRight className="w-10 h-10 text-green-500" />
                                ) : (
                                    <span className="text-xs bg-gray-200 text-gray-500 px-3 py-1.5 rounded-full font-medium">OFF</span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Bank Account */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100 mb-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">{<Trans th="ข้อมูลบัญชีธนาคาร" en="Bank account information" />}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1 block">{<Trans th="ชื่อบัญชี" en="Account name" />}</label>
                                <input type="text" value={bankAccount.accountName} onChange={(e) => setBankAccount({ accountName: e.target.value })} className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">{<Trans th="ธนาคาร" en="bank" />}</label>
                                    <div className="flex items-center gap-3">
                                        {selectedBank?.logo && (
                                            <div className="w-10 h-10 rounded-xl bg-white border border-pink-100 p-1.5 flex items-center justify-center shrink-0 shadow-sm">
                                                <img src={selectedBank.logo} alt={selectedBank.name} className="w-full h-full object-contain" />
                                            </div>
                                        )}
                                        <select 
                                            value={bankAccount.bankName} 
                                            onChange={(e) => setBankAccount({ bankName: e.target.value })} 
                                            className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300 appearance-none"
                                        >
                                            {banks.map((bank) => (
                                                <option key={bank.id} value={bank.name}>{bank.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">{<Trans th="เลขบัญชี" en="Account number" />}</label>
                                    <input type="text" value={bankAccount.accountNumber} onChange={(e) => setBankAccount({ accountNumber: e.target.value })} className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Save */}
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={reloadFromDB}
                            className="px-8 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-1.5"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <Trans th="ยกเลิก" en="cancel" />
                        </button>
                        <button onClick={handleSave} className="px-8 py-2.5 bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-xl text-sm font-medium shadow-md shadow-pink-200 hover:shadow-lg transition-all flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            <Trans th="บันทึก" en="record" />
                                                    </button>
                    </div>
                </>
            )}

            {/* ========== TAB 2: ตั้งค่าเพิ่มเติม ========== */}
            {activeSubTab === "settings" && (
                <>
                    {/* Order Form Fields */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100 mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-bold text-pink-500">{<Trans th="ตัวเลือกการกรอกข้อมูลการสั่งซื้อ" en="Order entry options" />}</h2>
                            <button onClick={() => setOrderFieldsEnabled(!orderFieldsEnabled)}>
                                {orderFieldsEnabled ? (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-green-500 font-bold">ON</span>
                                        <ToggleRight className="w-8 h-8 text-green-500" />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-gray-400 font-bold">OFF</span>
                                        <ToggleLeft className="w-8 h-8 text-gray-300" />
                                    </div>
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mb-6">
                            <Trans th="ตั้งค่าการใช้งานตัวเลือกการกรอกข้อมูลสำหรับลูกค้าในการสั่งซื้อสินค้า" en="Set up data entry options for customers to place orders." />
                                                    </p>

                        {orderFieldsEnabled && (
                            <div className="space-y-6">
                                {/* Address */}
                                <div className="flex items-center gap-8">
                                    <div className="flex items-center gap-2 w-32">
                                        <MapPin className="w-4 h-4 text-pink-400" />
                                        <span className="text-sm font-medium text-gray-700">{<Trans th="ที่อยู่จัดส่ง" en="Shipping address" />}</span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <RadioOption label={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Mandatory filling" : "บังคับกรอก")} value="required" current={addressRequired} onChange={(v) => setAddressRequired(v as typeof addressRequired)} />
                                        <RadioOption label={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Not required to fill in" : "ไม่บังคับกรอก")} value="optional" current={addressRequired} onChange={(v) => setAddressRequired(v as typeof addressRequired)} />
                                        <RadioOption label={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Disabled" : "ปิดใช้งาน")} value="off" current={addressRequired} onChange={(v) => setAddressRequired(v as typeof addressRequired)} />
                                    </div>
                                </div>

                                <div className="border-t border-gray-100" />

                                {/* Email */}
                                <div className="flex items-center gap-8">
                                    <div className="flex items-center gap-2 w-32">
                                        <Mail className="w-4 h-4 text-pink-400" />
                                        <span className="text-sm font-medium text-gray-700">{<Trans th="อีเมล" en="Email" />}</span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <RadioOption label={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Mandatory filling" : "บังคับกรอก")} value="required" current={emailRequired} onChange={(v) => setEmailRequired(v as typeof emailRequired)} />
                                        <RadioOption label={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Not required to fill in" : "ไม่บังคับกรอก")} value="optional" current={emailRequired} onChange={(v) => setEmailRequired(v as typeof emailRequired)} />
                                        <RadioOption label={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Disabled" : "ปิดใช้งาน")} value="off" current={emailRequired} onChange={(v) => setEmailRequired(v as typeof emailRequired)} />
                                    </div>
                                </div>

                                <div className="border-t border-gray-100" />

                                {/* Phone */}
                                <div className="flex items-start gap-8">
                                    <div className="flex items-center gap-2 w-32 mt-0.5">
                                        <Phone className="w-4 h-4 text-pink-400" />
                                        <span className="text-sm font-medium text-gray-700">{<Trans th="เบอร์โทรศัพท์" en="telephone number" />}</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-6 mb-2">
                                            <RadioOption label={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Mandatory filling" : "บังคับกรอก")} value="required" current={phoneRequired} onChange={(v) => setPhoneRequired(v as typeof phoneRequired)} />
                                        </div>
                                        {phoneRequired === "required" && (
                                            <div className="ml-6 space-y-1.5 mb-3">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={phoneHomeNumber} onChange={() => setPhoneHomeNumber(!phoneHomeNumber)} className="w-4 h-4 accent-blue-500 rounded" />
                                                    <span className="text-xs text-gray-600">Home number (fill in 9 digits)</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={phonePhoneNumber} onChange={() => setPhonePhoneNumber(!phonePhoneNumber)} className="w-4 h-4 accent-blue-500 rounded" />
                                                    <span className="text-xs text-gray-600">Phone number (fill in 10 digits)</span>
                                                </label>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-6">
                                            <RadioOption label={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Not required to fill in" : "ไม่บังคับกรอก")} value="optional" current={phoneRequired} onChange={(v) => setPhoneRequired(v as typeof phoneRequired)} />
                                            <RadioOption label={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Disable" : "ปิดการใช้งาน")} value="off" current={phoneRequired} onChange={(v) => setPhoneRequired(v as typeof phoneRequired)} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Receipt / Tax Invoice */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-800">{<Trans th="ใบเสร็จรับเงิน / ใบกำกับภาษี" en="Receipt / Tax invoice" />}</h2>
                            <button onClick={() => setReceiptEnabled(!receiptEnabled)}>
                                {receiptEnabled ? (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-green-500 font-bold">ON</span>
                                        <ToggleRight className="w-8 h-8 text-green-500" />
                                    </div>
                                ) : (
                                    <ToggleLeft className="w-8 h-8 text-gray-300" />
                                )}
                            </button>
                        </div>

                        {receiptEnabled && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Name of authorized signatory / name of payee</label>
                                    <input
                                        type="text"
                                        value={receiptName}
                                        onChange={(e) => setReceiptName(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300 text-pink-500 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block">{<Trans th="ลายเซ็น" en="signature" />}</label>
                                    <input
                                        ref={signatureInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (ev) => setSignatureImage(ev.target?.result as string);
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        className="hidden"
                                    />
                                    <div className="flex items-start gap-4">
                                        <div
                                            onClick={() => signatureInputRef.current?.click()}
                                            className="w-48 h-32 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-pink-300 hover:bg-pink-50 transition-all overflow-hidden"
                                        >
                                            {signatureImage ? (
                                                <img src={signatureImage} alt="Signature" className="w-full h-full object-contain" />
                                            ) : (
                                                <div className="text-center">
                                                    <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                                                    <span className="text-xs text-gray-400">{<Trans th="อัพโหลดลายเซ็น" en="Upload signature" />}</span>
                                                </div>
                                            )}
                                        </div>
                                        {signatureImage && (
                                            <button onClick={() => setSignatureImage(null)} className="text-red-400 hover:text-red-500 mt-1">
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Cancel/Save in receipt */}
                                <div className="flex items-center justify-center gap-4 pt-2">
                                    <button className="px-6 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">{<Trans th="ยกเลิก" en="cancel" />}</button>
                                    <button onClick={handleSave} className="px-6 py-2 bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-xl text-sm font-medium shadow-md shadow-pink-200 hover:shadow-lg transition-all">{<Trans th="บันทึก" en="record" />}</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Customer Edit Address */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-pink-100 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-pink-500">{<Trans th="ลูกค้าสามารถแก้ไขที่อยู่เองได้" en="Customers can edit their own address." />}</h3>
                                <p className="text-xs text-gray-400 mt-1">{<Trans th="ถ้าเปิดใช้งานส่วนนี้ ลูกค้าจะสามารถตรวจสอบแก้ไขที่อยู่ หรือคัดลอกที่อยู่เพื่อส่งผ่านระบบขนส่งเอกได้" en="If this section is enabled Customers will be able to check and edit addresses. Or you can copy the address to send via major transportation system." />}</p>
                            </div>
                            <button onClick={() => setCustomerEditAddress(!customerEditAddress)} className="ml-4 flex-shrink-0">
                                {customerEditAddress ? (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-green-500 font-bold">ON</span>
                                        <ToggleRight className="w-8 h-8 text-green-500" />
                                    </div>
                                ) : (
                                    <ToggleLeft className="w-8 h-8 text-gray-300" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Meta Ads — Conversions API Integration */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-pink-100 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg shadow-md shadow-blue-200">
                                    📊
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-800"><Trans th="ส่งยอดซื้อจากร้านค้าไปที่ตัวจัดการโฆษณา Meta" en="Send store purchases to Meta Ads Manager" /></h3>
                                    <p className="text-[11px] text-gray-400 mt-0.5"><Trans th="ระบบส่ง Purchase event อัตโนมัติผ่าน Conversions API (CAPI)" en="Automatically sends Purchase events via Conversions API (CAPI)" /></p>
                                </div>
                            </div>
                            <button onClick={() => setMetaAdsEnabled(!metaAdsEnabled)} className="ml-4 flex-shrink-0">
                                {metaAdsEnabled ? (
                                    <ToggleRight className="w-8 h-8 text-green-500" />
                                ) : (
                                    <ToggleLeft className="w-8 h-8 text-gray-300" />
                                )}
                            </button>
                        </div>
                        {metaAdsEnabled && (
                            <div className="mt-4 space-y-3">
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                                    <p className="text-xs text-blue-700 font-medium mb-1">
                                        <Trans th="📊 การทำงาน:" en="📊 How it works:" />
                                    </p>
                                    <ul className="text-[11px] text-blue-600 space-y-1 ml-4 list-disc">
                                        <li><Trans th="เมื่อลูกค้าสั่งซื้อสินค้า ระบบจะส่ง Purchase event ไปที่ Meta Pixel" en="When a customer places an order, the system sends a Purchase event to Meta Pixel" /></li>
                                        <li><Trans th="ข้อมูลยอดขายจะปรากฏใน Meta Ads Manager เพื่อวัดผล ROAS" en="Sales data appears in Meta Ads Manager to measure ROAS" /></li>
                                        <li><Trans th="ช่วยให้ Facebook ปรับปรุงการแสดงโฆษณาให้ตรงกลุ่มเป้าหมายมากขึ้น" en="Helps Facebook optimize ad delivery for better targeting" /></li>
                                    </ul>
                                </div>
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-medium text-gray-700"><Trans th="สถานะ Meta Pixel" en="Meta Pixel Status" /></p>
                                            <p className="text-[11px] text-gray-400 mt-0.5"><Trans th="ต้องตั้งค่า META_PIXEL_ID และ META_CAPI_TOKEN" en="Requires META_PIXEL_ID and META_CAPI_TOKEN" /></p>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                                            <Trans th="พร้อมใช้งาน" en="Connected" />
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                                    <p className="text-xs text-yellow-700">
                                        <Trans th="⚠️ ฟีเจอร์นี้ต้องการ ads_management permission จาก Facebook App Review" en="⚠️ This feature requires ads_management permission from Facebook App Review" />
                                    </p>
                                </div>
                                <button
                                    onClick={async () => {
                                        try {
                                            const res = await fetch('/api/admin/test-capi', { method: 'POST' });
                                            const data = await res.json();
                                            alert(data.message || data.error || 'Test completed');
                                        } catch (err) {
                                            alert('Failed to test CAPI: ' + String(err));
                                        }
                                    }}
                                    className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-md shadow-blue-200 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    🧪 <Trans th="ทดสอบส่ง Purchase Event" en="Test Send Purchase Event" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Section heading ── */}
                    <div className="mb-5">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            🗨️ Template ข้อความ Messenger
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">
                            ปรับแต่งข้อความที่ระบบส่งให้ลูกค้าและแอดมินในแต่ละขั้นตอน — ใช้ <span className="font-mono bg-gray-100 px-1 rounded">{'{'+'placeholder{'}</span> เพื่อแทนค่าอัตโนมัติ
                        </p>
                    </div>

                    {/* ════════════════════════════════════════════════════
                        🛒 CHECKOUT — templates sent at order creation
                    ════════════════════════════════════════════════════ */}
                    <div className="bg-white rounded-2xl shadow-sm border border-green-100 mb-6 overflow-hidden">
                        {/* Header band */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 px-6 py-4 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center text-lg">🛒</div>
                            <div>
                                <h2 className="text-base font-bold text-green-700">ออเดอร์ผ่านเว็บ <span className="font-normal text-green-500 text-sm">(Checkout)</span></h2>
                                <p className="text-xs text-green-500 mt-0.5">ลูกค้ากดสั่งผ่านหน้าเว็บไซต์ — ระบบส่งข้อความทันทีหลังยืนยันออเดอร์ / กรณีหมดเวลา / แก้ที่อยู่</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Placeholder ref */}
                            {/* placeholder strip */}
                            <p className="text-[10px] text-gray-300 font-mono mb-4">
                                {'{orderNumber}'} {'{total}'} {'{itemLines}'} {'{customerName}'} {'{address}'} {'{phone}'} {'{note}'} {'{shopUrl}'} {'{orderDate}'}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* 0 ข้อความสรุปออเดอร์ (Checkout) */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-green-700">🛒 สรุปออเดอร์ (การ์ดก่อนคลิกยืนยัน)</h3>
                                        <div className="flex gap-1">
                                            {editingKey === "tplCheckoutOrderSummary" ? (
                                                <button onClick={() => setEditingKey(null)} className="text-[11px] bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-medium">✅ เสร็จ</button>
                                            ) : (
                                                <button onClick={() => startEdit("tplCheckoutOrderSummary")} className="text-[11px] bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-0.5 rounded-full hover:bg-orange-100 transition-colors">✏️ เพิ่ม/แก้ไข</button>
                                            )}
                                            <button onClick={() => { setTplCheckoutOrderSummary(CHECKOUT_ORDER_SUMMARY); setEditingKey(null); }} className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full hover:bg-gray-200">↺ default</button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400">ส่งให้ลูกค้าตรวจเช็คก่อนกดยืนยันตะกร้า ตัวแปร: {'{itemLines}'}, {'{subtotal}'}, {'{shippingOptions}'}</p>
                                    <div className={`rounded-xl p-3 border flex-1 transition-colors ${
                                        editingKey === "tplCheckoutOrderSummary"
                                            ? "bg-green-50 border-green-400 ring-1 ring-green-300"
                                            : "bg-gray-50 border-gray-200"
                                    }`}>
                                        <textarea
                                            value={tplCheckoutOrderSummary}
                                            onChange={(e) => setTplCheckoutOrderSummary(e.target.value)}
                                            readOnly={editingKey !== "tplCheckoutOrderSummary"}
                                            rows={8}
                                            className={`w-full bg-transparent text-xs outline-none resize-y font-mono ${
                                                editingKey === "tplCheckoutOrderSummary" ? "text-gray-800 cursor-text" : "text-gray-500 cursor-not-allowed"
                                            }`}
                                        />
                                    </div>
                                    {editingKey !== "tplCheckoutOrderSummary" && (
                                        <p className="text-[10px] text-orange-400 flex items-center gap-1">🔒 กด &quot;เพิ่ม/แก้ไข&quot; เพื่อแก้ไข</p>
                                    )}
                                </div>

                                {/* 1 ยืนยันออเดอร์ */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-green-700">📋 ยืนยันออเดอร์</h3>
                                        <div className="flex gap-1">
                                            {editingKey === "confirmOrderMsg" ? (
                                                <button onClick={() => setEditingKey(null)} className="text-[11px] bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-medium">✅ เสร็จ</button>
                                            ) : (
                                                <button onClick={() => startEdit("confirmOrderMsg", confirmOrderRef)} className="text-[11px] bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-0.5 rounded-full hover:bg-orange-100 transition-colors">✏️ เพิ่ม/แก้ไข</button>
                                            )}
                                            <button onClick={() => { setConfirmOrderMsg(ORDER_CONFIRMATION); setEditingKey(null); }} className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full hover:bg-gray-200">↺ default</button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400">ส่งทันทีหลังลูกค้ากดยืนยัน</p>
                                    <div className={`rounded-xl p-3 border flex-1 transition-colors ${
                                        editingKey === "confirmOrderMsg"
                                            ? "bg-green-50 border-green-400 ring-1 ring-green-300"
                                            : "bg-gray-50 border-gray-200"
                                    }`}>
                                        <textarea
                                            ref={confirmOrderRef}
                                            value={confirmOrderMsg}
                                            onChange={(e) => setConfirmOrderMsg(e.target.value)}
                                            readOnly={editingKey !== "confirmOrderMsg"}
                                            rows={8}
                                            className={`w-full bg-transparent text-xs outline-none resize-y font-mono ${
                                                editingKey === "confirmOrderMsg" ? "text-gray-800 cursor-text" : "text-gray-500 cursor-not-allowed"
                                            }`}
                                        />
                                    </div>
                                    {editingKey !== "confirmOrderMsg" && (
                                        <p className="text-[10px] text-orange-400 flex items-center gap-1">🔒 กด &quot;เพิ่ม/แก้ไข&quot; เพื่อแก้ไข</p>
                                    )}
                                </div>

                                {/* 2 ยกเลิกอัตโนมัติ */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-red-600">⏰ ยกเลิกอัตโนมัติ</h3>
                                        <div className="flex gap-1">
                                            {editingKey === "tplAutoCancel" ? (
                                                <button onClick={() => setEditingKey(null)} className="text-[11px] bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-medium">✅ เสร็จ</button>
                                            ) : (
                                                <button onClick={() => startEdit("tplAutoCancel")} className="text-[11px] bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-0.5 rounded-full hover:bg-orange-100 transition-colors">✏️ เพิ่ม/แก้ไข</button>
                                            )}
                                            <button onClick={() => { setTplAutoCancel(AUTO_CANCEL_MSG); setEditingKey(null); }} className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full hover:bg-gray-200">↺ default</button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400">ส่งเมื่อไม่ชำระภายใน 2 ชม.</p>
                                    <div className={`rounded-xl p-3 border flex-1 transition-colors ${
                                        editingKey === "tplAutoCancel"
                                            ? "bg-red-50 border-red-400 ring-1 ring-red-300"
                                            : "bg-gray-50 border-gray-200"
                                    }`}>
                                        <textarea
                                            value={tplAutoCancel}
                                            onChange={(e) => setTplAutoCancel(e.target.value)}
                                            readOnly={editingKey !== "tplAutoCancel"}
                                            rows={8}
                                            className={`w-full bg-transparent text-xs outline-none resize-y font-mono ${
                                                editingKey === "tplAutoCancel" ? "text-gray-800 cursor-text" : "text-gray-500 cursor-not-allowed"
                                            }`}
                                        />
                                    </div>
                                    {editingKey !== "tplAutoCancel" && (
                                        <p className="text-[10px] text-orange-400">🔒 กด &quot;เพิ่ม/แก้ไข&quot; เพื่อแก้ไข</p>
                                    )}
                                </div>

                                {/* 3 ปุ่ม Tracking */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-green-700">🔗 ข้อความปุ่ม Tracking</h3>
                                        <div className="flex gap-1">
                                            {editingKey === "tplTrackingButton" ? (
                                                <button onClick={() => setEditingKey(null)} className="text-[11px] bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-medium">✅ เสร็จ</button>
                                            ) : (
                                                <button onClick={() => startEdit("tplTrackingButton")} className="text-[11px] bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-0.5 rounded-full hover:bg-orange-100 transition-colors">✏️ ตรวจสอบ/แก้ไข</button>
                                            )}
                                            <button onClick={() => { setTplTrackingButton(TRACKING_BUTTON_MSG); setEditingKey(null); }} className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full hover:bg-gray-200">↺ default</button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400">ส่งพร้อมปุ่มลิงก์ตรวจสอบออเดอร์</p>
                                    <div className={`rounded-xl p-3 border flex-1 transition-colors ${
                                        editingKey === "tplTrackingButton"
                                            ? "bg-green-50 border-green-400 ring-1 ring-green-300"
                                            : "bg-gray-50 border-gray-200"
                                    }`}>
                                        <textarea
                                            value={tplTrackingButton}
                                            onChange={(e) => setTplTrackingButton(e.target.value)}
                                            readOnly={editingKey !== "tplTrackingButton"}
                                            rows={4}
                                            className={`w-full bg-transparent text-xs outline-none resize-y font-mono ${
                                                editingKey === "tplTrackingButton" ? "text-gray-800 cursor-text" : "text-gray-500 cursor-not-allowed"
                                            }`}
                                        />
                                    </div>
                                    {editingKey !== "tplTrackingButton" && (
                                        <p className="text-[10px] text-orange-400">🔒 กด &quot;ตรวจสอบ/แก้ไข&quot; เพื่อแก้ไข</p>
                                    )}
                                </div>

                                {/* 4 ยืนยันแก้ที่อยู่ */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-green-700">📍 ยืนยันแก้ที่อยู่</h3>
                                        <div className="flex gap-1">
                                            {editingKey === "tplAddressConfirm" ? (
                                                <button onClick={() => setEditingKey(null)} className="text-[11px] bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-medium">✅ เสร็จ</button>
                                            ) : (
                                                <button onClick={() => startEdit("tplAddressConfirm")} className="text-[11px] bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-0.5 rounded-full hover:bg-orange-100 transition-colors">✏️ เพิ่ม/แก้ไข</button>
                                            )}
                                            <button onClick={() => { setTplAddressConfirm(ADDRESS_UPDATE_CONFIRM); setEditingKey(null); }} className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full hover:bg-gray-200">↺ default</button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400">ส่งเมื่อลูกค้าขอแก้ที่อยู่จัดส่ง</p>
                                    <div className={`rounded-xl p-3 border flex-1 transition-colors ${
                                        editingKey === "tplAddressConfirm"
                                            ? "bg-green-50 border-green-400 ring-1 ring-green-300"
                                            : "bg-gray-50 border-gray-200"
                                    }`}>
                                        <textarea
                                            value={tplAddressConfirm}
                                            onChange={(e) => setTplAddressConfirm(e.target.value)}
                                            readOnly={editingKey !== "tplAddressConfirm"}
                                            rows={4}
                                            className={`w-full bg-transparent text-xs outline-none resize-y font-mono ${
                                                editingKey === "tplAddressConfirm" ? "text-gray-800 cursor-text" : "text-gray-500 cursor-not-allowed"
                                            }`}
                                        />
                                    </div>
                                    {editingKey !== "tplAddressConfirm" && (
                                        <p className="text-[10px] text-orange-400">🔒 กด &quot;เพิ่ม/แก้ไข&quot; เพื่อแก้ไข</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ════════════════════════════════════════════════════
                        💳 PAY — templates sent when customer pays
                    ════════════════════════════════════════════════════ */}
                    <div className="bg-white rounded-2xl shadow-sm border border-blue-100 mb-6 overflow-hidden">
                        {/* Header band */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-4 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-lg">💳</div>
                            <div>
                                <h2 className="text-base font-bold text-blue-700">คำสั่งซื้อจากแชท์ <span className="font-normal text-blue-500 text-sm">(Pay)</span></h2>
                                <p className="text-xs text-blue-500 mt-0.5">ลูกค้าสั่งซื้อและชำระเงินผ่าน Messenger — ระบบแจ้งลูกค้าและแอดมินหลังแนบสลิป</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            <p className="text-[10px] text-gray-300 font-mono mb-4">
                                {'{orderNumber}'} {'{total}'} {'{itemLines}'} {'{customerName}'} {'{address}'} {'{phone}'} {'{note}'}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* 0 ข้อความสรุปออเดอร์ (Pay) */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-blue-700">🧾 สรุปออเดอร์ (เมื่อแอดมินสร้างบิล)</h3>
                                        <div className="flex gap-1">
                                            {editingKey === "tplPayOrderSummary" ? (
                                                <button onClick={() => setEditingKey(null)} className="text-[11px] bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">✅ เสร็จ</button>
                                            ) : (
                                                <button onClick={() => startEdit("tplPayOrderSummary")} className="text-[11px] bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-0.5 rounded-full hover:bg-orange-100 transition-colors">✏️ เพิ่ม/แก้ไข</button>
                                            )}
                                            <button onClick={() => { setTplPayOrderSummary(PAY_ORDER_SUMMARY); setEditingKey(null); }} className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full hover:bg-gray-200">↺ default</button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400">ส่งให้ลูกค้าหลังจากกดสร้างบิลในแชท</p>
                                    <div className={`rounded-xl p-3 border flex-1 transition-colors ${
                                        editingKey === "tplPayOrderSummary"
                                            ? "bg-blue-50 border-blue-400 ring-1 ring-blue-300"
                                            : "bg-gray-50 border-gray-200"
                                    }`}>
                                        <textarea
                                            value={tplPayOrderSummary}
                                            onChange={(e) => setTplPayOrderSummary(e.target.value)}
                                            readOnly={editingKey !== "tplPayOrderSummary"}
                                            rows={8}
                                            className={`w-full bg-transparent text-xs outline-none resize-y font-mono ${
                                                editingKey === "tplPayOrderSummary" ? "text-gray-800 cursor-text" : "text-gray-500 cursor-not-allowed"
                                            }`}
                                        />
                                    </div>
                                    {editingKey !== "tplPayOrderSummary" && (
                                        <p className="text-[10px] text-orange-400 flex items-center gap-1">🔒 กด &quot;เพิ่ม/แก้ไข&quot; เพื่อแก้ไข</p>
                                    )}
                                </div>

                                {/* 1 ยืนยันชำระเงิน */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-blue-700">🎉 ยืนยันชำระเงิน</h3>
                                        <div className="flex gap-1">
                                            {editingKey === "confirmPaymentMsg" ? (
                                                <button onClick={() => setEditingKey(null)} className="text-[11px] bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-medium">✅ เสร็จ</button>
                                            ) : (
                                                <button onClick={() => startEdit("confirmPaymentMsg", confirmPaymentRef)} className="text-[11px] bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-0.5 rounded-full hover:bg-orange-100 transition-colors">✏️ เพิ่ม/แก้ไข</button>
                                            )}
                                            <button onClick={() => { setConfirmPaymentMsg(PAYMENT_CONFIRMATION); setEditingKey(null); }} className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full hover:bg-gray-200">↺ default</button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400">ส่งให้ลูกค้าหลังแนบสลิปสำเร็จ</p>
                                    <div className={`rounded-xl p-3 border flex-1 transition-colors ${
                                        editingKey === "confirmPaymentMsg"
                                            ? "bg-blue-50 border-blue-400 ring-1 ring-blue-300"
                                            : "bg-gray-50 border-gray-200"
                                    }`}>
                                        <textarea
                                            ref={confirmPaymentRef}
                                            value={confirmPaymentMsg}
                                            onChange={(e) => setConfirmPaymentMsg(e.target.value)}
                                            readOnly={editingKey !== "confirmPaymentMsg"}
                                            rows={8}
                                            className={`w-full bg-transparent text-xs outline-none resize-y font-mono ${
                                                editingKey === "confirmPaymentMsg" ? "text-gray-800 cursor-text" : "text-gray-500 cursor-not-allowed"
                                            }`}
                                        />
                                    </div>
                                    {editingKey !== "confirmPaymentMsg" && (
                                        <p className="text-[10px] text-orange-400">🔒 กด &quot;เพิ่ม/แก้ไข&quot; เพื่อแก้ไข</p>
                                    )}
                                </div>

                                {/* 2 แจ้ง Admin */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-purple-700">🔔 แจ้ง Admin</h3>
                                        <div className="flex gap-1">
                                            {editingKey === "tplAdminNotify" ? (
                                                <button onClick={() => setEditingKey(null)} className="text-[11px] bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-medium">✅ เสร็จ</button>
                                            ) : (
                                                <button onClick={() => startEdit("tplAdminNotify")} className="text-[11px] bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-0.5 rounded-full hover:bg-orange-100 transition-colors">✏️ ตรวจสอบ/แก้ไข</button>
                                            )}
                                            <button onClick={() => { setTplAdminNotify(ADMIN_PAYMENT_NOTIFICATION); setEditingKey(null); }} className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full hover:bg-gray-200">↺ default</button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400">แสดงใน Inbox เมื่อลูกค้าชำระ</p>
                                    <div className={`rounded-xl p-3 border flex-1 transition-colors ${
                                        editingKey === "tplAdminNotify"
                                            ? "bg-purple-50 border-purple-400 ring-1 ring-purple-300"
                                            : "bg-gray-50 border-gray-200"
                                    }`}>
                                        <textarea
                                            value={tplAdminNotify}
                                            onChange={(e) => setTplAdminNotify(e.target.value)}
                                            readOnly={editingKey !== "tplAdminNotify"}
                                            rows={4}
                                            className={`w-full bg-transparent text-xs outline-none resize-y font-mono ${
                                                editingKey === "tplAdminNotify" ? "text-gray-800 cursor-text" : "text-gray-500 cursor-not-allowed"
                                            }`}
                                        />
                                    </div>
                                    {editingKey !== "tplAdminNotify" && (
                                        <p className="text-[10px] text-orange-400">🔒 กด &quot;ตรวจสอบ/แก้ไข&quot; เพื่อแก้ไข</p>
                                    )}
                                    <p className="text-[10px] text-gray-400">Placeholders: {'{orderNumber}'} {'{total}'}</p>
                                </div>
                            </div>
                        </div>
                    </div>



                    {/* ════════════════════════════════════════════════════
                        🚚 SHIPPING — template sent when order is shipped
                    ════════════════════════════════════════════════════ */}
                    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 mb-6 overflow-hidden">
                        {/* Header band */}
                        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 px-6 py-4 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-lg">🚚</div>
                            <div>
                                <h2 className="text-base font-bold text-orange-700">แจ้งจัดส่งสินค้า <span className="font-normal text-orange-500 text-sm">(Shipping)</span></h2>
                                <p className="text-xs text-orange-500 mt-0.5">ส่งให้ลูกค้าอัตโนมัติเมื่อแอดมินกรอกเลข Tracking — ตัวแปร: {'{trackingNumber}'} {'{shippingProvider}'} {'{trackingUrl}'}</p>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-[10px] text-gray-300 font-mono mb-4">
                                {'{orderNumber}'} {'{customerName}'} {'{trackingNumber}'} {'{shippingProvider}'} {'{trackingUrl}'} {'{itemLines}'} {'{total}'}
                            </p>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-orange-700">📦 ข้อความแจ้งจัดส่ง</h3>
                                    <div className="flex gap-1">
                                        {editingKey === "tplShippingNotify" ? (
                                            <button onClick={() => setEditingKey(null)} className="text-[11px] bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-medium">✅ เสร็จ</button>
                                        ) : (
                                            <button onClick={() => startEdit("tplShippingNotify")} className="text-[11px] bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-0.5 rounded-full hover:bg-orange-100 transition-colors">✏️ เพิ่ม/แก้ไข</button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setTplShippingNotify(DEFAULT_SHIPPING_NOTIFY);
                                                setEditingKey(null);
                                            }}
                                            className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full hover:bg-gray-200"
                                        >↺ default</button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400">ส่งให้ลูกค้าทันทีเมื่อแอดมินกรอก Tracking Number แล้วกดบันทึก</p>
                                <div className={`rounded-xl p-3 border flex-1 transition-colors ${
                                    editingKey === "tplShippingNotify"
                                        ? "bg-orange-50 border-orange-400 ring-1 ring-orange-300"
                                        : "bg-gray-50 border-gray-200"
                                }`}>
                                    <textarea
                                        value={tplShippingNotify}
                                        onChange={(e) => { setTplShippingNotify(e.target.value); setIsDirty(true); }}
                                        readOnly={editingKey !== "tplShippingNotify"}
                                        rows={10}
                                        className={`w-full bg-transparent text-xs outline-none resize-y font-mono ${
                                            editingKey === "tplShippingNotify" ? "text-gray-800 cursor-text" : "text-gray-500 cursor-not-allowed"
                                        }`}
                                    />
                                </div>
                                {editingKey !== "tplShippingNotify" && (
                                    <p className="text-[10px] text-orange-400">🔒 กด &quot;เพิ่ม/แก้ไข&quot; เพื่อแก้ไข</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ════════════════════════════════════════════════════
                        ⏳ FOLLOW-UP REMINDER
                    ════════════════════════════════════════════════════ */}
                    <div className="bg-white rounded-2xl shadow-sm border border-amber-100 mb-6 overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-lg">⏳</div>
                                <div>
                                    <h2 className="text-base font-bold text-amber-700">แจ้งเตือนค้างชำระ <span className="font-normal text-amber-500 text-sm">(Follow-up)</span></h2>
                                    <p className="text-xs text-amber-500 mt-0.5">ส่ง remind อัตโนมัติก่อนยกเลิก — ช่วยเพิ่ม conversion</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setFollowUpEnabled(!followUpEnabled)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                    followUpEnabled
                                        ? "bg-amber-100 text-amber-700 border border-amber-300"
                                        : "bg-gray-100 text-gray-400 border border-gray-200"
                                }`}
                            >
                                <span className={`w-3 h-3 rounded-full ${followUpEnabled ? "bg-amber-500" : "bg-gray-300"}`} />
                                {followUpEnabled ? "เปิดใช้งาน" : "ปิด"}
                            </button>
                        </div>

                        {followUpEnabled && (
                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-2 block">⏰ ส่ง remind หลังจากสั่งซื้อ</label>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                            <input
                                                type="number"
                                                min={0}
                                                max={23}
                                                value={followUpHours}
                                                onChange={(e) => setFollowUpHours(Number(e.target.value))}
                                                className="w-12 bg-transparent text-sm text-center outline-none font-mono font-bold text-amber-700"
                                            />
                                            <span className="text-xs text-amber-600">ชั่วโมง</span>
                                        </div>
                                        <span className="text-gray-400 font-bold">:</span>
                                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                            <input
                                                type="number"
                                                min={0}
                                                max={59}
                                                value={followUpMinutes}
                                                onChange={(e) => setFollowUpMinutes(Number(e.target.value))}
                                                className="w-12 bg-transparent text-sm text-center outline-none font-mono font-bold text-amber-700"
                                            />
                                            <span className="text-xs text-amber-600">นาที</span>
                                        </div>
                                        <p className="text-[11px] text-gray-400">* ต้องน้อยกว่า 2 ชั่วโมง (เวลายกเลิก)</p>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-semibold text-gray-600">💬 ข้อความ remind</label>
                                        <div className="flex gap-1">
                                            {editingKey === "tplFollowUpReminder" ? (
                                                <button onClick={() => setEditingKey(null)} className="text-[11px] bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-medium">✅ เสร็จ</button>
                                            ) : (
                                                <button onClick={() => startEdit("tplFollowUpReminder")} className="text-[11px] bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-0.5 rounded-full hover:bg-orange-100 transition-colors">✏️ แก้ไข</button>
                                            )}
                                            <button onClick={() => { setTplFollowUpReminder(FOLLOW_UP_REMINDER); setEditingKey(null); }} className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full hover:bg-gray-200">↺ default</button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mb-1.5">Placeholders: {'{orderNumber}'} {'{total}'} {'{itemLines}'} {'{shopUrl}'}</p>
                                    <div className={`rounded-xl p-3 border transition-colors ${
                                        editingKey === "tplFollowUpReminder"
                                            ? "bg-amber-50 border-amber-400 ring-1 ring-amber-300"
                                            : "bg-gray-50 border-gray-200"
                                    }`}>
                                        <textarea
                                            value={tplFollowUpReminder ?? ""}
                                            onChange={(e) => setTplFollowUpReminder(e.target.value)}
                                            readOnly={editingKey !== "tplFollowUpReminder"}
                                            rows={8}
                                            className={`w-full bg-transparent text-xs outline-none resize-y font-mono ${
                                                editingKey === "tplFollowUpReminder" ? "text-gray-800 cursor-text" : "text-gray-500 cursor-not-allowed"
                                            }`}
                                        />
                                    </div>
                                    {editingKey !== "tplFollowUpReminder" && (
                                        <p className="text-[10px] text-orange-400 mt-1">🔒 กด &quot;แก้ไข&quot; เพื่อแก้ไข</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Save */}
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={reloadFromDB}
                            className="px-8 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <Trans th="ยกเลิก" en="cancel" />
                        </button>
                        <button onClick={handleSave} className="px-8 py-2.5 bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-xl text-sm font-medium shadow-md shadow-pink-200 hover:shadow-lg transition-all flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            <Trans th="บันทึก" en="record" />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
