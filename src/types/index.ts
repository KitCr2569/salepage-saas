// Product & Cart Types

export interface ProductVariant {
    id: string;
    name: string;
    price: number;
    image?: string;
    stock: number;
}

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    images: string[];
    categoryId: string;
    variants: ProductVariant[];
    badge?: string; // e.g. "SALE", "NEW"
    active?: boolean; // true = visible on sale page, false = hidden (defaults to true)
    sortOrder?: number;
    createdAt?: number; // timestamp
}

export interface Category {
    id: string;
    name: string;
    nameEn: string;
}

export interface Texture {
    id: string;
    series: string;
    code: string;
    name: string;
    image: string;
    isActive?: boolean;
    sortOrder?: number;
    createdAt?: number;
}

export interface CartItem {
    productId: string;
    variantId: string;
    name: string;
    variantName: string;
    price: number;
    quantity: number;
    image: string;
}

export interface DeliveryInfo {
    name: string;
    phone: string;
    email?: string;
    address: string;
    province: string;
    district: string;
    subDistrict: string;
    postalCode: string;
    note: string;
}

export type CheckoutStep = "cart" | "delivery" | "summary" | "complete";

export type Language = "th" | "en";

export interface ShopConfig {
    shopName: string;
    shopLogo: string;
    currency: string;
    currencySymbol: string;
}
