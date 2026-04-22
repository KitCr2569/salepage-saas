"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { shippingMethods as defaultShipping, paymentMethods as defaultPayment } from "@/data";

export interface BannerSlide {
    image: string | null;
    text: string;
}

interface PaymentMethod {
    id: string;
    name: string;
    nameEn: string;
    icon: string;
    enabled: boolean;
}

interface ShippingMethod {
    id: string;
    name: string;
    nameEn: string;
    price: number;
    days: string;
    icon?: string;
    enabled: boolean;
    proshipCarrierCode?: string;
    proshipApiKey?: string;
    proshipShopId?: string;
}

interface BankAccount {
    accountName: string;
    bankName: string;
    accountNumber: string;
}

interface SettingsStore {
    // Payment methods
    paymentMethods: PaymentMethod[];
    togglePayment: (id: string) => void;

    // Shipping methods  
    shippingMethods: ShippingMethod[];
    toggleShipping: (id: string) => void;
    addShipping: (method: ShippingMethod) => void;
    updateShipping: (id: string, data: Partial<ShippingMethod>) => void;
    deleteShipping: (id: string) => void;

    // Bank account
    bankAccount: BankAccount;
    setBankAccount: (data: Partial<BankAccount>) => void;

    // Transfer info
    transferInfo: string;
    setTransferInfo: (info: string) => void;

    // Transfer image
    transferImage: string | null;
    setTransferImage: (img: string | null) => void;

    // PromptPay QR
    promptPayQR: string | null;
    setPromptPayQR: (img: string | null) => void;
    promptPayPhone: string;
    setPromptPayPhone: (phone: string) => void;

    // Allow cancel payment
    allowCancelPayment: boolean;
    setAllowCancelPayment: (val: boolean) => void;

    // Order form field settings
    orderFieldsEnabled: boolean;
    setOrderFieldsEnabled: (val: boolean) => void;
    addressRequired: "required" | "optional" | "off";
    setAddressRequired: (val: "required" | "optional" | "off") => void;
    emailRequired: "required" | "optional" | "off";
    setEmailRequired: (val: "required" | "optional" | "off") => void;
    phoneRequired: "required" | "optional" | "off";
    setPhoneRequired: (val: "required" | "optional" | "off") => void;

    // Receipt / Tax invoice
    receiptEnabled: boolean;
    setReceiptEnabled: (val: boolean) => void;
    receiptName: string;
    setReceiptName: (val: string) => void;
    receiptSignature: string | null;
    setReceiptSignature: (img: string | null) => void;

    // Customer can edit address
    customerEditAddress: boolean;
    setCustomerEditAddress: (val: boolean) => void;

    // Social & Contact links (for sale page footer)
    lineUrl: string;
    setLineUrl: (val: string) => void;
    phoneNumber: string;
    setPhoneNumber: (val: string) => void;
    refundPolicyUrl: string;
    setRefundPolicyUrl: (val: string) => void;

    // Sale page theme & banner
    salePageTheme: string;
    setSalePageTheme: (val: string) => void;
    bannerImage: string | null; // kept for backward compat
    setBannerImage: (val: string | null) => void;
    bannerSlides: BannerSlide[];
    setBannerSlides: (val: BannerSlide[]) => void;

    // Phone options
    phoneHomeNumber: boolean;
    setPhoneHomeNumber: (val: boolean) => void;
    phonePhoneNumber: boolean;
    setPhonePhoneNumber: (val: boolean) => void;

    // Meta Ads
    metaAdsEnabled: boolean;
    setMetaAdsEnabled: (val: boolean) => void;

    // Facebook Shop messages
    fbMsgLang: "th" | "en" | "other";
    setFbMsgLang: (val: "th" | "en" | "other") => void;
    fbOrderMsgTh: string;
    setFbOrderMsgTh: (val: string) => void;
    fbOrderMsgEn: string;
    setFbOrderMsgEn: (val: string) => void;

