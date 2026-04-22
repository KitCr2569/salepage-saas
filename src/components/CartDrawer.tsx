"use client";

import { useCartStore } from "@/store/useCartStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { shopConfig } from "@/data";
import { X, Minus, Plus, Trash2, Send } from "lucide-react";
import { useState } from "react";
import { Trans } from "@/components/Trans";

const FACEBOOK_PAGE_ID = process.env.NEXT_PUBLIC_FB_PAGE_ID || "";

export default function CartDrawer() {
    const {
        isCartOpen,
        setCartOpen,
        items,
        removeItem,
        updateQuantity,
        getTotalPrice,
        language,
    } = useCartStore();

    const allShippingMethods = useSettingsStore((s) => s.shippingMethods);
    const activeShipping = allShippingMethods.filter((m) => m.enabled);

    const [isSending, setIsSending] = useState(false);

    if (!isCartOpen) return null;

    const totalPrice = getTotalPrice();

    const handleProceedToCheckout = async () => {
        if (items.length === 0) return;
        setIsSending(true);

        try {
            // Build cart ref string based on the minimal cart schema
            const cartRef = items.map((item) => ({
                pid: item.productId,
                qty: item.quantity,
                option: item.variantId,
                name: item.name,
                price: item.price,
                optionName: item.variantName,
                image: item.image,
                cart_remark: "",
            }));

            // ส่ง cart json ผ่าน ref url เพราะ Webhook ฝั่งเซิร์ฟเวอร์ไม่ได้อ่านจาก Database แล้ว (หลบ Prisma Limit)
            const encodedCart = encodeURIComponent(JSON.stringify(cartRef));
            const refString = `tempcart_${encodedCart}|source=cart_drawer`;
            const messengerUrl = `https://m.me/${FACEBOOK_PAGE_ID}?ref=${encodeURIComponent(refString)}`;
            
            // Redirect ไป Messenger
            window.location.href = messengerUrl;
            setCartOpen(false);
        } catch (err) {
            console.error("Checkout error:", err);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="overlay-backdrop"
                onClick={() => setCartOpen(false)}
            />

            {/* Drawer */}
            <div className="fixed inset-0 z-50 bg-white flex flex-col">
                {/* Header */}
                <div className="flex items-center h-14 px-2 border-b border-gray-200 bg-white flex-shrink-0">
                    <button
                        onClick={() => setCartOpen(false)}
                        className="p-2 hover:bg-gray-100 transition-colors rounded-full"
                        aria-label="Close cart"
                    >
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                    <h2 className="flex-1 text-center text-sm font-bold text-black/[0.87]">
                        {language === "th" ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Summary of products in the cart" : "สรุปยอดสินค้าในตะกร้า") : "Cart Summary"}
                    </h2>
                    <div className="w-9" />
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <div className="text-6xl mb-4">🛒</div>
                            <p className="text-base">
                                {language === "th" ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "The basket is empty." : "ตะกร้าว่างเปล่า") : "Cart is empty"}
                            </p>
                            <p className="text-sm mt-1">
                                {language === "th"
                                    ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Add products to start shopping" : "เพิ่มสินค้าเพื่อเริ่มช้อปปิ้ง")
                                    : "Add products to start shopping"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map((item) => (
                                <div
                                    key={`${item.productId}-${item.variantId}`}
                                    className="flex gap-4 py-4 border-b border-gray-100"
                                >
                                    {/* Image */}
                                    <div className="w-24 h-24 flex-shrink-0 bg-gray-100">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm text-black/[0.87]">
                                            {item.name}
                                        </h4>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            ({item.variantName})
                                        </p>
                                        <p className="text-sm text-[#4267B2] mt-1">
                                            <span className="currency-symbol">{shopConfig.currencySymbol}</span>
                                            {item.price.toLocaleString("en-US", {
                                                minimumFractionDigits: 2,
                                            })}
                                        </p>

                                        {/* Quantity Controls */}
                                        <div className="flex items-center gap-2 mt-2">
                                            <button
                                                onClick={() =>
                                                    updateQuantity(
                                                        item.productId,
                                                        item.variantId,
                                                        item.quantity - 1
                                                    )
                                                }
                                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center
                                   hover:bg-gray-100 transition-colors"
                                                aria-label="Decrease"
                                            >
                                                <Minus className="w-3.5 h-3.5 text-gray-600" />
                                            </button>
                                            <span className="w-8 text-center text-sm">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    updateQuantity(
                                                        item.productId,
                                                        item.variantId,
                                                        item.quantity + 1
                                                    )
                                                }
                                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center
                                   hover:bg-gray-100 transition-colors"
                                                aria-label="Increase"
                                            >
                                                <Plus className="w-3.5 h-3.5 text-gray-600" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Delete */}
                                    <button
                                        onClick={() => removeItem(item.productId, item.variantId)}
                                        className="p-1.5 self-start hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                        aria-label="Remove item"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination placeholder */}
                {items.length > 0 && (
                    <div className="flex items-center justify-center py-2 border-t border-gray-100 bg-gray-50">
                        <div className="flex items-center gap-2">
                            <button className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center text-gray-400">
                                <ChevronLeftIcon />
                            </button>
                            <span className="w-8 h-8 rounded bg-[#4267B2] text-white flex items-center justify-center text-sm font-medium">
                                1
                            </span>
                            <button className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center text-gray-400">
                                <ChevronRightIcon />
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer - Checkout */}
                {items.length > 0 && (
                    <div className="border-t border-gray-200 bg-white">
                        {/* Order Summary Preview */}
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                            <div className="text-[11px] text-gray-500 font-medium mb-1.5">
                                {language === "th" ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "📋 Summary of orders that will be sent to chat:" : "📋 สรุปออเดอร์ที่จะส่งเข้าแชท:") : "📋 Order summary to send:"}
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 p-3 text-[11px] text-gray-600 font-mono leading-relaxed max-h-32 overflow-y-auto">
                                <div className="font-bold text-gray-800 text-center mb-1">{<Trans th="=== สรุปการสั่งซื้อ ===" en="=== Order summary ===" />}</div>
                                {items.map((item, index) => {
                                    const itemTotal = item.price * item.quantity;
                                    const qtyText = item.quantity > 1 ? ` x${item.quantity}` : "";
                                    const displayVariant = item.variantName && !item.name.includes(item.variantName) ? ` [${item.variantName}]` : "";
                                    return (
                                        <div key={`${item.productId}-${item.variantId}`}>
                                            {index + 1}. {item.name}{displayVariant}{qtyText}: {itemTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} <Trans th="บาท" en="baht" />
                                                                                    </div>
                                    );
                                })}
                                <div className="my-1 text-gray-300">-----------------------------</div>
                                <div><Trans th="💰ค่าสินค้า (ไม่รวมค่าส่ง)" en="💰Product cost (not including shipping costs)" /> {totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} {<Trans th="บาท" en="baht" />}</div>
                                <div className="my-1 text-gray-300">-----------------------------</div>
                                <div className="font-medium">{<Trans th="ยอดรวมค่าจัดส่ง" en="Total shipping cost" />}</div>
                                {activeShipping.map((method) => (
                                    <div key={method.id}>
                                        📦{method.name} +{method.price} = {(totalPrice + method.price).toLocaleString("en-US", { minimumFractionDigits: 2 })} <Trans th="บาท" en="baht" />
                                                                            </div>
                                ))}
                            </div>
                        </div>

                        {/* Total + Send button */}
                        <div className="flex items-center justify-between px-4 py-3">
                            <span className="text-sm text-black/[0.87]">
                                {language === "th" ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Total" : "ยอดรวม") : "Total"}
                            </span>
                            <span className="text-base font-normal text-black/[0.87]">
                                <span className="currency-symbol">{shopConfig.currencySymbol}</span>
                                {totalPrice.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                })}
                            </span>
                        </div>
                        <button
                            onClick={handleProceedToCheckout}
                            disabled={isSending}
                            className="w-full bg-[#4267B2] text-white py-4 flex items-center justify-center gap-2
                         hover:bg-[#365899] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{ height: 68 }}
                        >
                            <Send className="w-5 h-5" />
                            <span className="text-sm font-medium">
                                {isSending
                                    ? (language === "th" ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Sending..." : "กำลังส่ง...") : "Sending...")
                                    : (language === "th" ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Process payment" : "ดำเนินการชำระสินค้า") : "Proceed to Checkout")}
                            </span>
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}

function ChevronLeftIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
    );
}

function ChevronRightIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    );
}
