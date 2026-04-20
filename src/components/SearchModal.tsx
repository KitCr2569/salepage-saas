"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/store/useCartStore";
import { useProductStore } from "@/store/useProductStore";
import { Search, X } from "lucide-react";

export default function SearchModal() {
    const { isSearchOpen, setSearchOpen, searchQuery, setSearchQuery, openProductModal, language } =
        useCartStore();
    const { products } = useProductStore();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isSearchOpen]);

    // Close on escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isSearchOpen) {
                setSearchOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isSearchOpen, setSearchOpen]);

    if (!isSearchOpen) return null;

    const results = searchQuery
        ? products.filter(
            (p) =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : [];

    return (
        <>
            <div className="overlay-backdrop animate-fade-in" onClick={() => setSearchOpen(false)} />
            <div className="fixed inset-x-0 top-0 z-50 bg-white shadow-2xl animate-slide-down max-h-[80vh] overflow-hidden flex flex-col">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                    <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={language === "th" ? "ค้นหาสินค้า..." : "Search products..."}
                        className="flex-1 text-base outline-none bg-transparent placeholder-gray-400"
                    />
                    <button
                        onClick={() => {
                            setSearchQuery("");
                            setSearchOpen(false);
                        }}
                        className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label="Close search"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto">
                    {searchQuery && results.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <p className="text-base">
                                {language === "th" ? "ไม่พบสินค้า" : "No products found"}
                            </p>
                        </div>
                    )}

                    {results.length > 0 && (
                        <div className="divide-y divide-gray-50">
                            {results.slice(0, 10).map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => {
                                        setSearchOpen(false);
                                        setSearchQuery("");
                                        openProductModal(product.id);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                                >
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                        <img
                                            src={product.images[0]}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">
                                            {product.name}
                                        </p>
                                        <p className="text-sm text-[#4267B2] font-semibold">
                                            ฿{product.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {!searchQuery && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <Search className="w-10 h-10 mb-3 opacity-30" />
                            <p className="text-sm">
                                {language === "th" ? "พิมพ์เพื่อค้นหาสินค้า" : "Type to search products"}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
