"use client";

import React, { useState, useRef, useEffect } from "react";
import { useProductStore } from "@/store/useProductStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useShopStore } from "@/store/useShopStore";
import { Product, ProductVariant, Category } from "@/types";
import { Plus, Edit2, Trash2, Search, Package, X, Save, Image as ImageIcon, Upload, CheckSquare, Square, Copy, Clipboard, ClipboardPaste, Scissors, Download, FolderUp, ArrowUpDown, GripVertical, Wand2 } from "lucide-react";
import AdminDiscount from "@/components/admin/AdminDiscount";
import AdminTextures from "@/components/admin/AdminTextures";
import UsageBar from "@/components/admin/UsageBar";
import { Trans } from "@/components/Trans";
import Swal from 'sweetalert2';

interface ProductFormData {
    name: string;
    description: string;
    price: number;
    categoryId: string;
    images: string[];
    variants: { id: string; name: string; price: number; stock: number; image?: string }[];
}

const emptyForm: ProductFormData = {
    name: "",
    description: "",
    price: 0,
    categoryId: "",
    images: [""],
    variants: [{ id: "v1", name: "", price: 0, stock: 99 }],
};

// Compress + convert file to small data URL (ต้องเล็กมาก เพราะ Vercel body limit 4.5MB)
const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const img = new window.Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX = 400; // ลดจาก 600 เพื่อให้ base64 เล็กพอ
            let w = img.width, h = img.height;
            if (w > MAX || h > MAX) {
                if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                else { w = Math.round(w * MAX / h); h = MAX; }
            }
            canvas.width = w; canvas.height = h;
            canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
            URL.revokeObjectURL(objectUrl);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.4);
            const sizeKB = Math.round(dataUrl.length / 1024);
            console.log(`[Image] Compressed: ${img.width}x${img.height} → ${w}x${h}, size: ${sizeKB}KB`);
            if (sizeKB > 500) {
                Swal.fire({ text: `รูปใหญ่เกินไป (${sizeKB}KB) กรุณาใช้รูปที่เล็กกว่านี้`, icon: 'error' });
            }
            resolve(dataUrl);
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("ไม่สามารถอ่านรูปได้"));
        };
        img.src = objectUrl;
    });

