"use client";

import { useCartStore } from "@/store/useCartStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useCustomerStore } from "@/store/useCustomerStore";
import { shopConfig } from "@/data";
import { CheckCircle2, MessageCircle } from "lucide-react";

export default function CheckoutFlow() {
    const {
        checkoutStep,
        setCheckoutStep,
        language,
    } = useCartStore();

    // Only show the "complete" screen
    if (checkoutStep !== "complete") return null;

    return (
        <div className="fixed inset-0 z-40 bg-white flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
                <div className="w-7" />
                <h2 className="text-base font-bold text-gray-800 flex-1 text-center">
                    {language === "th" ? "ส่งออเดอร์แล้ว" : "Order Sent"}
                </h2>
                <div className="w-7" />
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6 animate-scale-in">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {language === "th" ? "ส่งออเดอร์สำเร็จ!" : "Order Sent!"}
                </h3>
                <p className="text-gray-500 max-w-sm mb-4">
                    {language === "th"
                        ? "สรุปออเดอร์ถูกส่งไปยัง Messenger แล้ว กรุณาตรวจสอบและยืนยันออเดอร์ในแชท"
                        : "Your order summary has been sent to Messenger. Please check and confirm your order in the chat."}
                </p>

                <div className="flex items-center gap-2 bg-blue-50 text-[#4267B2] px-4 py-2.5 rounded-xl text-sm font-medium mb-8">
                    <MessageCircle className="w-4 h-4" />
                    {language === "th"
                        ? "ดูสรุปออเดอร์ใน Messenger"
                        : "View order summary in Messenger"}
                </div>

                <button
                    onClick={() => setCheckoutStep("cart")}
                    className="btn-primary"
                >
                    {language === "th" ? "กลับหน้าร้าน" : "Back to Shop"}
                </button>
            </div>
        </div>
    );
}
