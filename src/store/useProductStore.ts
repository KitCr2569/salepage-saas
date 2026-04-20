"use client";

import { create } from "zustand";
import { Product, Category, Texture } from "@/types";

interface ProductStore {
    products: Product[];
    categories: Category[];
    textures: Texture[];
    addProduct: (product: Product) => void;
    updateProduct: (id: string, data: Partial<Product>) => void;
    deleteProduct: (id: string) => void;
    addCategory: (category: Category) => void;
    removeCategory: (id: string) => void;
    addTexture: (texture: Texture) => void;
    updateTexture: (id: string, data: Partial<Texture>) => void;
    deleteTexture: (id: string) => void;
    getProduct: (id: string) => Product | undefined;
}

// ไม่ใช้ persist เพราะ base64 images ทำให้ localStorage quota เต็ม
// ข้อมูลถูก fetch จาก DB ทุกครั้งผ่าน syncWithPage() และ page mount effects
export const useProductStore = create<ProductStore>()((set, get) => ({
    products: [],
    categories: [],
    textures: [],

    addProduct: (product) =>
        set((state) => ({
            products: [...state.products, product],
        })),

    updateProduct: (id, data) =>
        set((state) => ({
            products: state.products.map((p) =>
                p.id === id ? { ...p, ...data } : p
            ),
        })),

    deleteProduct: (id) =>
        set((state) => ({
            products: state.products.filter((p) => p.id !== id),
        })),

    addCategory: (category) =>
        set((state) => ({
            categories: [...state.categories, category],
        })),

    removeCategory: (id) =>
        set((state) => ({
            categories: state.categories.filter((c) => c.id !== id),
        })),

    addTexture: (texture) =>
        set((state) => ({
            textures: [...state.textures, texture],
        })),

    updateTexture: (id, data) =>
        set((state) => ({
            textures: state.textures.map((t) =>
                t.id === id ? { ...t, ...data } : t
            ),
        })),

    deleteTexture: (id) =>
        set((state) => ({
            textures: state.textures.filter((t) => t.id !== id),
        })),

    getProduct: (id) => get().products.find((p) => p.id === id),
}));
