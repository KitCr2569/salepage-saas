'use client';

// ═══════════════════════════════════════════════════════════════
// CreateOrderModal — Create order/bill with Product Picker from shop catalog
// Fetches real products, shipping & payment from Sale Page API
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import { Trans } from "@/components/Trans";

// Default fallback payment & shipping when API is unavailable
const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
    { id: 'bank', name: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Bank transfer" : "โอนเงินผ่านธนาคาร"), nameEn: 'Bank Transfer', icon: '🏦' },
    { id: 'promptpay', name: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "PromptPay / QR" : "พร้อมเพย์ / QR"), nameEn: 'PromptPay', icon: '📱' },
    { id: 'cod', name: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Cash on delivery" : "เก็บเงินปลายทาง"), nameEn: 'COD', icon: '💵' },
];

const DEFAULT_SHIPPING_METHODS: ShippingMethod[] = [
    { id: 'standard', name: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Normal delivery" : "ส่งธรรมดา"), nameEn: 'Standard', price: 0, days: '3-5' },
    { id: 'ems', name: 'EMS', nameEn: 'EMS', price: 50, days: '1-2' },
];

interface ShopProduct {
    id: string;
    name: string;
    price: number;
    image: string | null;
    categoryId: string;
    categoryName: string;
    variantCount: number;
    variants: { id: string; name: string; price: number; image: string | null; stock: number }[];
}

interface ShopCategory {
    id: string;
    name: string;
    nameEn: string;
}

interface ShippingMethod {
    id: string;
    name: string;
    nameEn: string;
    price: number;
    days: string;
}

interface PaymentMethod {
    id: string;
    name: string;
    nameEn: string;
    icon: string;
}

interface OrderItemInput {
    name: string;
    quantity: number;
    unitPrice: number;
    productId?: string;
    variantId?: string;
    image?: string;
}

interface CreateOrderModalProps {
    conversationId: string;
    contactId: string;
    customerName: string;
    customerPhone?: string;
    onClose: () => void;
    onCreated: () => void;
}

export default function CreateOrderModal({
    conversationId,
    contactId,
    customerName,
    customerPhone,
    onClose,
    onCreated,
}: CreateOrderModalProps) {
    const api = useApi();

    const [items, setItems] = useState<OrderItemInput[]>([]);
    const [discount, setDiscount] = useState(0);

    // Editable customer details
    const [name, setName] = useState(() => {
        // If customerName looks like a raw PSID (long number), leave it blank to force admin to type it
        if (/^\d{10,}$/.test(customerName)) return '';
        return customerName || '';
    });
    const [phone, setPhone] = useState(customerPhone || '');
    const [address, setAddress] = useState('');
    // Toggle: true = admin fills now, false = customer fills via payment link
    const [adminFillsInfo, setAdminFillsInfo] = useState(false);

    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Product picker state
    const [showPicker, setShowPicker] = useState(true);
    const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);
    const [shopCategories, setShopCategories] = useState<ShopCategory[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [productError, setProductError] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);

    // Shipping & Payment from shop settings
    const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [selectedShipping, setSelectedShipping] = useState<ShippingMethod | null>(null);
    const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);

    // Fetch products, shipping & payment from Sale Page (same origin)
    // Also fetch admin settings to sync toggle states
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch products and settings in parallel
                const [productsRes, settingsRes] = await Promise.all([
                    fetch('/api/products'),
                    fetch('/api/settings').catch(() => null),
                ]);
                const data = await productsRes.json();
                const settingsData = settingsRes ? await settingsRes.json().catch(() => null) : null;

                if (data.success) {
                    setShopProducts(data.products);
                    setShopCategories(data.categories);
                }

                // Prioritize admin settings (toggle-synced) over /api/products
                const adminSettings = settingsData?.success ? settingsData.data : null;

                // Shipping: use admin settings if available, else API data, else defaults
                if (adminSettings?.shippingMethods?.length > 0) {
                    const enabled = adminSettings.shippingMethods.filter((s: any) => s.enabled !== false);
                    if (enabled.length > 0) {
                        const mapped = enabled.map((s: any) => ({
                            id: s.id, name: s.name, nameEn: s.nameEn || s.name,
                            price: s.price ?? 0, days: s.days || '',
                        }));
                        setShippingMethods(mapped);
                        setSelectedShipping(mapped[0]);
                    } else {
                        setShippingMethods(DEFAULT_SHIPPING_METHODS);
                        setSelectedShipping(DEFAULT_SHIPPING_METHODS[0]);
                    }
                } else if (data.success && data.shippingMethods?.length > 0) {
                    setShippingMethods(data.shippingMethods);
                    setSelectedShipping(data.shippingMethods[0]);
                } else {
                    setShippingMethods(DEFAULT_SHIPPING_METHODS);
                    setSelectedShipping(DEFAULT_SHIPPING_METHODS[0]);
                }

                // Payment: use admin settings if available, else API data, else defaults
                if (adminSettings?.paymentMethods?.length > 0) {
                    const enabled = adminSettings.paymentMethods.filter((p: any) => p.enabled !== false);
                    if (enabled.length > 0) {
                        const mapped = enabled.map((p: any) => ({
                            id: p.id, name: p.name, nameEn: p.nameEn || p.name,
                            icon: p.icon || '💳',
                        }));
                        setPaymentMethods(mapped);
                        setSelectedPayment(mapped[0]);
                    } else {
                        setPaymentMethods(DEFAULT_PAYMENT_METHODS);
                        setSelectedPayment(DEFAULT_PAYMENT_METHODS[0]);
                    }
                } else if (data.success && data.paymentMethods?.length > 0) {
                    setPaymentMethods(data.paymentMethods);
                    setSelectedPayment(data.paymentMethods[0]);
                } else {
                    setPaymentMethods(DEFAULT_PAYMENT_METHODS);
                    setSelectedPayment(DEFAULT_PAYMENT_METHODS[0]);
                }
            } catch {
                setProductError((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Unable to connect to store — Use basic information." : "ไม่สามารถเชื่อมต่อกับร้านค้า — ใช้ข้อมูลพื้นฐาน"));
                // Even if products fail, provide payment & shipping defaults
                setPaymentMethods(DEFAULT_PAYMENT_METHODS);
                setSelectedPayment(DEFAULT_PAYMENT_METHODS[0]);
                setShippingMethods(DEFAULT_SHIPPING_METHODS);
                setSelectedShipping(DEFAULT_SHIPPING_METHODS[0]);
            } finally {
                setLoadingProducts(false);
            }
        };
        fetchData();
    }, []);

    const shippingCost = selectedShipping?.price || 0;
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const total = subtotal - discount + shippingCost;

    const filteredProducts = shopProducts.filter(p => {
        const matchCategory = !selectedCategory || p.categoryId === selectedCategory;
        const matchSearch = !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase());
        return matchCategory && matchSearch;
    });

    const addProductToOrder = (product: ShopProduct, variantId?: string) => {
        const variant = variantId ? product.variants.find(v => v.id === variantId) : null;
        const newItem: OrderItemInput = {
            name: product.name,
            quantity: 1,
            unitPrice: variant?.price || product.price,
            productId: product.id,
            variantId: variant?.name || variantId,
            image: product.image || variant?.image || undefined,
        };
        const existingIdx = items.findIndex(i => i.productId === product.id && i.variantId === variantId);
        if (existingIdx >= 0) {
            setItems(prev => prev.map((item, idx) => idx === existingIdx ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setItems(prev => [...prev, newItem]);
        }
        setSelectedProduct(null);
    };

    const addManualItem = useCallback(() => {
        setItems(prev => [...prev, { name: '', quantity: 1, unitPrice: 0 }]);
    }, []);

    const removeItem = useCallback((index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    }, []);

    const updateItem = useCallback((index: number, field: keyof OrderItemInput, value: string | number) => {
        setItems(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    }, []);

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Please enter the customer name." : "กรุณาระบุชื่อลูกค้า"));
            return;
        }
        const validItems = items.filter(item => item.name.trim() && item.unitPrice > 0);
        if (validItems.length === 0) {
            setError((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Please add at least 1 product." : "กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ"));
            return;
        }
        if (!selectedPayment) {
            setError((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Please choose a payment method." : "กรุณาเลือกวิธีชำระเงิน"));
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await api.post('/api/chat/orders', {
                conversationId,
                contactId,
                customerName: name.trim(),
                customerPhone: adminFillsInfo ? (phone.trim() || null) : null,
                customerAddress: adminFillsInfo ? (address.trim() || null) : null,
                adminFilledAddress: adminFillsInfo,
                note: note || null,
                discount,
                shippingCost,
                shippingMethod: selectedShipping?.name || '',
                paymentMethod: selectedPayment?.name || '',
                items: validItems.map(item => ({
                    name: item.name.trim(),
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    image: item.image,
                    variant: item.variantId,
                })),
            });
            onCreated();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "An error occurred." : "เกิดข้อผิดพลาด"));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (!isSubmitting && items.length > 0) {
                    handleSubmit();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isSubmitting, items.length, handleSubmit, onClose]);

    const fmt = (n: number) => new Intl.NumberFormat('th-TH').format(n);

    const inputStyle = {
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '6px',
        color: 'white',
        padding: '8px',
        fontSize: '0.85rem',
    };

    return (
        <>
            <style>{`
                .create-order-modal input[type="text"],
                .create-order-modal input[type="number"],
                .create-order-modal input[type="tel"],
                .create-order-modal input[type="email"],
                .create-order-modal input,
                .create-order-modal textarea,
                .create-order-modal select {
                    color: #ffffff !important;
                    -webkit-text-fill-color: #ffffff !important;
                    background-color: rgba(0,0,0,0.3) !important;
                }
                .create-order-modal input::placeholder,
                .create-order-modal textarea::placeholder {
                    color: rgba(156, 163, 175, 0.8) !important;
                    -webkit-text-fill-color: rgba(156, 163, 175, 0.8) !important;
                    opacity: 1 !important;
                }
            `}</style>
            <div
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999, padding: '1rem',
                }}
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <div
                    className="create-order-modal dark-modal bg-gradient-to-br from-[#1e1e3a] to-[#16162e] border border-purple-500/30 rounded-2xl w-full max-w-5xl max-h-[94vh] overflow-y-auto p-4 md:p-6 shadow-2xl"
                >

                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                                <Trans th="🧾 สร้างคำสั่งซื้อ" en="🧾 Create an order" />
                                                            </h2>
                            <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: '4px 0 0' }}>
                                <Trans th="เปิดบิลสำหรับ" en="Open a bill for" /> <strong style={{ color: '#a78bfa' }}>{customerName}</strong>
                            </p>
                        </div>
                        <button onClick={onClose} style={{
                            background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px',
                            color: '#9ca3af', fontSize: '1.2rem', cursor: 'pointer', width: '36px', height: '36px',
                        }}>✕</button>
                    </div>

                    {/* Two-column layout */}
                    <div className={showPicker ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"}>

                        {/* ════════ LEFT: Product Picker ════════ */}
                        {showPicker && (
                            <div style={{
                                background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '1rem',
                                border: '1px solid rgba(255,255,255,0.06)', overflow: 'auto',
                            }} className="max-h-[50vh] lg:max-h-[70vh]">
                                <span style={{ fontSize: '0.85rem', color: '#a78bfa', fontWeight: 700, display: 'block', marginBottom: '10px' }}>
                                    <Trans th="🛒 เลือกสินค้าจากร้านค้า" en="🛒 Choose products from shop" />
                                                                    </span>

                                {loadingProducts ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>{<Trans th="⏳ กำลังโหลดสินค้า..." en="⏳ Loading products..." />}</div>
                                ) : productError ? (
                                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '12px', color: '#f87171', fontSize: '0.8rem' }}>
                                        ⚠️ {productError}
                                    </div>
                                ) : (
                                    <>
                                        {/* Search */}
                                        <input type="text" placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "🔍 Search for products..." : "🔍 ค้นหาสินค้า...")} value={productSearch}
                                            onChange={(e) => setProductSearch(e.target.value)}
                                            className="!text-white"
                                            style={{ ...inputStyle, width: '100%', marginBottom: '8px', borderRadius: '8px', padding: '8px 12px' }}
                                        />

                                        {/* Category filter */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                                            <button onClick={() => setSelectedCategory('')} style={{
                                                padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', cursor: 'pointer',
                                                background: !selectedCategory ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.06)',
                                                border: !selectedCategory ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.1)',
                                                color: !selectedCategory ? '#a78bfa' : '#9ca3af',
                                            }}>{<Trans th="ทั้งหมด" en="all" />}</button>
                                            {shopCategories.map(cat => (
                                                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={{
                                                    padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', cursor: 'pointer',
                                                    background: selectedCategory === cat.id ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.06)',
                                                    border: selectedCategory === cat.id ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.1)',
                                                    color: selectedCategory === cat.id ? '#a78bfa' : '#9ca3af',
                                                }}>{cat.name}</button>
                                            ))}
                                        </div>

                                        {/* Variant picker */}
                                        {selectedProduct && (
                                            <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '10px', padding: '12px', marginBottom: '10px', border: '1px solid rgba(124,58,237,0.3)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <span style={{ color: '#a78bfa', fontSize: '0.8rem', fontWeight: 600 }}><Trans th="เลือกลาย:" en="Choose pattern:" /> {selectedProduct.name}</span>
                                                    <button onClick={() => setSelectedProduct(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                                                </div>
                                                <button onClick={() => addProductToOrder(selectedProduct)} style={{
                                                    width: '100%', padding: '8px', borderRadius: '8px', cursor: 'pointer',
                                                    background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                                                    color: '#10b981', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px',
                                                }}>{<Trans th="➕ เพิ่มแบบไม่ระบุลาย (" en="➕ Add an unspecified pattern (" />}{fmt(selectedProduct.price)} ฿)</button>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', maxHeight: '200px', overflow: 'auto' }}>
                                                    {selectedProduct.variants.slice(0, 20).map(v => (
                                                        <button key={v.id} onClick={() => addProductToOrder(selectedProduct, v.id)} style={{
                                                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                                            borderRadius: '6px', padding: '4px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                                                        }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)'; e.currentTarget.style.background = 'rgba(124,58,237,0.1)'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                                        >
                                                            {v.image && <img src={v.image} alt={v.name} style={{ width: '100%', height: '40px', objectFit: 'cover', borderRadius: '4px', marginBottom: '2px' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                                                            <div style={{ color: '#d1d5db', fontSize: '0.65rem', fontWeight: 500 }}>{v.name}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                                {selectedProduct.variants.length > 20 && <p style={{ color: '#6b7280', fontSize: '0.7rem', textAlign: 'center', marginTop: '6px' }}>+{selectedProduct.variants.length - 20} {<Trans th="ลายอื่น..." en="Other patterns..." />}</p>}
                                            </div>
                                        )}

                                        {/* Product list */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {filteredProducts.map(product => (
                                                <button key={product.id} onClick={() => product.variants.length > 0 ? setSelectedProduct(product) : addProductToOrder(product)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px',
                                                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '10px', padding: '8px 10px', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s',
                                                    }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; e.currentTarget.style.background = 'rgba(124,58,237,0.08)'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                                >
                                                    {product.image ? (
                                                        <img src={product.image} alt={product.name} style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                    ) : (
                                                        <div style={{ width: '44px', height: '44px', borderRadius: '8px', flexShrink: 0, background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📦</div>
                                                    )}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ color: '#e5e7eb', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                            <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 700 }}>{fmt(product.price)} ฿</span>
                                                            <span style={{ color: '#6b7280', fontSize: '0.65rem' }}>{product.variantCount} {<Trans th="ลาย" en="striped" />}</span>
                                                            <span style={{ color: '#9ca3af', fontSize: '0.6rem', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '8px' }}>{product.categoryName}</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ color: '#a78bfa', fontSize: '1.2rem', flexShrink: 0 }}>+</div>
                                                </button>
                                            ))}
                                            {filteredProducts.length === 0 && <div style={{ textAlign: 'center', padding: '1rem', color: '#6b7280', fontSize: '0.85rem' }}>{<Trans th="ไม่พบสินค้า" en="Product not found" />}</div>}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ════════ RIGHT: Order form ════════ */}
                        <div className="overflow-auto max-h-[60vh] lg:max-h-[70vh]">
                            {/* Customer info */}
                            <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: '12px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#a78bfa', fontWeight: 600 }}>{<Trans th="👤 ข้อมูลลูกค้า (สำหรับจัดส่ง)" en="👤 Customer information (for shipping)" />}</div>
                                    <button
                                        type="button"
                                        onClick={() => setAdminFillsInfo(v => !v)}
                                        style={{
                                            fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: '8px', cursor: 'pointer', border: 'none',
                                            background: adminFillsInfo ? 'rgba(16,185,129,0.2)' : 'rgba(124,58,237,0.2)',
                                            color: adminFillsInfo ? '#10b981' : '#a78bfa',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        {adminFillsInfo ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "✏️ Enter in chat (hidden link)" : "✏️ กรอกในแชท (ลิงก์ซ่อน)") : '🔗 ให้กรอกในลิงก์ (ค่าเริ่มต้น)'}
                                    </button>
                                </div>
                                {/* Always show name */}
                                <div style={{ marginBottom: '6px' }}>
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Name-Surname..." : "ชื่อ-นามสกุล...")} required
                                        className="!text-white"
                                        style={{ ...inputStyle, width: '100%', borderRadius: '8px' }} />
                                </div>
                                {/* Phone & Address — only when admin fills */}
                                {adminFillsInfo && (
                                    <>
                                        <div style={{ marginBottom: '6px' }}>
                                            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "telephone number..." : "เบอร์โทรศัพท์...")}
                                                className="!text-white"
                                                style={{ ...inputStyle, width: '100%', borderRadius: '8px' }} />
                                        </div>
                                        <div>
                                            <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Complete delivery address..." : "ที่อยู่จัดส่งครบถ้วน...")} rows={2}
                                                className="!text-white"
                                                style={{ ...inputStyle, width: '100%', borderRadius: '8px', resize: 'vertical' }} />
                                        </div>
                                    </>
                                )}
                                {!adminFillsInfo && (
                                    <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '4px' }}>{<Trans th="💡 ลูกค้าจะกรอกที่อยู่และแนบสลิปผ่านลิงก์ชำระเงิน" en="💡 Customers will enter their address and attach a slip via the payment link." />}</p>
                                )}
                            </div>

                            {/* Items */}
                            <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#a78bfa', fontWeight: 600 }}>{<Trans th="📦 รายการสินค้า (" en="📦 Product list (" />}{items.length})</span>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button onClick={() => setShowPicker(!showPicker)} style={{
                                            background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
                                            borderRadius: '8px', color: '#a78bfa', fontSize: '0.75rem', cursor: 'pointer', padding: '3px 10px',
                                        }}>{showPicker ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "⬅ Hide products" : "⬅ ซ่อนสินค้า") : '🛒 เลือกสินค้า'}</button>
                                        <button onClick={addManualItem} style={{
                                            background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
                                            borderRadius: '8px', color: '#a78bfa', fontSize: '0.75rem', cursor: 'pointer', padding: '3px 10px',
                                        }}>{<Trans th="+ เพิ่มเอง" en="+ Add it yourself" />}</button>
                                    </div>
                                </div>

                                {items.length === 0 ? (
                                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '1.2rem', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🛒</div>
                                        <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>{showPicker ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Select products from the left side" : "เลือกสินค้าจากด้านซ้าย") : 'กดปุ่ม "เลือกสินค้า" หรือ "เพิ่มเอง"'}</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {items.map((item, index) => (
                                            <div key={index} style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                                {item.image && <img src={item.image} alt="" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    {item.productId ? (
                                                        <div style={{ color: '#e5e7eb', fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                                                    ) : (
                                                        <input type="text" placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Product name" : "ชื่อสินค้า")} value={item.name} onChange={(e) => updateItem(index, 'name', e.target.value)}
                                                            className="!text-white"
                                                            style={{ ...inputStyle, width: '100%', padding: '4px 6px', fontSize: '0.8rem' }} />
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <button onClick={() => updateItem(index, 'quantity', Math.max(1, item.quantity - 1))} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', color: '#d1d5db', cursor: 'pointer', width: '22px', height: '22px', fontSize: '0.8rem' }}>−</button>
                                                    <span style={{ color: '#e5e7eb', fontSize: '0.85rem', fontWeight: 600, width: '24px', textAlign: 'center' }}>{item.quantity}</span>
                                                    <button onClick={() => updateItem(index, 'quantity', item.quantity + 1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', color: '#d1d5db', cursor: 'pointer', width: '22px', height: '22px', fontSize: '0.8rem' }}>+</button>
                                                </div>
                                                {item.productId ? (
                                                    <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 700, width: '80px', textAlign: 'right' }}>{fmt(item.quantity * item.unitPrice)} ฿</span>
                                                ) : (
                                                    <input type="number" min={0} value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                        className="!text-white"
                                                        style={{ ...inputStyle, width: '80px', padding: '4px 6px', textAlign: 'right', fontSize: '0.8rem' }} />
                                                )}
                                                <button onClick={() => removeItem(index)} style={{ width: '24px', height: '24px', background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0 }}>×</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ════════ Shipping Methods ════════ */}
                            {shippingMethods.length > 0 && (
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#a78bfa', fontWeight: 600, marginBottom: '6px' }}>{<Trans th="🚚 วิธีจัดส่ง" en="🚚 Shipping method" />}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {shippingMethods.map(method => {
                                            const isActive = selectedShipping?.id === method.id;
                                            return (
                                                <button
                                                    key={method.id}
                                                    onClick={() => setSelectedShipping(method)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        background: isActive ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
                                                        border: isActive ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '10px', padding: '10px 12px', cursor: 'pointer',
                                                        transition: 'all 0.15s', width: '100%', textAlign: 'left',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{
                                                            width: '18px', height: '18px', borderRadius: '50%',
                                                            border: isActive ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.2)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            background: isActive ? '#7c3aed' : 'transparent',
                                                        }}>
                                                            {isActive && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
                                                        </div>
                                                        <div>
                                                            <div style={{ color: isActive ? '#e5e7eb' : '#9ca3af', fontSize: '0.8rem', fontWeight: 600 }}>
                                                                {method.name}
                                                            </div>
                                                            <div style={{ color: '#6b7280', fontSize: '0.7rem' }}>
                                                                {method.days} <Trans th="วัน" en="day" />
                                                                                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span style={{
                                                        color: method.price === 0 ? '#10b981' : '#e5e7eb',
                                                        fontSize: '0.85rem', fontWeight: 700,
                                                    }}>
                                                        {method.price === 0 ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "free" : "ฟรี") : `${fmt(method.price)} ฿`}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ════════ Payment Methods ════════ */}
                            {paymentMethods.length > 0 && (
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#a78bfa', fontWeight: 600, marginBottom: '6px' }}>{<Trans th="💳 วิธีชำระเงิน" en="💳 How to pay" />}</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${paymentMethods.length}, 1fr)`, gap: '6px' }}>
                                        {paymentMethods.map(method => {
                                            const isActive = selectedPayment?.id === method.id;
                                            return (
                                                <button
                                                    key={method.id}
                                                    onClick={() => setSelectedPayment(method)}
                                                    style={{
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                                        background: isActive ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
                                                        border: isActive ? '2px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '10px', padding: '10px 8px', cursor: 'pointer',
                                                        transition: 'all 0.15s',
                                                    }}
                                                >
                                                    <span style={{ fontSize: '1.3rem' }}>{method.icon}</span>
                                                    <span style={{
                                                        color: isActive ? '#a78bfa' : '#9ca3af',
                                                        fontSize: '0.7rem', fontWeight: isActive ? 700 : 500, textAlign: 'center',
                                                    }}>{method.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Summary */}
                            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{<Trans th="ยอดรวม (" en="Total (" />}{items.length} {<Trans th="รายการ)" en="list)" />}</span>
                                    <span style={{ color: '#e5e7eb', fontSize: '0.85rem' }}>{fmt(subtotal)} ฿</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{<Trans th="ส่วนลด" en="discount" />}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>-</span>
                                        <input type="number" min={0} value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                            className="!text-red-500"
                                            style={{ ...inputStyle, width: '80px', padding: '4px 6px', textAlign: 'right', color: '#ef4444' }} />
                                        <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>฿</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                                        <Trans th="ค่าจัดส่ง" en="Shipping cost" /> {selectedShipping ? `(${selectedShipping.name})` : ''}
                                    </span>
                                    <span style={{ color: shippingCost === 0 ? '#10b981' : '#3b82f6', fontSize: '0.85rem', fontWeight: 600 }}>
                                        {shippingCost === 0 ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "free" : "ฟรี") : `+${fmt(shippingCost)} ฿`}
                                    </span>
                                </div>
                                {selectedPayment && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{<Trans th="ชำระเงิน" en="Make payment" />}</span>
                                        <span style={{ color: '#e5e7eb', fontSize: '0.8rem' }}>{selectedPayment.icon} {selectedPayment.name}</span>
                                    </div>
                                )}
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 700 }}>{<Trans th="💰 ยอดสุทธิ" en="💰 Net balance" />}</span>
                                    <span style={{ color: '#10b981', fontSize: '1.2rem', fontWeight: 800 }}>{fmt(total)} ฿</span>
                                </div>
                            </div>

                            {/* Note */}
                            <div style={{ marginBottom: '0.75rem' }}>
                                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "📝 Note..." : "📝 หมายเหตุ...")} rows={2}
                                    className="!text-white"
                                    style={{ ...inputStyle, width: '100%', borderRadius: '8px', resize: 'vertical' }} />
                            </div>

                            {/* Error */}
                            {error && (
                                <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '8px 12px', color: '#f87171', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                                    ⚠️ {error}
                                </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button onClick={onClose} style={{
                                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '10px', color: '#d1d5db', padding: '10px 20px', fontSize: '0.85rem', cursor: 'pointer',
                                }}>{<Trans th="ยกเลิก" en="cancel" />}</button>
                                <button onClick={handleSubmit}
                                    disabled={isSubmitting || items.length === 0}
                                    style={{
                                        background: isSubmitting ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                        border: 'none', borderRadius: '10px', color: '#fff',
                                        padding: '10px 24px', fontSize: '0.85rem', fontWeight: 700,
                                        cursor: isSubmitting || items.length === 0 ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                                        opacity: items.length === 0 ? 0.5 : 1,
                                    }}
                                >
                                    {isSubmitting ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "⏳ Creating..." : "⏳ กำลังสร้าง...") : `🧾 สร้างบิล (${fmt(total)} ฿)`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
