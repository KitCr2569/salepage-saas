"use client";

import { useCartStore } from "@/store/useCartStore";
import { useProductStore } from "@/store/useProductStore";
import ProductCard from "./ProductCard";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 10;

export default function ProductGrid() {
    const { activeCategory, searchQuery } = useCartStore();
    const { products } = useProductStore();
    const [currentPage, setCurrentPage] = useState(1);

    const filteredProducts = useMemo(() => {
        let filtered = products;

        // Filter by category
        if (activeCategory !== "all") {
            if (activeCategory === "sale") {
                filtered = filtered.filter((p) => p.badge === "SALE");
            } else {
                filtered = filtered.filter((p) => p.categoryId === activeCategory);
            }
        }

        // Filter by search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (p) =>
                    p.name.toLowerCase().includes(q) ||
                    p.description.toLowerCase().includes(q)
            );
        }

        return filtered;
    }, [activeCategory, searchQuery, products]);

    // Reset page when filters change
    useMemo(() => {
        setCurrentPage(1);
    }, [activeCategory, searchQuery]);

    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="px-4 max-w-7xl mx-auto">
            {/* Product Count */}
            <div className="mb-4 text-sm text-surface-400">
                {filteredProducts.length} รายการ
            </div>

            {/* Grid */}
            {paginatedProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                    {paginatedProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-surface-400">
                    <div className="text-6xl mb-4">🔍</div>
                    <p className="text-lg font-medium">ไม่พบสินค้า</p>
                    <p className="text-sm mt-1">ลองค้นหาด้วยคำอื่น</p>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8 mb-4">
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="w-10 h-10 rounded-lg border border-surface-700 flex items-center justify-center
                       text-surface-300 hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed
                       transition-colors"
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${page === currentPage
                                ? "bg-primary-500 text-white shadow-md shadow-primary-900"
                                : "border border-surface-700 text-surface-300 hover:bg-surface-800"
                                }`}
                        >
                            {page}
                        </button>
                    ))}

                    <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="w-10 h-10 rounded-lg border border-surface-700 flex items-center justify-center
                       text-surface-300 hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed
                       transition-colors"
                        aria-label="Next page"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
