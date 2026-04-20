"use client";

import { Product } from "@/types";
import { useCartStore } from "@/store/useCartStore";
import { shopConfig } from "@/data";

interface ProductCardProps {
    product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
    const { openProductModal } = useCartStore();

    return (
        <button
            onClick={() => openProductModal(product.id)}
            className="card-product group text-left w-full overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-surface-900"
            aria-label={`View ${product.name}`}
        >
            {/* Image */}
            <div className="relative aspect-square overflow-hidden bg-surface-800">
                <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                />

                {/* Badge */}
                {product.badge && (
                    <div
                        className={`absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold text-white ${product.badge === "SALE"
                            ? "bg-red-500"
                            : "bg-green-500"
                            }`}
                    >
                        {product.badge}
                    </div>
                )}
            </div>

            {/* Info - left-aligned like original */}
            <div className="p-4">
                <h3 className="text-xs text-surface-100 line-clamp-2 mb-2 leading-snug font-normal">
                    {product.name}
                </h3>
                <p className="text-sm text-price font-semibold">
                    <span className="currency-symbol">{shopConfig.currencySymbol}</span>
                    {product.price.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                    })}
                </p>
            </div>
        </button>
    );
}