export default function AdminProducts() {
    const { products: productsList, categories: catList, textures, addProduct, updateProduct, deleteProduct, addCategory, removeCategory } = useProductStore();
    const connectedPage = useAuthStore((s) => s.connectedPage);
    const { syncWithPage } = useShopStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ProductFormData>({ ...emptyForm });
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [catModalOpen, setCatModalOpen] = useState(false);
    const [newCatName, setNewCatName] = useState("");
    const [deleteCatConfirm, setDeleteCatConfirm] = useState<{ id: string; name: string } | null>(null);
    const productImgRefs = useRef<(HTMLInputElement | null)[]>([]);
    const variantImgRefs = useRef<(HTMLInputElement | null)[]>([]);
    const importRef = useRef<HTMLInputElement>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [clipboard, setClipboard] = useState<Product[]>([]);
    const [reorderMode, setReorderMode] = useState(false);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [reorderedList, setReorderedList] = useState<Product[]>([]);
    const [sortBy, setSortBy] = useState<string>("default");
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [productSubTab, setProductSubTab] = useState<"products" | "discount" | "texture">("products");
    const [studioOpen, setStudioOpen] = useState(false);
    const [studioIndex, setStudioIndex] = useState(0);
    const [usageData, setUsageData] = useState<any>(null);
    const [lowStockItems, setLowStockItems] = useState<any[]>([]);

    // Fetch plan usage info
    useEffect(() => {
        fetch("/api/tenant/usage")
            .then(res => res.json())
            .then(res => {
                if (res.success && res.data) setUsageData(res.data);
            })
            .catch(() => {});
        // Fetch low stock items
        fetch("/api/stock?threshold=5")
            .then(res => res.json())
            .then(res => {
                if (res.success && res.data) setLowStockItems(res.data.items || []);
            })
            .catch(() => {});
    }, []);

    const filtered = productsList.filter((p) => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat = selectedCategory === "all" || p.categoryId === selectedCategory;
        return matchesSearch && matchesCat;
    }).sort((a, b) => {
        switch (sortBy) {
            case "name-asc": return a.name.localeCompare(b.name, "th");
            case "name-desc": return b.name.localeCompare(a.name, "th");
            case "newest": return (b.createdAt || 0) - (a.createdAt || 0);
            case "oldest": return (a.createdAt || 0) - (b.createdAt || 0);
            case "price-asc": return a.price - b.price;
            case "price-desc": return b.price - a.price;
            default: return (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
        }
    });

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'TEMPLATE_STUDIO_RESULT') {
                const idx = parseInt(event.data.index, 10);
                const url = event.data.imageDataUrl;
                if (!isNaN(idx) && url) {
                    setForm((prev) => {
                        const newImages = [...prev.images];
                        newImages[idx] = url;
                        return { ...prev, images: newImages };
                    });
                    setStudioOpen(false);
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Handle product image upload
    const handleProductImgUpload = async (index: number, file: File) => {
        const url = await fileToDataUrl(file);
        updateImage(index, url);
    };

    // Handle variant image upload
    const handleVariantImgUpload = async (index: number, file: File) => {
        const url = await fileToDataUrl(file);
        updateVariant(index, "image", url);
    };

    // Add new category — save to DB + store
    const handleAddCategory = async () => {
        if (!newCatName.trim()) return;
        const pageId = connectedPage?.id;
        setCatModalOpen(false);
        setNewCatName("");

        if (pageId) {
            try {
                const res = await fetch(`/api/shop/${pageId}/categories`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: newCatName.trim(), nameEn: newCatName.trim() }),
                });
                const json = await res.json();
                if (res.ok && json.success && json.data?.id) {
                    // Use real DB UUID
                    const realCat: Category = { id: json.data.id, name: newCatName.trim(), nameEn: newCatName.trim() };
                    addCategory(realCat);
                    // Auto-select this category in current form
                    setForm((prev) => ({ ...prev, categoryId: json.data.id }));
                    syncWithPage();
                } else {
                    // Fallback: temp ID
                    const tempId = `cat-${Date.now()}`;
                    addCategory({ id: tempId, name: newCatName.trim(), nameEn: newCatName.trim() });
                    showError("สร้างหมวดหมู่ไม่สมบูรณ์ — กรุณา sync ใหม่");
                }
            } catch (e) {
                console.error("Create category failed:", e);
                showError("สร้างหมวดหมู่ไม่สำเร็จ: " + String(e));
            }
        } else {
            const tempId = `cat-${Date.now()}`;
            addCategory({ id: tempId, name: newCatName.trim(), nameEn: newCatName.trim() });
            showError("ไม่สามารถบันทึกหมวดหมู่ — กรุณาเชื่อมต่อเพจก่อน");
        }
        showSuccess("เพิ่มหมวดหมู่สำเร็จ!");
    };

    // Delete category — remove from DB + store
    const handleDeleteCategory = async (catId: string, catName: string) => {
        setDeleteCatConfirm({ id: catId, name: catName });
    };

    const confirmDeleteCategory = async () => {
        if (!deleteCatConfirm) return;
        const { id: catId } = deleteCatConfirm;
        setDeleteCatConfirm(null);
        const pageId = connectedPage?.id;
        if (pageId) {
            try {
                const res = await fetch(`/api/shop/${pageId}/categories?id=${catId}`, { method: "DELETE" });
                if (res.ok) {
                    removeCategory(catId);
                    syncWithPage();
                    showSuccess("ลบหมวดหมู่สำเร็จ!");
                } else {
                    const err = await res.text();
                    showError("ลบไม่สำเร็จ: " + err);
                }
            } catch (e) {
                showError("ลบไม่สำเร็จ: " + String(e));
            }
        }
    };

    // Open Add Modal
    const openAdd = () => {
        setEditingId(null);
        setForm({ ...emptyForm, images: [""], variants: [{ id: "v1", name: "", price: 0, stock: 99 }] });
        setModalOpen(true);
    };

    // Open Edit Modal
    const openEdit = (product: Product) => {
        setEditingId(product.id);
        setForm({
            name: product.name,
            description: product.description,
            price: product.price,
            categoryId: product.categoryId,
            images: [...product.images],
            variants: product.variants.map((v) => ({
                id: v.id,
                name: v.name,
                price: v.price,
                stock: v.stock,
                image: v.image,
            })),
        });
        setModalOpen(true);
    };

    // Save (Add or Edit) — save to DB + store
    const handleSave = async () => {
        if (!form.name.trim()) return;
        const pageId = connectedPage?.id;

        // ตรวจขนาด body ก่อนส่ง — Vercel จำกัดที่ 4.5MB
        const bodyData = {
            name: form.name,
            description: form.description,
            price: form.price,
            images: form.images.filter((i) => i.trim()),
            variants: form.variants.filter((v) => v.name.trim()),
            categoryId: (form.categoryId && form.categoryId !== "all" && !form.categoryId.startsWith("cat-")) ? form.categoryId : null,
        };
        const bodySize = new Blob([JSON.stringify(bodyData)]).size;
        const bodySizeMB = (bodySize / 1024 / 1024).toFixed(2);
        console.log(`[Save] Body size: ${bodySizeMB}MB`);
        if (bodySize > 4 * 1024 * 1024) {
            showError(`ข้อมูลใหญ่เกินไป (${bodySizeMB}MB) — ลดจำนวน/ขนาดรูปแล้วลองใหม่`);
            return;
        }

        if (editingId) {
            // Update local store immediately
            updateProduct(editingId, {
                name: form.name,
                description: form.description,
                price: form.price,
                categoryId: form.categoryId,
                images: form.images.filter((i) => i.trim()),
                variants: form.variants.filter((v) => v.name.trim()) as ProductVariant[],
            });
            // Persist to DB + re-sync so images/IDs are consistent
            if (pageId) {
                try {
                    const res = await fetch(`/api/shop/${pageId}/products/${editingId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(bodyData),
                    });
                    if (res.ok) {
                        syncWithPage();
                    } else {
                        const errText = await res.text();
                        console.error("PUT product failed:", errText);
                        // Re-sync to fix stale IDs (temp IDs not in DB)
                        syncWithPage();
                        try {
                            const errJson = JSON.parse(errText);
                            showError("บันทึกไม่สำเร็จ: " + (errJson.error || errText).substring(0, 200));
                        } catch {
                            showError("บันทึกไม่สำเร็จ: " + errText.substring(0, 200));
                        }
                    }
                } catch (e) { console.error("PUT product error:", e); showError("บันทึกไม่สำเร็จ: " + String(e)); }
            }
            showSuccess("แก้ไขสินค้าสำเร็จ!");
        } else {
            const newProduct: Product = {
                id: `product-${Date.now()}`,
                name: form.name,
                description: form.description,
                price: form.price,
                categoryId: form.categoryId,
                images: form.images.filter((i) => i.trim()),
                variants: form.variants.filter((v) => v.name.trim()) as ProductVariant[],
                createdAt: Date.now(),
            };
            addProduct(newProduct);
            // Persist to DB
            if (pageId) {
                try {
                    const res = await fetch(`/api/shop/${pageId}/products`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(bodyData),
                    });
                    if (res.ok) { syncWithPage(); }
                    else { const err = await res.text(); console.error("POST product failed:", err); showError("เพิ่มสินค้าไม่สำเร็จ: " + (err.length > 100 ? err.substring(0, 100) : err)); }
                } catch (e) { console.error("POST product error:", e); showError("เพิ่มสินค้าไม่สำเร็จ: " + String(e)); }
            } else {
                showError("ไม่สามารถบันทึกได้ — กรุณาเชื่อมต่อเพจก่อน");
            }
            showSuccess("เพิ่มสินค้าสำเร็จ!");
        }

        setModalOpen(false);
        setEditingId(null);
    };

    // Delete — remove from DB + store
    const handleDelete = async (id: string) => {
        const pageId = connectedPage?.id;
        deleteProduct(id);
        setDeleteConfirm(null);
        if (pageId) {
            await fetch(`/api/shop/${pageId}/products/${id}`, { method: "DELETE" }).catch(console.error);
        }
        showSuccess("ลบสินค้าสำเร็จ!");
    };

    const showSuccess = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(null), 2000);
    };

    const showError = (msg: string) => {
        setErrorMsg(msg);
        setTimeout(() => setErrorMsg(null), 3000);
    };

    // Helper: persist a product to DB via POST
    const persistProductToDB = async (product: Product) => {
        const pageId = connectedPage?.id;
        if (!pageId) return;
        try {
            await fetch(`/api/shop/${pageId}/products`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: product.name,
                    description: product.description,
                    price: product.price,
                    images: product.images || [],
                    variants: product.variants || [],
                    categoryId: (product.categoryId && product.categoryId !== "all" && !product.categoryId.startsWith("cat-")) ? product.categoryId : null,
                    badge: product.badge || null,
                }),
            });
        } catch (e) {
            console.error("[persistProductToDB] Error:", e);
        }
    };

    // Helper: delete a product from DB via DELETE
    const deleteProductFromDB = async (productId: string) => {
        const pageId = connectedPage?.id;
        if (!pageId) return;
        try {
            await fetch(`/api/shop/${pageId}/products/${productId}`, { method: "DELETE" });
        } catch (e) {
            console.error("[deleteProductFromDB] Error:", e);
        }
    };

    // Helper: update product in DB via PUT
    const updateProductInDB = async (productId: string, data: Partial<Product>) => {
        const pageId = connectedPage?.id;
        if (!pageId) return;
        try {
            await fetch(`/api/shop/${pageId}/products/${productId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
        } catch (e) {
            console.error("[updateProductInDB] Error:", e);
        }
    };

    // Form helpers
    const updateImage = (index: number, value: string) => {
        const imgs = [...form.images];
        imgs[index] = value;
        setForm({ ...form, images: imgs });
    };

    const addImage = () => setForm({ ...form, images: [...form.images, ""] });

    const removeImage = (index: number) => {
        const imgs = form.images.filter((_, i) => i !== index);
        setForm({ ...form, images: imgs.length ? imgs : [""] });
    };

    const updateVariant = (index: number, field: string, value: string | number) => {
        const vars = [...form.variants];
        vars[index] = { ...vars[index], [field]: value };
        setForm({ ...form, variants: vars });
    };

    const addVariant = () =>
        setForm({
            ...form,
            variants: [...form.variants, { id: `v${Date.now()}`, name: "", price: form.price, stock: 99 }],
        });

    const removeVariant = (index: number) => {
        const vars = form.variants.filter((_, i) => i !== index);
        setForm({ ...form, variants: vars.length ? vars : [{ id: "v1", name: "", price: 0, stock: 99 }] });
    };

    // Bulk actions
    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map((p) => p.id)));
        }
    };

    const bulkDelete = async () => {
        const count = selectedIds.size;
        const ids = Array.from(selectedIds);
        ids.forEach((id) => deleteProduct(id));
        setSelectedIds(new Set());
        showSuccess(`ลบ ${count} สินค้าสำเร็จ!`);
        // Persist to DB
        await Promise.all(ids.map((id) => deleteProductFromDB(id)));
        syncWithPage();
    };

    const bulkCopy = () => {
        const items = productsList.filter((p) => selectedIds.has(p.id));
        setClipboard(items);
        showSuccess(`คัดลอก ${items.length} สินค้าแล้ว — กด "วาง" เพื่อวาง`);
        setSelectedIds(new Set());
    };

    const bulkPaste = async () => {
        if (clipboard.length === 0) return;
        const pasted: Product[] = clipboard.map((p) => ({
            ...p,
            id: `paste-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        }));
        pasted.forEach((p) => addProduct(p));
        showSuccess(`วาง ${clipboard.length} สินค้าสำเร็จ!`);
        setClipboard([]);
        // Persist to DB
        await Promise.all(pasted.map((p) => persistProductToDB(p)));
        syncWithPage();
    };

    // Global Keyboard Shortcuts (Ctrl+C, Ctrl+V, Delete, Ctrl+S)
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName;
            const isInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA';

            if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyS' || e.key === 's' || e.key === 'S' || e.key === 'ห')) {
                e.preventDefault();
                if (modalOpen) {
                    handleSave();
                }
                return;
            }

            if (isInput) return;

            if (e.ctrlKey || e.metaKey) {
                if (e.code === 'KeyA' || e.key === 'a' || e.key === 'A' || e.key === 'ฤ') {
                    e.preventDefault();
                    selectAll();
                } else if (e.code === 'KeyC' || e.key === 'c' || e.key === 'C' || e.key === 'แ') {
                    if (selectedIds.size > 0) {
                        e.preventDefault();
                        bulkCopy();
                    }
                } else if (e.code === 'KeyV' || e.key === 'v' || e.key === 'V' || e.key === 'อ') {
                    if (clipboard.length > 0) {
                        e.preventDefault();
                        bulkPaste();
                    }
                } else if (e.code === 'KeyX' || e.key === 'x' || e.key === 'X' || e.key === 'ป') {
                    if (selectedIds.size > 0) {
                        e.preventDefault();
                        const items = productsList.filter((p) => selectedIds.has(p.id));
                        setClipboard(items);
                        items.forEach((p) => deleteProduct(p.id));
                        showSuccess(`ตัด ${items.length} สินค้าแล้ว`);
                        setSelectedIds(new Set());
                        Promise.all(items.map((p) => deleteProductFromDB(p.id))).then(() => syncWithPage());
                    }
                }
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedIds.size > 0 && !deleteConfirm) {
                    e.preventDefault();
                    bulkDelete();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIds, clipboard, deleteConfirm, productsList, modalOpen, handleSave]);

    const exportProducts = () => {
        const dataToExport = selectedIds.size > 0
            ? productsList.filter((p) => selectedIds.has(p.id))
            : productsList;
        const json = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `products-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showSuccess(`ส่งออก ${dataToExport.length} สินค้าสำเร็จ!`);
    };

    const importProducts = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const imported = JSON.parse(ev.target?.result as string);
                if (Array.isArray(imported)) {
                    const products: Product[] = imported.map((p: Product) => ({
                        ...p,
                        id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    }));
                    products.forEach((p) => addProduct(p));
                    showSuccess(`นำเข้า ${imported.length} สินค้าสำเร็จ!`);
                    // Persist to DB
                    await Promise.all(products.map((p) => persistProductToDB(p)));
                    syncWithPage();
                }
            } catch {
                showSuccess("ไฟล์ไม่ถูกต้อง!");
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    return (
        <div className="p-6 md:p-8">
            {/* Sub-tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button
                    onClick={() => setProductSubTab("products")}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${productSubTab === "products"
                        ? "bg-pink-500 text-white shadow-md shadow-pink-200"
                        : "bg-pink-50 text-pink-500 hover:bg-pink-100"
                        }`}
                >
                    <Trans th="สินค้า" en="Products" />
                </button>
                <button
                    onClick={() => setProductSubTab("discount")}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${productSubTab === "discount"
                        ? "bg-pink-500 text-white shadow-md shadow-pink-200"
                        : "bg-pink-50 text-pink-500 hover:bg-pink-100"
                        }`}
                >
                    <Trans th="โค้ดส่วนลด" en="Discount Code" />
                </button>
                <button
                    onClick={() => setProductSubTab("texture")}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${productSubTab === "texture"
                        ? "bg-gradient-to-r from-pink-400 to-purple-500 text-white shadow-md shadow-pink-200"
                        : "bg-pink-50 text-pink-500 hover:bg-pink-100"
                        }`}
                >
                    <Trans th="ลายสินค้า (Texture)" en="Textures" />
                </button>
            </div>

            {/* Discount Tab */}
            {productSubTab === "discount" && <AdminDiscount />}

            {/* Texture Tab */}
            {productSubTab === "texture" && <AdminTextures />}

            {/* Products Tab */}
            {productSubTab === "products" && (
                <>
                    {/* Success Toast */}
                    {successMsg && (
                        <div className="fixed top-20 right-6 z-[100] bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-[slideIn_0.3s_ease]">
                            ✅ {successMsg}
                        </div>
                    )}
                    
                    {/* Error Toast */}
                    {errorMsg && (
                        <div className="fixed top-20 right-6 z-[100] bg-red-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-[slideIn_0.3s_ease]">
                            ⚠️ {errorMsg}
                        </div>
                    )}

                    {/* Plan Usage Bar */}
                    {usageData && (
                        <div className="mb-4">
                            <UsageBar
                                label="จำนวนสินค้า"
                                labelEn="Products"
                                current={usageData.products.current}
                                max={usageData.products.max}
                                icon="📦"
                                onUpgrade={() => { window.location.hash = "Upgrade"; }}
                            />
                        </div>
                    )}

                    {/* Low Stock Alert */}
                    {lowStockItems.length > 0 && (
                        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">⚠️</span>
                                <span className="text-sm font-bold text-amber-700">
                                    สินค้าใกล้หมด ({lowStockItems.length} รายการ)
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {lowStockItems.slice(0, 8).map((item) => (
                                    <span key={item.productId + item.variantId}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                                            item.stock === 0 
                                                ? 'bg-red-100 text-red-700' 
                                                : 'bg-amber-100 text-amber-700'
                                        }`}
                                    >
                                        {item.productName} ({item.variantName}): {item.stock === 0 ? '❌ หมด!' : `เหลือ ${item.stock}`}
                                    </span>
                                ))}
                                {lowStockItems.length > 8 && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                                        +{lowStockItems.length - 8} รายการ
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-pink-500 flex items-center gap-2">
                            <Package className="w-6 h-6" />
                            <Trans th="จัดการสินค้า" en="Manage products" />
                                                    </h1>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    if (reorderMode) {
                                        // Save order
                                        reorderedList.forEach((p, i) => updateProduct(p.id, { sortOrder: i }));
                                        showSuccess("บันทึกลำดับสินค้าสำเร็จ!");
                                        setReorderMode(false);
                                    } else {
                                        setReorderedList([...filtered]);
                                        setReorderMode(true);
                                    }
                                }}
                                className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${reorderMode
                                    ? "bg-green-500 text-white shadow-md shadow-green-200 hover:bg-green-600"
                                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                    }`}
                            >
                                <ArrowUpDown className="w-4 h-4" />
                                {reorderMode ? (typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? "💾 Save Order" : "💾 บันทึกลำดับ") : (typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? "⇅ Sort Products" : "จัดลำดับสินค้า")}
                            </button>
                            {reorderMode && (
                                <button
                                    onClick={() => setReorderMode(false)}
                                    className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-200 text-gray-600 hover:bg-gray-300 transition-all"
                                >
                                    <Trans th="ยกเลิก" en="cancel" />
                                                                    </button>
                            )}
                            <button
                                onClick={openAdd}
                                className="bg-gradient-to-r from-pink-400 to-pink-500 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-md shadow-pink-200 hover:shadow-lg transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                <Trans th="เพิ่มสินค้า" en="Add product" />
                                                            </button>
                        </div>
                    </div>

                    {/* Search & Filter bar */}
                    <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-pink-100">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Search for products..." : "ค้นหาสินค้า...")}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300 transition-all"
                                />
                            </div>
                            <div className="flex items-center gap-1">
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300 transition-all"
                                >
                                    {catList.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? (cat.nameEn || cat.name) : cat.name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => setCatModalOpen(true)}
                                    className="p-2 bg-pink-50 hover:bg-pink-100 text-pink-400 hover:text-pink-600 rounded-xl transition-colors"
                                    title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Manage categories" : "จัดการหมวดหมู่")}
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300 transition-all"
                            >
                                <option value="default">{<Trans th="ลำดับเริ่มต้น" en="Default sequence" />}</option>
                                <option value="name-asc">{<Trans th="ชื่อ ก-ฮ" en="Name A-Z" />}</option>
                                <option value="name-desc">{<Trans th="ชื่อ ฮ-ก" en="Name H-K" />}</option>
                                <option value="newest">{<Trans th="เพิ่มล่าสุด" en="Recently added" />}</option>
                                <option value="oldest">{<Trans th="เพิ่มเก่าสุด" en="Add the oldest" />}</option>
                                <option value="price-asc">{<Trans th="ราคา ต่ำ→สูง" en="Price Low→High" />}</option>
                                <option value="price-desc">{<Trans th="ราคา สูง→ต่ำ" en="Price High→Low" />}</option>
                            </select>
                        </div>
                    </div>

                    {/* Bulk Action Toolbar */}
                    <div className="bg-gray-800 rounded-2xl p-2 mb-4 flex items-center gap-2 flex-wrap shadow-sm">
                        <button
                            onClick={selectAll}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                            {selectedIds.size === filtered.length && filtered.length > 0 ? (
                                <CheckSquare className="w-4 h-4 text-blue-400" />
                            ) : (
                                <Square className="w-4 h-4" />
                            )}
                            <Trans th="เลือกทั้งหมด" en="Select all" />
                                                    </button>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            disabled={selectedIds.size === 0}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <X className="w-4 h-4" />
                            {<Trans th="ยกเลิก" en="cancel" />}{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
                        </button>
                        <div className="w-px h-6 bg-gray-600" />
                        <button
                            onClick={bulkCopy}
                            disabled={selectedIds.size === 0}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <Copy className="w-4 h-4" />
                            <Trans th="คัดลอก" en="Copy" />
                                                    </button>
                        <button
                            onClick={async () => {
                                const items = productsList.filter((p) => selectedIds.has(p.id));
                                setClipboard(items);
                                items.forEach((p) => deleteProduct(p.id));
                                showSuccess(`ตัด ${items.length} สินค้าแล้ว`);
                                setSelectedIds(new Set());
                                // Persist deletes to DB
                                await Promise.all(items.map((p) => deleteProductFromDB(p.id)));
                                syncWithPage();
                            }}
                            disabled={selectedIds.size === 0}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <Scissors className="w-4 h-4" />
                            <Trans th="ตัด" en="cut" />
                                                    </button>
                        <button
                            onClick={bulkPaste}
                            disabled={clipboard.length === 0}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ClipboardPaste className="w-4 h-4" />
                            {<Trans th="วาง" en="place" />}{clipboard.length > 0 ? ` (${clipboard.length})` : ""}
                        </button>
                        <button
                            onClick={bulkDelete}
                            disabled={selectedIds.size === 0}
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <Trash2 className="w-4 h-4" />
                            <Trans th="ลบ" en="delete" />
                                                    </button>
                        <div className="relative">
                            <select
                                disabled={selectedIds.size === 0}
                                onChange={async (e) => {
                                    const catId = e.target.value;
                                    if (!catId || selectedIds.size === 0) return;
                                    const ids = Array.from(selectedIds);
                                    ids.forEach((id) => updateProduct(id, { categoryId: catId }));
                                    const cat = catList.find((c) => c.id === catId); const catName = cat ? (typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? (cat.nameEn || cat.name) : cat.name) : catId;
                                    showSuccess(`ย้าย ${ids.length} สินค้าไป "${catName}" สำเร็จ!`);
                                    setSelectedIds(new Set());
                                    e.target.value = "";
                                    // Persist to DB
                                    await Promise.all(ids.map((id) => updateProductInDB(id, { categoryId: catId })));
                                    syncWithPage();
                                }}
                                className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed appearance-none cursor-pointer pr-7"
                            >
                                <option value="">{<Trans th="📁 ย้ายกลุ่ม" en="📁 Move group" />}</option>
                                {catList.filter((c) => c.id !== "all").map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? (cat.nameEn || cat.name) : cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="relative">
                            <select
                                disabled={selectedIds.size === 0}
                                onChange={async (e) => {
                                    const catId = e.target.value;
                                    if (!catId || selectedIds.size === 0) return;
                                    const copied: Product[] = [];
                                    selectedIds.forEach((id) => {
                                        const p = productsList.find((pr) => pr.id === id);
                                        if (p) {
                                            const newP = {
                                                ...p,
                                                id: `copy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                                categoryId: catId,
                                                name: p.name + " (สำเนา)",
                                            };
                                            addProduct(newP);
                                            copied.push(newP);
                                        }
                                    });
                                    const cat = catList.find((c) => c.id === catId); const catName = cat ? (typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? (cat.nameEn || cat.name) : cat.name) : catId;
                                    showSuccess(`คัดลอก ${selectedIds.size} สินค้าไป "${catName}" สำเร็จ!`);
                                    setSelectedIds(new Set());
                                    e.target.value = "";
                                    // Persist to DB
                                    await Promise.all(copied.map((p) => persistProductToDB(p)));
                                    syncWithPage();
                                }}
                                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed appearance-none cursor-pointer pr-7"
                            >
                                <option value="">{<Trans th="📋 คัดลอกกลุ่ม" en="📋 Copy group" />}</option>
                                {catList.filter((c) => c.id !== "all").map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? (cat.nameEn || cat.name) : cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={async () => {
                                if (selectedIds.size === 0) return;
                                const activeTextures = textures.filter(t => t.isActive !== false);
                                if (activeTextures.length === 0) {
                                    showError(typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? "No active textures found" : "ไม่พบข้อมูลลายสินค้าที่เปิดใช้งานอยู่");
                                    return;
                                }
                                
                                let totalAdded = 0;
                                const ids = Array.from(selectedIds);
                                
                                ids.forEach((id) => {
                                    const product = productsList.find((p) => p.id === id);
                                    if (!product) return;
                                    
                                    const vars = Array.isArray(product.variants) ? [...product.variants] : [];
                                    let addedToProduct = false;
                                    
                                    activeTextures.forEach(t => {
                                        if (!vars.find((v: any) => v.name === t.code || v.id === t.code)) {
                                            vars.push({
                                                id: t.code,
                                                name: t.code,
                                                price: Number(product.price),
                                                stock: 99,
                                                image: t.image
                                            });
                                            totalAdded++;
                                            addedToProduct = true;
                                        }
                                    });
                                    
                                    if (addedToProduct) {
                                        updateProduct(id, { variants: vars });
                                    }
                                });

                                if (totalAdded > 0) {
                                    showSuccess(`เพิ่มไป ${totalAdded} ลายในสินค้าที่เลือกสำเร็จ!`);
                                    // Use setTimeout to ensure local zustand state is updated before saving
                                    setTimeout(async () => {
                                        const updatedProducts = useProductStore.getState().products;
                                        await Promise.all(ids.map(async (id) => {
                                            const p = updatedProducts.find(x => x.id === id);
                                            if (p) await updateProductInDB(id, { variants: p.variants as any });
                                        }));
                                        syncWithPage();
                                    }, 100);
                                } else {
                                    showSuccess(`ลายทั้งหมดมีอยู่แล้วในสินค้าที่เลือก`);
                                }
                            }}
                            disabled={selectedIds.size === 0}
                            className="flex items-center gap-1.5 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Sync active textures to selected products" : "ดึงลายที่เปิดใช้งานทั้งหมดมาอัปเดตให้สินค้าที่ถูกเลือก")}
                        >
                            <span className="text-[14px]">✨</span>
                            <Trans th="ดึงลายจาก Texture" en="Import Textures" />
                        </button>

                        <div className="w-px h-6 bg-gray-600" />
                        <button
                            onClick={exportProducts}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            <Trans th="ส่งออก" en="export" />
                                                    </button>
                        <button
                            onClick={() => importRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                            <FolderUp className="w-4 h-4" />
                            <Trans th="นำเข้า" en="import" />
                                                    </button>
                        <input
                            ref={importRef}
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={importProducts}
                        />
                        {selectedIds.size > 0 && (
                            <span className="ml-auto text-xs text-gray-400">
                                <Trans th="เลือกแล้ว" en="Selected" /> {selectedIds.size} <Trans th="รายการ" en="list" />
                                                            </span>
                        )}
                    </div>

                    {/* Pagination Bar */}
                    {(() => {
                        const totalPages = Math.ceil(filtered.length / perPage);
                        const safePage = Math.min(currentPage, Math.max(totalPages, 1));
                        const maxVisible = 5;
                        let startPage = Math.max(1, safePage - Math.floor(maxVisible / 2));
                        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                        if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);
                        const pages = Array.from({ length: Math.max(0, endPage - startPage + 1) }, (_, i) => startPage + i);
                        return totalPages > 0 ? (
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <select
                                        value={perPage}
                                        onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-300"
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                    <span className="text-xs text-gray-400"><Trans th="ทั้งหมด" en="all" /> {filtered.length} {<Trans th="รายการ" en="list" />}</span>
                                </div>
                                {totalPages > 1 && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={safePage === 1}
                                            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors text-sm"
                                        >
                                            &lt;
                                        </button>
                                        {pages.map((pg) => (
                                            <button
                                                key={pg}
                                                onClick={() => setCurrentPage(pg)}
                                                className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${pg === safePage
                                                    ? "bg-pink-500 text-white shadow-md"
                                                    : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                                                    }`}
                                            >
                                                {pg}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={safePage === totalPages}
                                            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors text-sm"
                                        >
                                            &gt;
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : null;
                    })()}

                    {/* Product Grid Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {(reorderMode ? reorderedList : filtered).slice((Math.min(currentPage, Math.max(Math.ceil(filtered.length / perPage), 1)) - 1) * perPage, Math.min(currentPage, Math.max(Math.ceil(filtered.length / perPage), 1)) * perPage).map((product, idx) => (
                            <div
                                key={product.id}
                                draggable={reorderMode}
                                onDragStart={() => reorderMode && setDragIndex(idx)}
                                onDragOver={(e) => { if (reorderMode) e.preventDefault(); }}
                                onDrop={() => {
                                    if (!reorderMode || dragIndex === null || dragIndex === idx) return;
                                    const list = [...reorderedList];
                                    const [moved] = list.splice(dragIndex, 1);
                                    list.splice(idx, 0, moved);
                                    setReorderedList(list);
                                    setDragIndex(null);
                                }}
                                className={`bg-gray-800 rounded-xl overflow-hidden shadow-lg transition-all hover:shadow-xl ${selectedIds.has(product.id) ? 'ring-2 ring-pink-400' : ''} ${reorderMode ? 'cursor-grab active:cursor-grabbing' : ''} ${dragIndex === idx ? 'opacity-50' : ''}`}
                            >
                                {/* Image Section */}
                                <div className="relative">
                                    {/* Checkbox */}
                                    <button
                                        onClick={() => toggleSelect(product.id)}
                                        className="absolute top-2 left-2 z-10"
                                    >
                                        {selectedIds.has(product.id) ? (
                                            <CheckSquare className="w-5 h-5 text-pink-400" />
                                        ) : (
                                            <Square className="w-5 h-5 text-gray-400" />
                                        )}
                                    </button>

                                    {/* Product Image */}
                                    <div className="aspect-square bg-gray-700 flex items-center justify-center overflow-hidden">
                                        <img
                                            src={product.images[0]}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>

                                {/* Action buttons row */}
                                <div className="flex items-center justify-between px-2 py-1.5 bg-gray-750 border-t border-gray-700">
                                    {/* ON/OFF toggle */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newActive = product.active === false ? true : false;
                                                updateProduct(product.id, { active: newActive });
                                                updateProductInDB(product.id, { active: newActive });
                                            }}
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                                                product.active !== false
                                                    ? 'text-green-400 bg-green-900/50 hover:bg-green-900/80'
                                                    : 'text-red-400 bg-red-900/50 hover:bg-red-900/80'
                                            }`}
                                            title={product.active !== false ? 'คลิกเพื่อปิดสินค้า' : 'คลิกเพื่อเปิดสินค้า'}
                                        >
                                            {product.active !== false ? 'ON' : 'OFF'}
                                        </button>
                                    </div>
                                    {/* Copy / Edit / Delete */}
                                    <div className="flex items-center gap-0.5">
                                        <button
                                            onClick={() => {
                                                setClipboard([product]);
                                                showSuccess("คัดลอก 1 สินค้าแล้ว");
                                            }}
                                            className="p-1.5 rounded hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
                                            title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Copy" : "คัดลอก")}
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => openEdit(product)}
                                            className="p-1.5 rounded hover:bg-gray-600 text-pink-400 hover:text-pink-300 transition-colors"
                                            title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "correct" : "แก้ไข")}
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(product.id)}
                                            className="p-1.5 rounded hover:bg-gray-600 text-red-400 hover:text-red-300 transition-colors"
                                            title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "delete" : "ลบ")}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Product Info */}
                                <div className="px-3 py-2 border-t border-gray-700">
                                    <p className="text-xs text-gray-300 font-medium truncate">{product.name}</p>
                                    <p className="text-sm font-bold text-pink-400 mt-0.5">
                                        ฿{product.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    </p>
                                </div>

                                {/* Variants with stock controls */}
                                <div className="px-3 pb-3 space-y-1">
                                    {product.variants.slice(0, 3).map((v) => (
                                        <div key={v.id} className="flex items-center justify-between">
                                            <span className="text-[10px] text-gray-400 truncate max-w-[60px]">{v.name || "ค่าเริ่มต้น"}</span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        const newStock = Math.max(0, v.stock - 1);
                                                        const updatedVariants = product.variants.map((vr) =>
                                                            vr.id === v.id ? { ...vr, stock: newStock } : vr
                                                        );
                                                        updateProduct(product.id, { variants: updatedVariants });
                                                    }}
                                                    className="w-5 h-5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 flex items-center justify-center text-xs"
                                                >
                                                    −
                                                </button>
                                                <span className="text-[11px] text-gray-300 w-6 text-center">{v.stock}</span>
                                                <button
                                                    onClick={() => {
                                                        const updatedVariants = product.variants.map((vr) =>
                                                            vr.id === v.id ? { ...vr, stock: vr.stock + 1 } : vr
                                                        );
                                                        updateProduct(product.id, { variants: updatedVariants });
                                                    }}
                                                    className="w-5 h-5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 flex items-center justify-center text-xs"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {product.variants.length > 3 && (
                                        <p className="text-[10px] text-gray-500 text-center">+{product.variants.length - 3} {<Trans th="อื่นๆ" en="other" />}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {filtered.length === 0 && (
                        <div className="py-12 text-center text-gray-400">
                            <p className="text-4xl mb-2">📦</p>
                            <p className="text-sm">{<Trans th="ไม่พบสินค้า" en="Product not found" />}</p>
                        </div>
                    )}

                    {/* ===== Delete Confirmation Modal ===== */}
                    {deleteConfirm && (
                        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
                            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                                <div className="text-center">
                                    <div className="text-5xl mb-3">🗑️</div>
                                    <h3 className="text-lg font-bold text-gray-800 mb-2">{<Trans th="ยืนยันการลบ" en="Confirm deletion" />}</h3>
                                    <p className="text-sm text-gray-500 mb-1">
                                        <Trans th="คุณต้องการลบสินค้า" en="You want to delete the product" /> <strong>{productsList.find((p) => p.id === deleteConfirm)?.name}</strong> <Trans th="หรือไม่?" en="Or not?" />
                                                                            </p>
                                    <p className="text-xs text-red-400 mb-6">{<Trans th="การลบจะไม่สามารถย้อนกลับได้" en="Deletion cannot be reversed." />}</p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setDeleteConfirm(null)}
                                            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 transition-colors"
                                        >
                                            <Trans th="ยกเลิก" en="cancel" />
                                                                                    </button>
                                        <button
                                            onClick={() => handleDelete(deleteConfirm)}
                                            className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm hover:bg-red-600 transition-colors"
                                        >
                                            <Trans th="ลบสินค้า" en="Delete product" />
                                                                                    </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== Add / Edit Product Modal ===== */}
                    {modalOpen && (
                        <div className="fixed inset-0 z-[60] bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
                            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-8">
                                {/* Modal Header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-pink-100">
                                    <h2 className="text-lg font-bold text-pink-500">
                                        {editingId ? "✏️ แก้ไขสินค้า" : "➕ เพิ่มสินค้าใหม่"}
                                    </h2>
                                    <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>

                                {/* Modal Body */}
                                <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
                                    {/* Product Name */}
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 mb-1 block">{<Trans th="ชื่อสินค้า *" en="Product name *" />}</label>
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "such as SONY A7C" : "เช่น SONY A7C")}
                                            className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300"
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 mb-1 block">{<Trans th="รายละเอียด" en="details" />}</label>
                                        <textarea
                                            value={form.description}
                                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                                            placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Product description..." : "คำอธิบายสินค้า...")}
                                            rows={3}
                                            className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300 resize-none"
                                        />
                                    </div>

                                    {/* Price & Category */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 mb-1 block">{<Trans th="ราคา (บาท)" en="Price (Baht)" />}</label>
                                            <input
                                                type="number"
                                                value={form.price || ""}
                                                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                                                placeholder="0.00"
                                                className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 mb-1 block">{<Trans th="หมวดหมู่" en="Category" />}</label>
                                            <div className="flex gap-2">
                                                <select
                                                    value={form.categoryId}
                                                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                                                    className="flex-1 px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300"
                                                >
                                                    {catList.filter((c) => c.id !== "all").map((cat) => (
                                                        <option key={cat.id} value={cat.id}>
                                                            {typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? (cat.nameEn || cat.name) : cat.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => setCatModalOpen(true)}
                                                    className="flex-shrink-0 w-10 h-10 bg-pink-100 hover:bg-pink-200 text-pink-500 rounded-xl flex items-center justify-center transition-colors"
                                                    title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Add a category" : "เพิ่มหมวดหมู่")}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Images - with upload + URL */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                                                <ImageIcon className="w-3.5 h-3.5" />
                                                <Trans th="รูปภาพสินค้า" en="Product pictures" />
                                                                                            </label>
                                            <button
                                                onClick={addImage}
                                                className="text-[10px] text-pink-500 hover:text-pink-600 font-medium"
                                            >
                                                <Trans th="+ เพิ่มรูป" en="+ Add a photo" />
                                                                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {form.images.map((img, i) => (
                                                <div key={i} className="flex gap-2 items-center bg-pink-50/50 p-2 rounded-lg">
                                                    {img && (
                                                        <img src={img} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-100 flex-shrink-0 border border-pink-200" />
                                                    )}
                                                    <div className="flex-1 flex flex-col gap-1">
                                                        <input
                                                            type="text"
                                                            value={img}
                                                            onChange={(e) => updateImage(i, e.target.value)}
                                                            placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Paste the image URL" : "วาง URL รูปภาพ")}
                                                            className="w-full px-3 py-1.5 bg-white rounded-lg text-xs outline-none focus:ring-2 focus:ring-pink-300 border border-gray-200"
                                                        />
                                                    </div>
                                                    <input
                                                        ref={(el) => { productImgRefs.current[i] = el; }}
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleProductImgUpload(i, file);
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => { setStudioIndex(i); setStudioOpen(true); }}
                                                        className="flex-shrink-0 p-2 bg-purple-50 hover:bg-purple-100 text-purple-500 rounded-lg transition-colors"
                                                        title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Open Product Template Studio" : "เปิด Product Template Studio")}
                                                        type="button"
                                                    >
                                                        <Wand2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => productImgRefs.current[i]?.click()}
                                                        className="flex-shrink-0 p-2 bg-blue-50 hover:bg-blue-100 text-blue-500 rounded-lg transition-colors"
                                                        title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Upload picture" : "อัพโหลดรูป")}
                                                        type="button"
                                                    >
                                                        <Upload className="w-4 h-4" />
                                                    </button>
                                                    {form.images.length > 1 && (
                                                        <button onClick={() => removeImage(i)} className="p-1 text-red-400 hover:text-red-500" type="button">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Variants - with image upload + URL */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-medium text-gray-600">{<Trans th="ตัวเลือก / ลาย" en="Options / Patterns" />}</label>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        const activeTextures = textures.filter(t => t.isActive !== false);
                                                        if (activeTextures.length === 0) {
                                                            showError(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "No active textures found" : "ไม่พบข้อมูลลายสินค้าที่เปิดใช้งานอยู่");
                                                            return;
                                                        }
                                                        const vars = [...form.variants].filter(v => v.name.trim() !== "");
                                                        let added = 0;
                                                        activeTextures.forEach(t => {
                                                            if (!vars.find(v => v.name === t.code || v.id === t.code)) {
                                                                vars.push({
                                                                    id: t.code,
                                                                    name: t.code,
                                                                    price: form.price,
                                                                    stock: 99,
                                                                    image: t.image
                                                                });
                                                                added++;
                                                            }
                                                        });
                                                        if (added > 0) {
                                                            setForm({ ...form, variants: vars });
                                                            showSuccess(`ดึงมาเพิ่ม ${added} ลายสำเร็จ!`);
                                                        } else {
                                                            showSuccess(`ลายทั้งหมดถูกเพิ่มไว้แล้ว`);
                                                        }
                                                    }}
                                                    className="text-[10px] bg-purple-50 text-purple-500 hover:bg-purple-100 px-2 py-1 rounded-lg font-medium transition-colors flex items-center gap-1"
                                                    title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Sync active textures" : "ดึงลายที่เปิดใช้งานทั้งหมดมาต่อท้าย")}
                                                >
                                                    <Trans th="✨ ดึงลายจาก Texture" en="✨ Import Textures" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const vars = form.variants.map((v) => ({ ...v, price: form.price }));
                                                        setForm({ ...form, variants: vars });
                                                        showSuccess(`Sync ราคา ฿${form.price} ไปทั้งหมด ${vars.length} ตัวเลือก`);
                                                    }}
                                                    className="text-[10px] bg-blue-50 text-blue-500 hover:bg-blue-100 px-2 py-1 rounded-lg font-medium transition-colors flex items-center gap-1"
                                                    title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Base price applies to all options." : "ใช้ราคาหลักกับตัวเลือกทั้งหมด")}
                                                >
                                                    <Trans th="🔄 Sync ราคา" en="🔄 Price Sync" />
                                                                                                    </button>
                                                <button
                                                    onClick={() => {
                                                        const stockVal = form.variants[0]?.stock || 99;
                                                        const vars = form.variants.map((v) => ({ ...v, stock: stockVal }));
                                                        setForm({ ...form, variants: vars });
                                                        showSuccess(`Sync สต็อก ${stockVal} ไปทั้งหมด ${vars.length} ตัวเลือก`);
                                                    }}
                                                    className="text-[10px] bg-green-50 text-green-500 hover:bg-green-100 px-2 py-1 rounded-lg font-medium transition-colors flex items-center gap-1"
                                                    title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "All use the same stock." : "ใช้สต็อกเดียวกันทั้งหมด")}
                                                >
                                                    <Trans th="🔄 Sync สต็อก" en="🔄 Sync stock" />
                                                                                                    </button>
                                                <button
                                                    onClick={addVariant}
                                                    className="text-[10px] text-pink-500 hover:text-pink-600 font-medium"
                                                >
                                                    <Trans th="+ เพิ่มตัวเลือก" en="+ Add option" />
                                                                                                    </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {form.variants.map((v, i) => (
                                                <div key={i} className="bg-pink-50/50 p-2.5 rounded-lg space-y-2">
                                                    {/* Row 1: Name, Price, Stock, Delete */}
                                                    <div className="flex gap-2 items-center">
                                                        <input
                                                            type="text"
                                                            value={v.name}
                                                            onChange={(e) => updateVariant(i, "name", e.target.value)}
                                                            placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Option name" : "ชื่อตัวเลือก")}
                                                            className="flex-1 px-3 py-1.5 bg-white rounded-lg text-xs outline-none focus:ring-2 focus:ring-pink-300 border border-gray-200"
                                                        />
                                                        <input
                                                            type="number"
                                                            value={v.price || ""}
                                                            onChange={(e) => updateVariant(i, "price", parseFloat(e.target.value) || 0)}
                                                            placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "price" : "ราคา")}
                                                            className="w-20 px-3 py-1.5 bg-white rounded-lg text-xs outline-none focus:ring-2 focus:ring-pink-300 border border-gray-200"
                                                        />
                                                        <input
                                                            type="number"
                                                            value={v.stock}
                                                            onChange={(e) => updateVariant(i, "stock", parseInt(e.target.value) || 0)}
                                                            placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "stock" : "สต็อก")}
                                                            className="w-14 px-2 py-1.5 bg-white rounded-lg text-xs outline-none focus:ring-2 focus:ring-pink-300 border border-gray-200"
                                                        />
                                                        {form.variants.length > 1 && (
                                                            <button onClick={() => removeVariant(i)} className="p-1 text-red-400 hover:text-red-500">
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {/* Row 2: Variant Image - Upload + URL */}
                                                    <div className="flex gap-2 items-center pl-0">
                                                        {v.image && (
                                                            <img src={v.image} alt="" className="w-8 h-8 rounded-md object-cover bg-gray-100 flex-shrink-0 border border-pink-200" />
                                                        )}
                                                        <input
                                                            type="text"
                                                            value={v.image || ""}
                                                            onChange={(e) => updateVariant(i, "image", e.target.value)}
                                                            placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Pattern URL" : "URL รูปลาย")}
                                                            className="flex-1 px-3 py-1 bg-white rounded-lg text-[10px] outline-none focus:ring-2 focus:ring-pink-300 border border-gray-200 text-gray-500"
                                                        />
                                                        <input
                                                            ref={(el) => { variantImgRefs.current[i] = el; }}
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleVariantImgUpload(i, file);
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => variantImgRefs.current[i]?.click()}
                                                            className="flex-shrink-0 p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-500 rounded-lg transition-colors"
                                                            title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Upload pattern picture" : "อัพโหลดรูปลาย")}
                                                        >
                                                            <Upload className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-pink-100">
                                    <button
                                        onClick={() => setModalOpen(false)}
                                        className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 transition-colors"
                                    >
                                        <Trans th="ยกเลิก" en="cancel" />
                                                                            </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={!form.name.trim()}
                                        className="px-5 py-2.5 bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-md shadow-pink-200 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Save className="w-4 h-4" />
                                        {editingId ? "บันทึกการแก้ไข" : "เพิ่มสินค้า"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== Add Category Modal ===== */}
                    {catModalOpen && (
                        <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setCatModalOpen(false); }}>
                            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                                <h3 className="text-lg font-bold text-pink-500 mb-4 flex items-center gap-2">
                                    <Plus className="w-5 h-5" />
                                    <Trans th="จัดการหมวดหมู่" en="Manage categories" />
                                                                    </h3>

                                {/* Existing categories list */}
                                {catList.filter((c) => c.id !== "all").length > 0 && (
                                    <div className="mb-4 space-y-1.5 max-h-48 overflow-y-auto">
                                        <label className="text-xs text-gray-500 font-medium">{<Trans th="หมวดหมู่ที่มี" en="Available categories" />}</label>
                                        {catList.filter((c) => c.id !== "all").map((cat) => (
                                            <div key={cat.id} className="flex items-center justify-between bg-pink-50/70 px-3 py-2 rounded-lg">
                                                <span className="text-sm text-gray-700">{typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? (cat.nameEn || cat.name) : cat.name}</span>
                                                <button
                                                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                                    title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Delete category" : "ลบหมวดหมู่")}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add new */}
                                <label className="text-xs text-gray-500 font-medium mb-1 block">{<Trans th="เพิ่มหมวดหมู่ใหม่" en="Add a new category" />}</label>
                                <input
                                    type="text"
                                    value={newCatName}
                                    onChange={(e) => setNewCatName(e.target.value)}
                                    placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Category name, such as CAMERA FUJI" : "ชื่อหมวดหมู่ เช่น CAMERA FUJI")}
                                    className="w-full px-4 py-2.5 bg-pink-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-300 mb-4"
                                    autoFocus
                                    onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setCatModalOpen(false); setNewCatName(""); }}
                                        className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 transition-colors"
                                    >
                                        <Trans th="ปิด" en="turn off" />
                                                                            </button>
                                    <button
                                        onClick={handleAddCategory}
                                        disabled={!newCatName.trim()}
                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
                                    >
                                        <Trans th="เพิ่มหมวดหมู่" en="Add a category" />
                                                                            </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== Delete Category Confirm Modal ===== */}
                    {deleteCatConfirm && (
                        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setDeleteCatConfirm(null); }}>
                            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                                <div className="text-center mb-4">
                                    <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Trash2 className="w-7 h-7 text-red-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800">{<Trans th="ลบหมวดหมู่?" en="Delete category?" />}</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        &quot;{deleteCatConfirm.name}<Trans th="&quot; จะถูกลบ" en="' will be deleted." />
                                                                            </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        <Trans th="สินค้าในหมวดนี้จะกลายเป็น &quot;ไม่มีหมวดหมู่&quot;" en="Products in this category will become 'No category'" />
                                                                            </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setDeleteCatConfirm(null)}
                                        className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 transition-colors"
                                    >
                                        <Trans th="ยกเลิก" en="cancel" />
                                                                            </button>
                                    <button
                                        onClick={confirmDeleteCategory}
                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-400 to-red-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all"
                                    >
                                        <Trans th="ลบเลย" en="Delete it now." />
                                                                            </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Template Studio iframe modal — patched local version supports window.parent.postMessage */}
            {studioOpen && (
                <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="relative w-full max-w-6xl h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                            <div className="flex items-center gap-2">
                                <Wand2 className="w-5 h-5" />
                                <span className="font-semibold text-sm">Product Template Studio</span>
                            </div>
                            <button
                                onClick={() => setStudioOpen(false)}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {/* iframe — local patched version with iframe postMessage support */}
                        <iframe
                            src={`/template-studio/index.html?target=image&index=${studioIndex}`}
                            className="flex-1 w-full border-0"
                            allow="clipboard-write"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
