"use client";

import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import { useProductStore } from "./useProductStore";
import { products as defaultProducts, shopConfig as defaultShopConfig, categories as defaultCategories, shippingMethods, paymentMethods } from "@/data";
import type { Product, Category, Texture } from "@/types";

// ─── Zustand shop store ─────────────────────────────────────────
interface ShopStore {
    shopConfig: typeof defaultShopConfig;
    products: Product[];
    categories: Category[];
    textures: Texture[];
    shippingMethods: typeof shippingMethods;
    paymentMethods: typeof paymentMethods;
    isLoading: boolean;
    shopId: string | null;
    syncWithPage: () => Promise<void>;
}

export const useShopStore = create<ShopStore>((set) => ({
    shopConfig: defaultShopConfig,
    products: defaultProducts,
    categories: defaultCategories,
    textures: [],
    shippingMethods,
    paymentMethods,
    isLoading: false,
    shopId: null,

    syncWithPage: async () => {
        const connectedPage = useAuthStore.getState().connectedPage;
        if (!connectedPage) return;

        const pageId = connectedPage.id;
        set({ isLoading: true });

        try {
            // 1. เรียก API ดึงข้อมูลร้านจาก database
            const res = await fetch(`/api/shop/${pageId}?admin=1`);
            const json = await res.json();

            if (json.success && json.data) {
                const { shopConfig: apiShopConfig, products: apiProducts, categories: apiCategories, textures: apiTextures, shopId } = json.data;

                // Override logo/name with connected page data if available
                const finalConfig = {
                    ...apiShopConfig,
                    shopLogo: connectedPage.picture || apiShopConfig.shopLogo,
                    shopName: connectedPage.name || apiShopConfig.shopName,
                };

                set({
                    shopConfig: finalConfig,
                    products: apiProducts,
                    categories: apiCategories,
                    textures: apiTextures || [],
                    shopId,
                    isLoading: false,
                });

                // Also sync to useProductStore so ProductGrid updates
                useProductStore.setState({
                    products: apiProducts,
                    categories: apiCategories,
                    textures: apiTextures || [],
                });

                return;
            }
        } catch (err) {
            console.warn("Failed to fetch shop from API, using fallback:", err);
        }

        // Fallback: ใช้ข้อมูล default
        set({
            shopConfig: {
                ...defaultShopConfig,
                shopLogo: connectedPage.picture || defaultShopConfig.shopLogo,
                shopName: connectedPage.name || defaultShopConfig.shopName,
            },
            products: defaultProducts,
            categories: defaultCategories,
            textures: [],
            isLoading: false,
        });

        useProductStore.setState({
            products: defaultProducts,
            categories: defaultCategories,
            textures: [],
        });
    },
}));

// ─── Auto-sync when connectedPage CHANGES (login / switch page) ─
// ⚠️ ไม่ใช้ fireImmediately: true เพราะจะ sync ทุก page รวมถึง sale page
// ทำให้ข้อมูลของ sale page ถูก overwrite ด้วย connectedPage ของ admin
useAuthStore.subscribe(
    (state) => state.connectedPage,
    (connectedPage) => {
        if (connectedPage) {
            useShopStore.getState().syncWithPage();
        }
    }
    // ไม่ใส่ { fireImmediately: true } — admin page จะ call syncWithPage() เองตอน mount
);