    // Follow-up settings
    followUpEnabled: boolean;
    setFollowUpEnabled: (val: boolean) => void;
    followUpHours: number;
    setFollowUpHours: (val: number) => void;
    followUpMinutes: number;
    setFollowUpMinutes: (val: number) => void;
    followUpReply: string;
    setFollowUpReply: (val: string) => void;
    followUpKeyword: string;
    setFollowUpKeyword: (val: string) => void;

    // Confirmation messages (real templates used by API)
    confirmOrderMsg: string;
    setConfirmOrderMsg: (val: string) => void;
    confirmPaymentMsg: string;
    setConfirmPaymentMsg: (val: string) => void;
    tplTrackingButton: string;
    setTplTrackingButton: (val: string) => void;
    tplAutoCancel: string;
    setTplAutoCancel: (val: string) => void;
    tplAdminNotify: string;
    setTplAdminNotify: (val: string) => void;
    tplAddressConfirm: string;
    setTplAddressConfirm: (val: string) => void;
    tplFollowUpReminder: string;
    setTplFollowUpReminder: (val: string) => void;
    tplCheckoutOrderSummary: string;
    setTplCheckoutOrderSummary: (val: string) => void;
    tplPayOrderSummary: string;
    setTplPayOrderSummary: (val: string) => void;
    tplShippingNotify: string;
    setTplShippingNotify: (val: string) => void;
}

