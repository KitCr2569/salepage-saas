"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem, CheckoutStep, DeliveryInfo, Language } from "@/types";

interface CartStore {
    // Cart
    items: CartItem[];
    addItem: (item: CartItem) => void;
    removeItem: (productId: string, variantId: string) => void;
    updateQuantity: (productId: string, variantId: string, quantity: number) => void;
    clearCart: () => void;
    getTotalItems: () => number;
    getTotalPrice: () => number;

    // UI State
    isCartOpen: boolean;
    setCartOpen: (open: boolean) => void;
    isProductModalOpen: boolean;
    selectedProductId: string | null;
    openProductModal: (productId: string) => void;
    closeProductModal: () => void;
    isSearchOpen: boolean;
    setSearchOpen: (open: boolean) => void;

    // Checkout
    checkoutStep: CheckoutStep;
    setCheckoutStep: (step: CheckoutStep) => void;
    deliveryInfo: DeliveryInfo;
    setDeliveryInfo: (info: Partial<DeliveryInfo>) => void;
    selectedShipping: string;
    setSelectedShipping: (id: string) => void;
    selectedPayment: string;
    setSelectedPayment: (id: string) => void;

    // Language
    language: Language;
    setLanguage: (lang: Language) => void;

    // Category
    activeCategory: string;
    setActiveCategory: (id: string) => void;

    // Search
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            // Cart items
            items: [],

            addItem: (item: CartItem) => {
                const { items } = get();
                const existing = items.find(
                    (i) => i.productId === item.productId && i.variantId === item.variantId
                );
                if (existing) {
                    set({
                        items: items.map((i) =>
                            i.productId === item.productId && i.variantId === item.variantId
                                ? { ...i, quantity: i.quantity + item.quantity }
                                : i
                        ),
                    });
                } else {
                    set({ items: [...items, item] });
                }
            },

            removeItem: (productId: string, variantId: string) => {
                set({
                    items: get().items.filter(
                        (i) => !(i.productId === productId && i.variantId === variantId)
                    ),
                });
            },

            updateQuantity: (productId: string, variantId: string, quantity: number) => {
                if (quantity <= 0) {
                    get().removeItem(productId, variantId);
                    return;
                }
                set({
                    items: get().items.map((i) =>
                        i.productId === productId && i.variantId === variantId
                            ? { ...i, quantity }
                            : i
                    ),
                });
            },

            clearCart: () => set({ items: [] }),

            getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

            getTotalPrice: () =>
                get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

            // UI State
            isCartOpen: false,
            setCartOpen: (open) => {
                set({ isCartOpen: open });
                if (open) {
                    document.body.style.overflow = "hidden";
                } else {
                    document.body.style.overflow = "";
                }
            },

            isProductModalOpen: false,
            selectedProductId: null,
            openProductModal: (productId) => {
                set({ isProductModalOpen: true, selectedProductId: productId });
                window.location.hash = "modal-open";
                document.body.style.overflow = "hidden";
            },
            closeProductModal: () => {
                set({ isProductModalOpen: false, selectedProductId: null });
                if (window.location.hash === "#modal-open") {
                    history.replaceState(null, "", window.location.pathname + window.location.search);
                }
                document.body.style.overflow = "";
            },

            isSearchOpen: false,
            setSearchOpen: (open) => {
                set({ isSearchOpen: open });
                if (open) {
                    document.body.style.overflow = "hidden";
                } else {
                    document.body.style.overflow = "";
                }
            },

            // Checkout
            checkoutStep: "cart",
            setCheckoutStep: (step) => set({ checkoutStep: step }),

            deliveryInfo: {
                name: "",
                phone: "",
                address: "",
                province: "",
                district: "",
                subDistrict: "",
                postalCode: "",
                note: "",
            },
            setDeliveryInfo: (info) =>
                set({ deliveryInfo: { ...get().deliveryInfo, ...info } }),

            selectedShipping: "registered",
            setSelectedShipping: (id) => set({ selectedShipping: id }),

            selectedPayment: "transfer",
            setSelectedPayment: (id) => set({ selectedPayment: id }),

            // Language
            language: "th",
            setLanguage: (lang) => set({ language: lang }),

            // Category
            activeCategory: "all",
            setActiveCategory: (id) => set({ activeCategory: id }),

            // Search
            searchQuery: "",
            setSearchQuery: (query) => set({ searchQuery: query }),
        }),
        {
            name: "shop-cart-storage",
            partialize: (state) => ({
                items: state.items,
                language: state.language,
                deliveryInfo: state.deliveryInfo,
                selectedShipping: state.selectedShipping,
                selectedPayment: state.selectedPayment,
            }),
        }
    )
);
