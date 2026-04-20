"use client";

import { useState, useCallback, useRef } from "react";
import { useCartStore } from "@/store/useCartStore";
import { useProductStore } from "@/store/useProductStore";
import { shopConfig } from "@/data";
import {
    X,
    ChevronLeft,
    ChevronRight,
    Minus,
    Plus,
    ShoppingCart,
    ZoomIn,
} from "lucide-react";

export default function ProductModal() {
    const {
        isProductModalOpen,
        selectedProductId,
        closeProductModal,
        addItem,
        setCartOpen,
        language,
        getTotalItems,
        getTotalPrice,
    } = useCartStore();

    const { products } = useProductStore();

    const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<"options" | "details">("options");
    const [addedFeedback, setAddedFeedback] = useState(false);
    const [zoomOpen, setZoomOpen] = useState(false);
    const [flyAnim, setFlyAnim] = useState<{ x: number; y: number; img: string } | null>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const cartBtnRef = useRef<HTMLButtonElement>(null);

    const product = products.find((p) => p.id === selectedProductId);

    const handleAddToCart = useCallback(() => {
        if (!product) return;
        const variant = product.variants.find((v) => v.id === selectedVariant) || product.variants[0];

        // Fly-to-cart animation
        if (imageRef.current && cartBtnRef.current) {
            const imgRect = imageRef.current.getBoundingClientRect();
            const cartRect = cartBtnRef.current.getBoundingClientRect();
            const flyImg = variant.image || product.images[0];
            setFlyAnim({ x: imgRect.left + imgRect.width / 2, y: imgRect.top + imgRect.height / 2, img: flyImg });
            // Animate to cart button position
            setTimeout(() => {
                setFlyAnim((prev) => prev ? { ...prev, x: cartRect.left + cartRect.width / 2, y: cartRect.top + cartRect.height / 2 } : null);
            }, 50);
            setTimeout(() => setFlyAnim(null), 650);
        }

        addItem({
            productId: product.id,
            variantId: variant.id,
            name: product.name,
            variantName: variant.name,
            price: variant.price,
            quantity,
            image: product.images[0],
        });

        setAddedFeedback(true);
        setTimeout(() => setAddedFeedback(false), 1500);
    }, [product, selectedVariant, quantity, addItem]);

    const handleBuyNow = useCallback(() => {
        if (!product) return;
        const variant = product.variants.find((v) => v.id === selectedVariant) || product.variants[0];

        addItem({
            productId: product.id,
            variantId: variant.id,
            name: product.name,
            variantName: variant.name,
            price: variant.price,
            quantity,
            image: product.images[0],
        });

        closeProductModal();
        setCartOpen(true);
    }, [product, selectedVariant, quantity, addItem, closeProductModal, setCartOpen]);

    const handleClose = useCallback(() => {
        closeProductModal();
        setSelectedVariant(null);
        setQuantity(1);
        setCurrentImageIndex(0);
        setActiveTab("options");
        setZoomOpen(false);
    }, [closeProductModal]);

    if (!isProductModalOpen || !product) return null;

    const currentVariant =
        product.variants.find((v) => v.id === selectedVariant) || product.variants[0];
    const displayPrice = currentVariant?.price ?? product.price;

    const variantImage = currentVariant?.image || null;
    const displayImages = variantImage
        ? [variantImage, ...product.images]
        : product.images;
    const currentDisplayImage = variantImage && currentImageIndex === 0
        ? variantImage
        : displayImages[currentImageIndex] || product.images[0];

    const totalItems = getTotalItems();

    return (
        <>
            {/* Zoom Overlay */}
            {zoomOpen && (
                <div
                    className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center cursor-zoom-out"
                    onClick={() => setZoomOpen(false)}
                >
                    <button
                        onClick={() => setZoomOpen(false)}
                        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                    <img
                        src={currentDisplayImage}
                        alt={currentVariant?.name || product.name}
                        className="max-w-[90vw] max-h-[90vh] object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                    {variantImage && currentImageIndex === 0 && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 text-white px-6 py-2 rounded-full text-sm">
                            {currentVariant.name}
                        </div>
                    )}
                </div>
            )}

            {/* Fullscreen Product Page */}
            <div className="fixed inset-0 z-50 bg-surface-900 overflow-y-auto">
                {/* X close - top left */}
                <button
                    onClick={handleClose}
                    className="fixed top-3 left-3 z-[55] w-8 h-8 flex items-center justify-center hover:bg-surface-800 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-surface-200" />
                </button>

                {/* Cart summary - top right */}
                <button
                    ref={cartBtnRef}
                    onClick={() => { closeProductModal(); setCartOpen(true); }}
                    className="fixed top-3 right-3 z-[55] bg-surface-800 border border-surface-700 shadow-sm px-3 py-1.5 rounded-sm flex items-center gap-2 text-xs text-surface-200 hover:bg-surface-700 transition-colors"
                >
                    <div className="relative">
                        <ShoppingCart className="w-4 h-4" />
                        {totalItems > 0 && (
                            <span className="absolute -top-2 -right-3 min-w-[16px] h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold px-1">
                                {totalItems}
                            </span>
                        )}
                    </div>
                    <span className="ml-1">{language === "th" ? "สรุปยอดสินค้า" : "Cart Summary"}</span>
                </button>

                {/* ===== Content ===== */}
                <div className="pt-12 pb-20">
                    {/* Image Section - centered small image like original */}
                    <div className="relative flex items-center justify-center" style={{ minHeight: '220px' }}>
                        {/* Left Arrow - edge of viewport */}
                        {displayImages.length > 1 && (
                            <button
                                onClick={() => setCurrentImageIndex((i) => i === 0 ? displayImages.length - 1 : i - 1)}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-100 transition-colors"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                        )}

                        {/* Centered Image Card */}
                        <div className="text-center">
                            <div className="relative inline-block">
                                <img
                                    ref={imageRef}
                                    src={currentDisplayImage}
                                    alt={currentVariant?.name || product.name}
                                    className="h-[180px] w-auto object-contain cursor-zoom-in"
                                    onClick={() => setZoomOpen(true)}
                                />
                                {/* Zoom icon */}
                                <button
                                    onClick={() => setZoomOpen(true)}
                                    className="absolute top-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors"
                                >
                                    <ZoomIn className="w-4 h-4 text-white" />
                                </button>
                            </div>
                            {/* Variant name below image */}
                            {variantImage && currentImageIndex === 0 && (
                                <p className="text-xs text-surface-400 mt-2">{currentVariant.name}</p>
                            )}
                        </div>

                        {/* Right Arrow - edge of viewport */}
                        {displayImages.length > 1 && (
                            <button
                                onClick={() => setCurrentImageIndex((i) => i === displayImages.length - 1 ? 0 : i + 1)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-100 transition-colors"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        )}
                    </div>

                    {/* Product Name & Price - left aligned */}
                    <div className="px-6 py-3">
                        <h1 className="text-sm font-normal text-surface-100">{product.name}</h1>
                        <p className="text-base text-price font-semibold">
                            <span className="currency-symbol">{shopConfig.currencySymbol}</span>{displayPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                    </div>

                    {/* Tab Bar - full width blue like original */}
                    <div className="flex bg-primary-600">
                        <button
                            onClick={() => setActiveTab("options")}
                            className={`flex-1 py-2.5 text-sm text-center transition-colors ${activeTab === "options"
                                ? "text-white border-b-2 border-white font-medium"
                                : "text-white/60 hover:text-white/80"
                                }`}
                        >
                            {language === "th" ? "ตัวเลือกสินค้า" : "Options"}
                        </button>
                        <button
                            onClick={() => setActiveTab("details")}
                            className={`flex-1 py-2.5 text-sm text-center transition-colors ${activeTab === "details"
                                ? "text-white border-b-2 border-white font-medium"
                                : "text-white/60 hover:text-white/80"
                                }`}
                        >
                            {language === "th" ? "รายละเอียดสินค้า" : "Details"}
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="px-6 py-4">
                        {activeTab === "options" ? (
                            <div className="flex flex-wrap gap-1.5">
                                {product.variants.map((variant) => {
                                    const isActive = (selectedVariant || product.variants[0].id) === variant.id;
                                    return (
                                        <button
                                            key={variant.id}
                                            onClick={() => {
                                                setSelectedVariant(variant.id);
                                                setCurrentImageIndex(0);
                                            }}
                                            className={`flex items-center gap-1 pl-0.5 pr-2.5 py-0.5 rounded-full text-[11px] border transition-all ${isActive
                                                ? "border-primary-500 bg-primary-600 text-white shadow-[0_0_10px_rgba(124,58,237,0.4)]"
                                                : "border-surface-600 text-surface-300 hover:border-primary-400 hover:bg-surface-800"
                                                }`}
                                        >
                                            {variant.image && (
                                                <img
                                                    src={variant.image}
                                                    alt={variant.name}
                                                    className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                                                />
                                            )}
                                            <span>{variant.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex items-start justify-between gap-4">
                                <div className="text-sm text-surface-300 leading-relaxed whitespace-pre-line flex-1">
                                    {product.description}
                                </div>
                                <button className="flex-shrink-0 bg-gradient-to-r from-orange-400 to-yellow-400 text-white text-[10px] px-3 py-1.5 rounded-full font-medium flex items-center gap-1 shadow">
                                    🔄 สลับรูปสไตล์
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Fly-to-cart animation element */}
                {flyAnim && (
                    <div
                        className="fixed z-[60] pointer-events-none"
                        style={{
                            left: flyAnim.x - 25,
                            top: flyAnim.y - 25,
                            transition: 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
                            transform: 'scale(0.3)',
                            opacity: 0.7,
                        }}
                    >
                        <img src={flyAnim.img} alt="" className="w-[50px] h-[50px] rounded-full object-cover shadow-lg border-2 border-primary-500" />
                    </div>
                )}

                {/* ===== Fixed Bottom Bar - 2 rows matching original ===== */}
                <div className="fixed bottom-0 left-0 right-0 z-[55] bg-white border-t border-gray-200">
                    {/* Row 1: ยอดรวม + น้ำหนัก | ราคา + จำนวน */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                        <div>
                            <p className="text-xs text-surface-200 font-medium">{language === "th" ? "ยอดรวม" : "Total"}</p>
                            <p className="text-[10px] text-surface-500">{language === "th" ? "น้ำหนัก 200.00 กรัมต่อชิ้น" : "Weight 200.00 g/pc"}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-base font-medium text-surface-100">
                                <span className="currency-symbol">{shopConfig.currencySymbol}</span>{(displayPrice * quantity).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    className="w-7 h-7 rounded-full border border-surface-600 flex items-center justify-center hover:border-primary-500 disabled:opacity-30"
                                    disabled={quantity <= 1}
                                >
                                    <Minus className="w-3 h-3 text-surface-300" />
                                </button>
                                <span className="w-8 text-center text-sm text-surface-100 border border-surface-700 rounded py-0.5">{quantity}</span>
                                <button
                                    onClick={() => setQuantity((q) => q + 1)}
                                    className="w-7 h-7 rounded-full border border-surface-600 flex items-center justify-center hover:border-primary-500"
                                >
                                    <Plus className="w-3 h-3 text-surface-300" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Action Buttons */}
                    <div className="flex">
                        <button
                            onClick={handleAddToCart}
                            className={`flex-[2] flex items-center justify-center gap-2 text-sm py-3 transition-all border-r border-gray-200 ${addedFeedback
                                ? "bg-green-50 text-green-600"
                                : "bg-surface-800 text-surface-200 hover:bg-surface-700"
                                }`}
                        >
                            <ShoppingCart className="w-4 h-4" />
                            {addedFeedback
                                ? (language === "th" ? "เพิ่มแล้ว ✓" : "Added ✓")
                                : (language === "th" ? "เพิ่มในตะกร้า" : "Add to Cart")}
                        </button>
                        <button
                            onClick={handleBuyNow}
                            className="flex-[3] flex items-center justify-center gap-2 text-sm py-3 bg-primary-500 text-white hover:bg-primary-400 transition-colors"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            {language === "th" ? "ซื้อสินค้า" : "Buy Now"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