export const useSettingsStore = create<SettingsStore>()(
    persist(
        (set) => ({
            // Payment methods - initialized with defaults + enabled flag
            paymentMethods: defaultPayment.map((m) => ({ ...m, enabled: true })),
            togglePayment: (id) =>
                set((state) => ({
                    paymentMethods: state.paymentMethods.map((m) =>
                        m.id === id ? { ...m, enabled: !m.enabled } : m
                    ),
                })),

            // Shipping methods
            shippingMethods: defaultShipping.map((m) => ({ ...m, enabled: true })),
            toggleShipping: (id) =>
                set((state) => ({
                    shippingMethods: state.shippingMethods.map((m) =>
                        m.id === id ? { ...m, enabled: !m.enabled } : m
                    ),
                })),
            addShipping: (method) =>
                set((state) => ({
                    shippingMethods: [...state.shippingMethods, method],
                })),
            updateShipping: (id, data) =>
                set((state) => ({
                    shippingMethods: state.shippingMethods.map((m) =>
                        m.id === id ? { ...m, ...data } : m
                    ),
                })),
            deleteShipping: (id) =>
                set((state) => ({
                    shippingMethods: state.shippingMethods.filter((m) => m.id !== id),
                })),

            // Bank account
            bankAccount: {
                accountName: "",
                bankName: "",
                accountNumber: "",
            },
            setBankAccount: (data) =>
                set((state) => ({
                    bankAccount: { ...state.bankAccount, ...data },
                })),

            // Transfer info
            transferInfo: "Please transfer money to the bank account and attach the payment slip.",
            setTransferInfo: (info) => set({ transferInfo: info }),

            // Transfer image
            transferImage: null,
            setTransferImage: (img) => set({ transferImage: img }),

            // PromptPay QR
            promptPayQR: null,
            setPromptPayQR: (img) => set({ promptPayQR: img }),
            promptPayPhone: "",
            setPromptPayPhone: (phone) => set({ promptPayPhone: phone }),

            // Allow cancel
            allowCancelPayment: false,
            setAllowCancelPayment: (val) => set({ allowCancelPayment: val }),

            // Order form fields
            orderFieldsEnabled: true,
            setOrderFieldsEnabled: (val) => set({ orderFieldsEnabled: val }),
            addressRequired: "required",
            setAddressRequired: (val) => set({ addressRequired: val }),
            emailRequired: "off",
            setEmailRequired: (val) => set({ emailRequired: val }),
            phoneRequired: "required",
            setPhoneRequired: (val) => set({ phoneRequired: val }),

            // Receipt
            receiptEnabled: true,
            setReceiptEnabled: (val) => set({ receiptEnabled: val }),
            receiptName: "",
            setReceiptName: (val) => set({ receiptName: val }),
            receiptSignature: null,
            setReceiptSignature: (img) => set({ receiptSignature: img }),

            // Customer edit address
            customerEditAddress: true,
            setCustomerEditAddress: (val) => set({ customerEditAddress: val }),

            // Social & Contact links
            lineUrl: "",
            setLineUrl: (val) => set({ lineUrl: val }),
            phoneNumber: "+66891234567",
            setPhoneNumber: (val) => set({ phoneNumber: val }),
            refundPolicyUrl: "",
            setRefundPolicyUrl: (val) => set({ refundPolicyUrl: val }),

            // Sale page theme & banner
            salePageTheme: "midnight",
            setSalePageTheme: (val) => set({ salePageTheme: val }),
            bannerImage: null,
            setBannerImage: (val) => set({ bannerImage: val }),
            bannerSlides: [
                { image: null, text: "" },
                { image: null, text: "" },
                { image: null, text: "" },
            ],
            setBannerSlides: (val) => set({ bannerSlides: val }),

            // Phone options
            phoneHomeNumber: true,
            setPhoneHomeNumber: (val) => set({ phoneHomeNumber: val }),
            phonePhoneNumber: true,
            setPhonePhoneNumber: (val) => set({ phonePhoneNumber: val }),

            // Meta Ads
            metaAdsEnabled: false,
            setMetaAdsEnabled: (val) => set({ metaAdsEnabled: val }),

            // Facebook Shop messages
            fbMsgLang: "th",
            setFbMsgLang: (val) => set({ fbMsgLang: val }),
            fbOrderMsgTh: "=== สรุปการสั่งซื้อ ===\n{products}\n🛒 ค่าสินค้า (ไม่รวมค่าส่ง)\n{amount} บาท\n\nตัวเลือกในการจัดส่ง\n{shipping}",
            setFbOrderMsgTh: (val) => set({ fbOrderMsgTh: val }),
            fbOrderMsgEn: "=== Order Summary ===\n{products}\n🛒 Total (not including shipping)\n{amount} Baht\n\nShipping option\n{shipping}",
            setFbOrderMsgEn: (val) => set({ fbOrderMsgEn: val }),

            // Follow-up settings
            followUpEnabled: false,
            setFollowUpEnabled: (val) => set({ followUpEnabled: val }),
            followUpHours: 60,
            setFollowUpHours: (val) => set({ followUpHours: val }),
            followUpMinutes: 0,
            setFollowUpMinutes: (val) => set({ followUpMinutes: val }),
            followUpReply: "",
            setFollowUpReply: (val) => set({ followUpReply: val }),
            followUpKeyword: "",
            setFollowUpKeyword: (val) => set({ followUpKeyword: val }),

            // Confirmation messages — REAL templates used by API routes
            confirmOrderMsg: `📋 เลขที่การสั่งซื้อ: {orderNumber}
-----------------------------

รอแจ้งหลักฐานการชำระเงิน:
จำนวนเงิน {total} บาท

รายละเอียดสินค้า:
{itemLines}

รายละเอียด:
- ชื่อ: {customerName}
- ที่อยู่: {address}
- เบอร์โทร: {phone}

หมายเหตุ: {note}`,
            setConfirmOrderMsg: (val) => set({ confirmOrderMsg: val }),
            confirmPaymentMsg: `ชำระเงินเรียบร้อย! 🎉
💳 ลูกค้าแนบสลิปชำระเงิน #{orderNumber}
✅ ยอด {total} ฿
📎 สลิปแนบเรียบร้อย
จำนวนเงิน {total} บาท

รายละเอียดสินค้า:
{itemLines}

รายละเอียด:
- ชื่อ: {customerName}
- ที่อยู่: {address}
- เบอร์โทร: {phone}

หมายเหตุ: {note}`,
            setConfirmPaymentMsg: (val) => set({ confirmPaymentMsg: val }),
            tplTrackingButton: `📋 เลขที่การสั่งซื้อ: {orderNumber}

สามารถตรวจสอบสถานะ หรือ แก้ไข
ที่อยู่ในการจัดส่งได้ที่นี่ 👇`,
            setTplTrackingButton: (val) => set({ tplTrackingButton: val }),
            tplAutoCancel: `━━━━━━━━━━━━━━━━━━
⏰  แจ้งยกเลิกคำสั่งซื้ออัตโนมัติ
━━━━━━━━━━━━━━━━━━

📦 ออเดอร์: #{orderNumber}
👤 ชื่อ: {customerName}
📅 วันที่สั่ง: {orderDate}

📋 รายการสินค้า:
{itemLines}

💰 ยอดรวม: {total} บาท
🚫 สถานะ: ยกเลิกอัตโนมัติ (ไม่มีการชำระเงินภายใน 2 ชั่วโมง)

━━━━━━━━━━━━━━━━━━
หากต้องการสั่งซื้อใหม่ หรือ
มีข้อสงสัย ทักแชทได้เลยนะครับ 🙏

🛒 สั่งซื้อสินค้าใหม่ได้ที่:
{shopUrl}`,
            setTplAutoCancel: (val) => set({ tplAutoCancel: val }),
            tplAdminNotify: `💳 ลูกค้าแนบสลิปชำระเงิน #{orderNumber}
✅ ยอด {total} ฿
📎 สลิปแนบเรียบร้อย`,
            setTplAdminNotify: (val) => set({ tplAdminNotify: val }),
            tplAddressConfirm: `✅ ยืนยันการแก้ไขที่อยู่จัดส่งเรียบร้อยแล้ว

📋 เลขที่การสั่งซื้อ: {orderNumber}

ขอบคุณที่แจ้งข้อมูลครับ 🙏`,
            setTplAddressConfirm: (val) => set({ tplAddressConfirm: val }),
            tplFollowUpReminder: `➳ ออเดอร์ #{orderNumber} ของคุณยังรอการชำระเงินอยู่นะครับ

💰 ยอดที่ต้องชำระ: {total} บาท

📋 รายการสินค้า:
{itemLines}

📌 กรุณาชำระเงินและแนบสลิปเพื่อยืนยันการสั่งซื้อ
💡 หากไม่ชำระภายในเวลาที่กำหนด ระบบจะยกเลิกออเดอร์อัตโนมัติ

🛒 หากต้องการสั่งใหม่: {shopUrl}`,
            setTplFollowUpReminder: (val) => set({ tplFollowUpReminder: val }),
            tplCheckoutOrderSummary: `=== สรุปการสั่งซื้อ ===

{itemLines}
-----------------------------
💰 ค่าสินค้า (ไม่รวมค่าส่ง) {subtotal} บาท
-----------------------------
ยอดรวมค่าจัดส่ง
{shippingOptions}`,
            setTplCheckoutOrderSummary: (val) => set({ tplCheckoutOrderSummary: val }),
            tplPayOrderSummary: `🧾 สร้างคำสั่งซื้อ #{orderNumber}
---------------
{itemLines}
---------------
ยอดสินค้า: {subtotal} บาท
{discountLine}
{shippingLine}
{shippingMethodLine}
{paymentMethodLine}
ยอดสุทธิ: {total} บาท

{paymentLinkSection}
สถานะ: รอชำระเงิน`,
            setTplPayOrderSummary: (val) => set({ tplPayOrderSummary: val }),
            tplShippingNotify: `📦 แจ้งจัดส่งสินค้า
────────────────
🧾 ออเดอร์: #{orderNumber}
👤 ชื่อ: {customerName}

🚚 จัดส่งโดย: {shippingProvider}
📦 เลขพัสดุ: {trackingNumber}
🔍 ติดตามพัสดุ: {trackingUrl}
────────────────
ขอบคุณที่สั่งซื้อสินค้านะครับ 🙏
หากมีข้อสงสัย ทักแชทได้เลยครับ`,
            setTplShippingNotify: (val) => set({ tplShippingNotify: val }),
        }),
        {
            name: "settings-store",
            version: 9,
            migrate: (persistedState: any, version: number) => {
                const state = persistedState || {};
                const defaultSlides = [
                    { image: null, text: "" },
                    { image: null, text: "" },
                    { image: null, text: "" },
                ];
                // Migrate old single bannerImage to slide 1
                let slides = state.bannerSlides;
                if (!slides && state.bannerImage) {
                    slides = [
                        { image: state.bannerImage, text: "" },
                        { image: null, text: "" },
                        { image: null, text: "" },
                    ];
                }
                return {
                    ...state,
                    paymentMethods: state.paymentMethods?.map((m: any) =>
                        m.id === "transfer" ? { ...m, id: "bank" } : m
                    ) || undefined,
                    orderFieldsEnabled: state.orderFieldsEnabled ?? true,
                    receiptEnabled: state.receiptEnabled ?? true,
                    receiptName: state.receiptName ?? "",
                    receiptSignature: state.receiptSignature ?? null,
                    customerEditAddress: state.customerEditAddress ?? true,
                    addressRequired: state.addressRequired ?? "required",
                    emailRequired: state.emailRequired ?? "off",
                    phoneRequired: state.phoneRequired ?? "required",
                    lineUrl: state.lineUrl ?? "",
                    phoneNumber: state.phoneNumber ?? "+66891234567",
                    refundPolicyUrl: state.refundPolicyUrl ?? "",
                    salePageTheme: state.salePageTheme ?? "midnight",
                    bannerImage: state.bannerImage ?? null,
                    bannerSlides: slides ?? defaultSlides,
                    phoneHomeNumber: state.phoneHomeNumber ?? true,
                    phonePhoneNumber: state.phonePhoneNumber ?? true,
                    metaAdsEnabled: state.metaAdsEnabled ?? false,
                    fbMsgLang: state.fbMsgLang ?? "th",
                    fbOrderMsgTh: state.fbOrderMsgTh ?? "=== สรุปการสั่งซื้อ ===\n{products}\n🛒 ค่าสินค้า (ไม่รวมค่าส่ง)\n{amount} บาท\n\nตัวเลือกในการจัดส่ง\n{shipping}",
                    fbOrderMsgEn: state.fbOrderMsgEn ?? "=== Order Summary ===\n{products}\n🛒 Total (not including shipping)\n{amount} Baht\n\nShipping option\n{shipping}",
                    followUpEnabled: state.followUpEnabled ?? false,
                    followUpHours: state.followUpHours ?? 60,
                    followUpMinutes: state.followUpMinutes ?? 0,
                    followUpReply: state.followUpReply ?? "",
                    followUpKeyword: state.followUpKeyword ?? "",
                    confirmOrderMsg: undefined, // v7: reset to real templates
                    confirmPaymentMsg: undefined,
                    tplTrackingButton: state.tplTrackingButton ?? undefined,
                    tplAutoCancel: state.tplAutoCancel ?? undefined,
                    tplAdminNotify: state.tplAdminNotify ?? undefined,
                    tplAddressConfirm: state.tplAddressConfirm ?? undefined,
                    tplFollowUpReminder: state.tplFollowUpReminder ?? undefined,
                    tplCheckoutOrderSummary: state.tplCheckoutOrderSummary ?? undefined,
                    tplPayOrderSummary: state.tplPayOrderSummary ?? undefined,
                    tplShippingNotify: state.tplShippingNotify ?? undefined,
                };
            },
        }
    )
);
