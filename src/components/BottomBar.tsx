"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/store/useCartStore";
import { shopConfig } from "@/data";
import { ShoppingCart } from "lucide-react";

export default function BottomBar() {
    const { setCartOpen, getTotalItems, getTotalPrice, language, isProductModalOpen, isCartOpen, checkoutStep } = useCartStore();

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const totalItems = mounted ? getTotalItems() : 0;
    const totalPrice = mounted ? getTotalPrice() : 0;

    // Hide when modal or cart is open or during checkout
    if (isProductModalOpen || isCartOpen || checkoutStep !== "cart") return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-20" style={{ height: 68 }}>
            <button
                onClick={() => setCartOpen(true)}
                className="w-full h-full bg-[#4267B2] text-white/70
                   flex flex-col items-center justify-center gap-0.5
                   hover:bg-[#365899] transition-all duration-200
                   active:scale-[0.99]"
            >
                <ShoppingCart className="w-5 h-5 text-white/70" />
                <span className="text-sm font-normal">
                    {language === "th" ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Product balance summary" : "สรุปยอดสินค้า") : "Order Summary"}
                </span>
            </button>
        </div>
    );
}
