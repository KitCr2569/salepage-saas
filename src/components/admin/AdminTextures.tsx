"use client";

import React, { useState, useRef } from "react";
import { useProductStore } from "@/store/useProductStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useShopStore } from "@/store/useShopStore";
import { Texture } from "@/types";
import { Plus, Edit2, Trash2, Search, X, Save, Image as ImageIcon, Upload, CheckSquare, Square, Copy, ClipboardPaste, ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import { Trans } from "@/components/Trans";
import Cropper from "react-easy-crop";

interface Area {
    width: number;
    height: number;
    x: number;
    y: number;
}

interface TextureFormData {
    series: string;
    code: string;
    name: string;
    image: string;
}

const emptyForm: TextureFormData = {
    series: "Default Series",
    code: "",
    name: "",
    image: "",
};

const getRadianAngle = (degreeValue: number) => {
    return (degreeValue * Math.PI) / 180;
};

const getCroppedImg = async (imageSrc: string, pixelCrop: Area, rotation: number = 0): Promise<string> => {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.crossOrigin = "anonymous";
        img.src = imageSrc;
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) return "";

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));
    
    // set each dimensions to double largest dimension to allow for a safe area for the
    // image to rotate in without being clipped by canvas context
    canvas.width = safeArea;
    canvas.height = safeArea;

    // translate canvas context to a central location on image to allow rotating around the center.
    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate(getRadianAngle(rotation));
    ctx.translate(-safeArea / 2, -safeArea / 2);

    // draw rotated image and store data.
    ctx.drawImage(
        image,
        safeArea / 2 - image.width * 0.5,
        safeArea / 2 - image.height * 0.5
    );
    const data = ctx.getImageData(0, 0, safeArea, safeArea);
    
    // set canvas width to final desired crop size - this will clear existing context
    const MAX_SIZE = 600;
    let width = pixelCrop.width;
    let height = pixelCrop.height;

    if (width > MAX_SIZE || height > MAX_SIZE) {
        const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
    }
    
    canvas.width = width;
    canvas.height = height;

    // paste generated rotate image with correct offsets for x,y crop values.
    ctx.putImageData(
        data,
        Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
        Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    );

    // If we shrunk the image based on MAX_SIZE, we need a second canvas to downscale
    if (width !== pixelCrop.width || height !== pixelCrop.height) {
        const resultCanvas = document.createElement("canvas");
        const resultCtx = resultCanvas.getContext("2d");
        if (resultCtx) {
            resultCanvas.width = width;
            resultCanvas.height = height;
            // Draw original cropped img onto the downscaled canvas
            resultCtx.drawImage(
               canvas, 
               0, 0, pixelCrop.width, pixelCrop.height,
               0, 0, width, height
            );
            return resultCanvas.toDataURL("image/jpeg", 0.6);
        }
    }

    return canvas.toDataURL("image/jpeg", 0.6);
};

const SearchableDropdown = ({ 
    options, 
    onSelect, 
    placeholder, 
    className
}: { 
    options: string[], 
    onSelect: (val: string) => void, 
    placeholder: string,
    className: string
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);
    
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

    return (
        <div ref={wrapperRef} className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open); setSearch(""); }}
                className={className}
                type="button"
            >
                <span>{placeholder}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-50 ml-2" />
            </button>
            {open && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.15)] border border-pink-100 p-2 z-[90] animate-fade-in origin-bottom-left">
                    <div className="relative mb-2">
                        <Search className="absolute left-2.5 top-2 w-4 h-4 text-pink-300" />
                        <input
                            type="text"
                            placeholder="ค้นหาหมวดหมู่..."
                            value={search}
                            autoFocus
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="w-full pl-8 pr-3 py-1.5 text-sm border-2 border-pink-50 rounded-lg focus:outline-none focus:border-pink-300 bg-pink-50/30"
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {filtered.length === 0 ? (
                            <div className="text-xs text-gray-400 text-center py-3">ไม่พบหมวดหมู่</div>
                        ) : (
                            filtered.map(opt => (
                                <button
                                    key={opt}
                                    onClick={(e) => { e.stopPropagation(); onSelect(opt); setOpen(false); }}
                                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-pink-50 text-gray-700 hover:text-pink-600 transition-colors truncate"
                                    title={opt}
                                >
                                    {opt}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function AdminTextures() {
    const { textures, addTexture, updateTexture, deleteTexture } = useProductStore();
    const connectedPage = useAuthStore((s) => s.connectedPage);
    const { syncWithPage } = useShopStore();
    
    const [searchQuery, setSearchQuery] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<TextureFormData>({ ...emptyForm });
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    
    // Zoom/Crop states
    const [tempImage, setTempImage] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    
    // Bulk actions
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [clipboard, setClipboard] = useState<Texture[]>([]);
    const [collapsedSeries, setCollapsedSeries] = useState<Set<string>>(new Set());
    const [deleteConfirmSingle, setDeleteConfirmSingle] = useState<string | null>(null);
    const [deleteConfirmBulk, setDeleteConfirmBulk] = useState<boolean>(false);
    const [deleteConfirmSeries, setDeleteConfirmSeries] = useState<string | null>(null);

    // Prompt Modal
    const [seriesPrompt, setSeriesPrompt] = useState<{
        isOpen: boolean;
        type: "new" | "edit";
        oldValue: string;
        title: string;
    }>({ isOpen: false, type: "new", oldValue: "", title: "" });
    const [seriesPromptValue, setSeriesPromptValue] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const toggleCollapse = (series: string) => {
        setCollapsedSeries(prev => {
            const next = new Set(prev);
            if (next.has(series)) next.delete(series);
            else next.add(series);
            return next;
        });
    };

    // Derived Data
    const filteredTextures = textures.filter((t) => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.series.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groupedTextures = filteredTextures.reduce((acc, t) => {
        if (!acc[t.series]) acc[t.series] = [];
        acc[t.series].push(t);
        return acc;
    }, {} as Record<string, Texture[]>);

    const uniqueSeriesList = Array.from(new Set(textures.map((t) => t.series))).sort();

    const handleImgUpload = (file: File) => {
        const url = URL.createObjectURL(file);
        setTempImage(url);
        setZoom(1);
        setRotation(0);
        setCrop({ x: 0, y: 0 });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleImgUpload(e.dataTransfer.files[0]);
            return;
        }

        const html = e.dataTransfer.getData("text/html");
        const match = html && html.match(/src\s*=\s*["']([^"']+)["']/);
        const url = match ? match[1] : e.dataTransfer.getData("URL") || e.dataTransfer.getData("text/plain");

        if (url && (url.startsWith('http') || url.startsWith('data:'))) {
            try {
                // Try fetching to bypass potential CORS limitations during canvas export later
                const res = await fetch(url);
                const blob = await res.blob();
                handleImgUpload(new File([blob], "dropped-image.jpg", { type: blob.type }));
            } catch (error) {
                // Fallback to direct URL if fetch fails
                setTempImage(url);
                setZoom(1);
                setRotation(0);
                setCrop({ x: 0, y: 0 });
            }
        }
    };

    const showError = (msg: string) => {
        setErrorMsg(msg);
        setTimeout(() => setErrorMsg(null), 3000);
    };

    const showSuccess = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(null), 3000);
    };

    const openAdd = () => {
        setEditingId(null);
        setForm({ ...emptyForm });
        setTempImage(null);
        setZoom(1);
        setRotation(0);
        setCrop({ x: 0, y: 0 });
        setModalOpen(true);
    };

    const openEdit = (texture: Texture) => {
        setEditingId(texture.id);
        setForm({
            series: texture.series,
            code: texture.code,
            name: texture.name,
            image: texture.image,
        });
        setTempImage(texture.image);
        setZoom(1);
        setRotation(0);
        setCrop({ x: 0, y: 0 });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) return;
        setIsCropping(true);

        let finalImage = form.image;
        if (tempImage && croppedAreaPixels) {
            try {
                finalImage = await getCroppedImg(tempImage, croppedAreaPixels, rotation);
            } catch (e) {
                console.error("Crop error:", e);
                finalImage = tempImage;
            }
        } else if (tempImage) {
            finalImage = tempImage;
        }

        const pageId = connectedPage?.id;
        const bodyData = { 
            series: form.series || "Default Series", 
            code: form.code, 
            name: form.name, 
            image: finalImage,
            isActive: true 
        };

        const bodySize = new Blob([JSON.stringify(bodyData)]).size;
        if (bodySize > 4 * 1024 * 1024) {
            setIsCropping(false);
            showError(`รูปภาพมีขนาดใหญ่เกินไป (${(bodySize / 1024 / 1024).toFixed(2)}MB) กรุณาลดขนาดภาพก่อนบันทึก`);
            return;
        }

        if (editingId) {
            updateTexture(editingId, bodyData);
            if (pageId) {
                try {
                    const res = await fetch(`/api/shop/${pageId}/textures/${editingId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(bodyData),
                    });
                    if (!res.ok) throw new Error("Save failed");
                    syncWithPage();
                } catch (e) {
                    console.error("PUT texture error:", e);
                    showError("บันทึกไม่สำเร็จ");
                }
            }
        } else {
            const newId = `tex-${Date.now()}`;
            addTexture({ id: newId, ...bodyData, sortOrder: 0 });
            if (pageId) {
                try {
                    const res = await fetch(`/api/shop/${pageId}/textures`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(bodyData),
                    });
                    if (!res.ok) throw new Error("Save failed");
                    syncWithPage();
                } catch (e) {
                    console.error("POST texture error:", e);
                    showError("บันทึกไม่สำเร็จ");
                }
            }
        }

        setIsCropping(false);
        setModalOpen(false);
        setEditingId(null);
        setTempImage(null);
    };

    const toggleSelect = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const selectAll = () => {
        if (selectedIds.size === filteredTextures.length && filteredTextures.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredTextures.map((t) => t.id)));
        }
    };

    const confirmDeleteBulk = async () => {
        const pageId = connectedPage?.id;
        const ids = Array.from(selectedIds);
        
        ids.forEach(deleteTexture);
        setSelectedIds(new Set());
        setDeleteConfirmBulk(false);

        if (pageId) {
            try {
                await fetch(`/api/shop/${pageId}/textures/bulk?ids=${ids.join(",")}`, { method: "DELETE" });
                syncWithPage();
            } catch (e) { console.error("Bulk delete texture error:", e); }
        }
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;
        setDeleteConfirmBulk(true);
    };

    const confirmDeleteSingle = async () => {
        if (!deleteConfirmSingle) return;
        const id = deleteConfirmSingle;
        const pageId = connectedPage?.id;
        
        deleteTexture(id);
        setDeleteConfirmSingle(null);

        if (pageId) {
            try {
                await fetch(`/api/shop/${pageId}/textures/${id}`, { method: "DELETE" });
            } catch (e) { console.error("Del texture error:", e); }
        }
    };

    const handleDeleteSingle = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteConfirmSingle(id);
    };

    const toggleActiveStatus = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        const nextStatus = !currentStatus;
        const target = textures.find(t => t.id === id);
        if (!target) return;
        const pageId = connectedPage?.id;
        
        // Optimistic update
        updateTexture(id, { isActive: nextStatus });
        
        if (pageId) {
            try {
                await fetch(`/api/shop/${pageId}/textures/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ isActive: nextStatus }),
                });
            } catch (e) {
                console.error("Toggle texture status error:", e);
                // Rollback
                updateTexture(id, { isActive: currentStatus });
            }
        }
    };

    const toggleSeriesActive = async (series: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const seriesItems = textures.filter(t => t.series === series);
        if (seriesItems.length === 0) return;
        
        // If ALL are active -> disable all; otherwise -> enable all
        const allActive = seriesItems.every(t => t.isActive !== false);
        const nextStatus = !allActive;
        const pageId = connectedPage?.id;
        
        // Optimistic update all
        seriesItems.forEach(t => updateTexture(t.id, { isActive: nextStatus }));
        
        // Persist to DB
        if (pageId) {
            try {
                await Promise.all(seriesItems.map(t =>
                    fetch(`/api/shop/${pageId}/textures/${t.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ isActive: nextStatus }),
                    })
                ));
            } catch (err) {
                console.error("Toggle series active error:", err);
                // Rollback
                seriesItems.forEach(t => updateTexture(t.id, { isActive: !nextStatus }));
            }
        }
    };

    const handleCopy = () => {
        const toCopy = filteredTextures.filter(t => selectedIds.has(t.id));
        setClipboard(toCopy);
    };

    const handlePaste = async () => {
        if (clipboard.length === 0) return;
        const pageId = connectedPage?.id;
        
        for (const item of clipboard) {
            const bodyData = { ...item, name: `${item.name} (Copy)` };
            const newId = `tex-${Date.now()}-${Math.random()}`;
            addTexture({ ...bodyData, id: newId });
            
            if (pageId) {
                await fetch(`/api/shop/${pageId}/textures`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(bodyData),
                });
            }
        }
        syncWithPage();
        setSelectedIds(new Set());
    };

    const confirmSeriesPrompt = async () => {
        const newName = seriesPromptValue.trim();
        if (!newName) return;

        setSeriesPrompt(prev => ({ ...prev, isOpen: false }));
        setTimeout(async () => {
            if (seriesPrompt.type === "edit") {
                if (newName === seriesPrompt.oldValue) return;
                const seriesItems = textures.filter(t => t.series === seriesPrompt.oldValue);
                const pageId = connectedPage?.id;

                // Optimistic
                seriesItems.forEach(t => updateTexture(t.id, { series: newName }));

                // DB Persist
                if (pageId) {
                    try {
                        await Promise.all(seriesItems.map(t =>
                            fetch(`/api/shop/${pageId}/textures/${t.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ series: newName }),
                            })
                        ));
                    } catch (err) {
                        console.error("Rename series error:", err);
                    }
                }
                syncWithPage();
            } else if (seriesPrompt.type === "new") {
                const pageId = connectedPage?.id;
                const idsToMove = Array.from(selectedIds);
                
                if (idsToMove.length > 0) {
                    idsToMove.forEach(id => updateTexture(id, { series: newName }));
                    setSelectedIds(new Set());
                    
                    if (pageId) {
                        try {
                            await Promise.all(idsToMove.map(id =>
                                fetch(`/api/shop/${pageId}/textures/${id}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ series: newName }),
                                })
                            ));
                            syncWithPage();
                        } catch (err) {
                            console.error("Create and move series error:", err);
                        }
                    }
                } else {
                    setTimeout(() => {
                        setEditingId(null);
                        setForm({ ...emptyForm, series: newName });
                        setTempImage(null);
                        setModalOpen(true);
                    }, 50);
                }
            }
        }, 150);
    };

    const handleRenameSeries = async (oldSeries: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSeriesPromptValue(oldSeries);
        setSeriesPrompt({
            isOpen: true,
            type: "edit",
            oldValue: oldSeries,
            title: typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Enter new series name:" : "พิมพ์ชื่อหมวดหมู่ใหม่:"
        });
    };


    const confirmDeleteSeries = async () => {
        if (!deleteConfirmSeries) return;
        const series = deleteConfirmSeries;
        const seriesItems = textures.filter(t => t.series === series);
        const pageId = connectedPage?.id;

        // Optimistic
        seriesItems.forEach(t => deleteTexture(t.id));
        setDeleteConfirmSeries(null);

        // DB Persist
        if (pageId) {
            try {
                const ids = seriesItems.map(t => t.id).join(",");
                if (ids) {
                    await fetch(`/api/shop/${pageId}/textures/bulk?ids=${ids}`, { method: "DELETE" });
                    syncWithPage();
                }
            } catch (err) {
                console.error("Delete series error:", err);
            }
        }
    };

    const handleDeleteSeries = (series: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteConfirmSeries(series);
    };

    // Global Keyboard Shortcuts (Ctrl+C, Ctrl+V, Delete) & Global Paste
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName;
            const isInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA';

            if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                if (modalOpen) {
                    handleSave();
                }
                return;
            }

            if (isInput) return;

            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'a' || e.key === 'A') {
                    e.preventDefault();
                    selectAll();
                } else if (e.key === 'c' || e.key === 'C') {
                    if (selectedIds.size > 0) {
                        e.preventDefault();
                        handleCopy();
                        showSuccess('คัดลอก ' + selectedIds.size + ' รายการแล้ว');
                    }
                } else if (e.key === 'v' || e.key === 'V') {
                    if (clipboard.length > 0) {
                        e.preventDefault();
                        handlePaste();
                    }
                }
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedIds.size > 0 && !deleteConfirmBulk && !deleteConfirmSingle && !deleteConfirmSeries) {
                    e.preventDefault();
                    handleDeleteSelected();
                }
            }
        };

        const handleGlobalPaste = (e: ClipboardEvent) => {
            const activeTag = document.activeElement?.tagName;
            if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith("image/")) {
                    const file = items[i].getAsFile();
                    if (file) {
                        e.preventDefault();
                        if (!modalOpen) {
                            openAdd();
                        }
                        handleImgUpload(file);
                        return;
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('paste', handleGlobalPaste);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('paste', handleGlobalPaste);
        };
    }, [selectedIds, clipboard, modalOpen, handleCopy, handlePaste, handleDeleteSelected, openAdd]);

    return (
        <div className="bg-white rounded-[24px] shadow-xl shadow-pink-200/50 p-6 md:p-8 animate-fade-in border border-pink-100 relative">
            {/* Error Toast */}
            {errorMsg && (
                <div className="absolute top-4 right-4 z-[100] bg-red-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-[slideIn_0.3s_ease]">
                    ⚠️ {errorMsg}
                </div>
            )}
            
            {/* Success Toast */}
            {successMsg && (
                <div className="absolute top-4 right-4 z-[100] bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-[slideIn_0.3s_ease]">
                    ✅ {successMsg}
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-extrabold text-pink-500 mb-2">
                        <Trans th="จัดการลายสินค้า (Texture)" en="Manage Textures" />
                    </h2>
                    <p className="text-sm text-gray-500 font-medium">
                        <Trans th="เพิ่มหรือแก้ไขลวดลายที่สามารถนำไปใช้กับสินค้าได้" en="Add or edit patterns that can be used with products" />
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="ค้นหา..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full md:w-48 pl-9 pr-4 py-2 border-2 border-pink-100 rounded-xl focus:outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100/50"
                        />
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-pink-400" />
                    </div>

                    <button
                        onClick={openAdd}
                        className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 shadow-md shadow-pink-200 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        <Trans th="เพิ่มลายใหม่" en="Add Texture" />
                    </button>
                </div>
            </div>

            {/* Bulk Actions — Fixed Bottom Toolbar */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[50] flex flex-wrap items-center gap-3 p-3 bg-white/95 backdrop-blur-xl rounded-2xl border border-pink-200 shadow-2xl shadow-pink-200/40 max-w-[90vw]">
                <button
                    onClick={async () => {
                        setSeriesPromptValue("");
                        setSeriesPrompt({
                            isOpen: true,
                            type: "new",
                            oldValue: "",
                            title: typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Enter new series name:" : (selectedIds.size > 0 ? "เพิ่ม Series หมวดหมู่ใหม่ (ย้ายรายการที่เลือกไปหมวดหมู่นี้):" : "เพิ่ม Series หมวดหมู่ใหม่ (เริ่มสร้างลายในหมวดหมู่นี้):")
                        });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-sm font-medium text-pink-600 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <Trans th="สร้าง Series หมวดหมู่ใหม่" en="New Series" />
                </button>

                <div className="h-6 w-px bg-pink-200" />

                <button
                    onClick={selectAll}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-pink-50 text-sm font-medium text-gray-600 transition-colors"
                >
                    {selectedIds.size === filteredTextures.length && filteredTextures.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-pink-500" />
                    ) : (
                        <Square className="w-4 h-4" />
                    )}
                    <Trans th="เลือกทั้งหมด" en="Select All" />
                </button>
                
                {selectedIds.size > 0 && (
                    <>
                        <div className="h-6 w-px bg-pink-200" />
                        <span className="text-sm font-bold text-pink-600">
                            {selectedIds.size} <Trans th="รายการ" en="items" />
                        </span>
                        
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-sm font-medium text-orange-600 transition-colors"
                        >
                            <X className="w-4 h-4" />
                            <Trans th="ยกเลิก" en="Deselect" />
                        </button>
                        
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-sm font-medium text-blue-600 transition-colors"
                        >
                            <Copy className="w-4 h-4" />
                            <Trans th="คัดลอก" en="Copy" />
                        </button>
                        
                        <button
                            onClick={handleDeleteSelected}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-sm font-medium text-red-600 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            <Trans th="ลบ" en="Delete" />
                        </button>
                    </>
                )}

                {selectedIds.size > 0 && (
                    <>
                        <div className="h-6 w-px bg-pink-200" />
                        <SearchableDropdown
                            options={uniqueSeriesList}
                            placeholder={typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? '📁 Move to series' : '📁 ย้ายหมวดหมู่'}
                            className="flex items-center justify-between px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg text-sm font-medium transition-colors"
                            onSelect={async (targetSeries) => {
                                if (!targetSeries || selectedIds.size === 0) return;
                                const pageId = connectedPage?.id;
                                const idsToMove = Array.from(selectedIds);
                                
                                idsToMove.forEach(id => updateTexture(id, { series: targetSeries }));
                                setSelectedIds(new Set());
                                
                                if (pageId) {
                                    try {
                                        await Promise.all(idsToMove.map(id =>
                                            fetch(`/api/shop/${pageId}/textures/${id}`, {
                                                method: "PUT",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ series: targetSeries }),
                                            })
                                        ));
                                        syncWithPage();
                                    } catch (err) {
                                        console.error("Move series error:", err);
                                    }
                                }
                            }}
                        />
                        <SearchableDropdown
                            options={uniqueSeriesList}
                            placeholder={typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? '📋 Copy to series' : '📋 คัดลอกไปหมวดหมู่'}
                            className="flex items-center justify-between px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-sm font-medium transition-colors"
                            onSelect={async (targetSeries) => {
                                if (!targetSeries || selectedIds.size === 0) return;
                                const pageId = connectedPage?.id;
                                const itemsToCopy = textures.filter(t => selectedIds.has(t.id));
                                setSelectedIds(new Set());
                                
                                const newItems = itemsToCopy.map((item) => ({
                                    ...item,
                                    id: `copy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                    series: targetSeries,
                                    name: `${item.name} (Copy)`
                                }));

                                newItems.forEach(item => addTexture(item));

                                if (pageId) {
                                    try {
                                        await Promise.all(newItems.map(item =>
                                            fetch(`/api/shop/${pageId}/textures`, {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify(item),
                                            })
                                        ));
                                        syncWithPage();
                                    } catch (err) {
                                        console.error("Copy series error:", err);
                                    }
                                }
                            }}
                        />
                    </>
                )}

                {clipboard.length > 0 && (
                    <>
                        <div className="h-6 w-px bg-pink-200" />
                        <button
                            onClick={handlePaste}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-sm font-medium text-green-600 transition-colors"
                        >
                            <ClipboardPaste className="w-4 h-4" />
                            <Trans th="วาง" en="Paste" /> ({clipboard.length})
                        </button>
                    </>
                )}
            </div>

            {/* List */}
            <div className="space-y-6">
                {Object.keys(groupedTextures).length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">ไม่พบลายสินค้า</p>
                    </div>
                ) : (
                    Object.entries(groupedTextures).map(([series, items]) => {
                        const isCollapsed = collapsedSeries.has(series);
                        return (
                            <div key={series} className="bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden">
                                {/* Header */}
                                <div 
                                    className="px-4 py-3 bg-gray-100/80 flex justify-between items-center cursor-pointer hover:bg-gray-200/50 transition-colors"
                                    onClick={() => toggleCollapse(series)}
                                >
                                    <div className="flex items-center gap-2">
                                        {isCollapsed ? <ChevronRight className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                                        <h3 className={`font-bold ${items.every(t => t.isActive !== false) ? 'text-gray-800' : 'text-gray-400'}`}>{series}</h3>
                                        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{items.length}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => handleRenameSeries(series, e)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-blue-600 transition-colors"
                                            title={typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'Rename Series' : 'เปลี่ยนชื่อหมวดหมู่'}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => toggleSeriesActive(series, e)}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                                items.every(t => t.isActive !== false)
                                                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                                    : 'bg-red-100 text-red-500 hover:bg-red-200'
                                            }`}
                                            title={items.every(t => t.isActive !== false) ? 'ปิดทั้งหมวดหมู่' : 'เปิดทั้งหมวดหมู่'}
                                        >
                                            {items.every(t => t.isActive !== false) ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                            {items.every(t => t.isActive !== false) ? 'เปิด' : 'ปิด'}
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteSeries(series, e)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                                            title={typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'Delete Series' : 'ลบหมวดหมู่'}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Grid */}
                                {!isCollapsed && (
                                    <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                        {items.map((t) => {
                                            const isSelected = selectedIds.has(t.id);
                                            return (
                                                <div 
                                                    key={t.id} 
                                                    onClick={() => openEdit(t)}
                                                    className={`group relative rounded-xl border-2 overflow-hidden bg-white cursor-pointer transition-all ${isSelected ? 'border-pink-500 ring-4 ring-pink-100' : 'border-transparent hover:border-pink-200'}`}
                                                >
                                                    {/* Select Checkbox */}
                                                    <div 
                                                        onClick={(e) => toggleSelect(t.id, e)}
                                                        className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-md flex items-center justify-center transition-opacity ${isSelected ? 'bg-pink-500 text-white opacity-100' : 'bg-white/80 text-transparent opacity-0 group-hover:opacity-100 shadow-sm'}`}
                                                    >
                                                        <CheckSquare className="w-4 h-4" />
                                                    </div>

                                                    {/* Delete Button */}
                                                    <div 
                                                        onClick={(e) => handleDeleteSingle(t.id, e)}
                                                        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-md bg-white/80 hover:bg-red-500 hover:text-white flex items-center justify-center text-gray-500 opacity-0 group-hover:opacity-100 shadow-sm transition-all"
                                                        title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Delete" : "ลบข้อมูล")}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </div>

                                                    {/* Toggle Active Button */}
                                                    <div 
                                                        onClick={(e) => toggleActiveStatus(t.id, t.isActive ?? true, e)}
                                                        className={`absolute top-10 right-2 z-10 w-6 h-6 rounded-md flex items-center justify-center shadow-sm transition-all cursor-pointer ${t.isActive !== false ? 'bg-white/80 text-green-500 hover:bg-green-100 opacity-0 group-hover:opacity-100' : 'bg-red-100 text-red-500 opacity-100'}`}
                                                        title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Enable/Disable" : "เปิด/ปิด การใช้งาน")}
                                                    >
                                                        {t.isActive !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                                    </div>
                                                    
                                                    {/* Image */}
                                                    <div className={`aspect-[4/3] bg-gray-100 relative ${t.isActive === false ? 'opacity-40 grayscale' : ''}`}>
                                                        {t.image ? (
                                                            <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                                                <ImageIcon className="w-8 h-8 mb-1 opacity-50" />
                                                                <span className="text-[10px]">No image</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Info Bottom */}
                                                    <div className="p-2 bg-black/80 flex flex-col justify-end min-h-[50px] relative">
                                                        {t.code && <div className="text-white font-black text-sm text-right tracking-wider">{t.code}</div>}
                                                        <div className="text-gray-300 text-[10px] text-right truncate font-medium">{t.name}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* ===== Add / Edit Modal ===== */}
            {modalOpen && (
                <div className="fixed inset-0 z-[60] bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl my-8">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-pink-100">
                            <h2 className="text-lg font-bold text-pink-500">
                                {editingId ? "แก้ไขลายสินค้า" : "เพิ่มลายสินค้า"}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-full p-2 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">ภาพลายสินค้า (Texture)</label>
                                <div 
                                    className={`w-full aspect-[4/3] rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden relative transition-colors ${
                                        isDragging ? "bg-pink-100 border-pink-500" : "bg-gray-50 border-gray-300"
                                    }`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    {tempImage ? (
                                        <Cropper
                                            image={tempImage}
                                            crop={crop}
                                            zoom={zoom}
                                            rotation={rotation}
                                            aspect={4 / 3}
                                            onCropChange={setCrop}
                                            onCropComplete={(_, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
                                            onZoomChange={setZoom}
                                            onRotationChange={setRotation}
                                            showGrid={true}
                                            style={{ containerStyle: { width: "100%", height: "100%" } }}
                                        />
                                    ) : (
                                        <div 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-pink-50 hover:text-pink-500 text-gray-400 transition-colors"
                                        >
                                            <Upload className="w-8 h-8 mx-auto mb-2" />
                                            <span className="text-sm font-medium">อัปโหลดรูปภาพ (ลากไฟล์หรือรูปภาพมาวางได้เลย)</span>
                                        </div>
                                    )}

                                    {tempImage && (
                                        <div 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute bottom-2 right-2 z-10 bg-black/60 hover:bg-black/80 text-white rounded-lg px-3 py-1.5 flex items-center gap-2 cursor-pointer transition-colors shadow-lg"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                            <span className="text-xs font-medium">เปลี่ยนรูปภาพ</span>
                                        </div>
                                    )}
                                    
                                    {isDragging && !tempImage && (
                                        <div className="absolute inset-0 bg-pink-50/80 flex items-center justify-center pointer-events-none z-20">
                                            <span className="text-pink-600 font-bold text-lg">วางรูปภาพที่นี่</span>
                                        </div>
                                    )}
                                </div>
                                {tempImage && (
                                    <div className="mt-4 flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-gray-500 min-w-[36px]">ซูม:</span>
                                            <input
                                                type="range"
                                                value={zoom}
                                                min={1}
                                                max={3}
                                                step={0.1}
                                                aria-labelledby="Zoom"
                                                onChange={(e) => setZoom(Number(e.target.value))}
                                                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                                            />
                                            <span className="text-xs font-bold text-gray-500 w-10 text-right">{Math.round(zoom * 100)}%</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-gray-500 min-w-[36px]">หมุน:</span>
                                            <input
                                                type="range"
                                                value={rotation}
                                                min={0}
                                                max={360}
                                                step={1}
                                                aria-labelledby="Rotation"
                                                onChange={(e) => setRotation(Number(e.target.value))}
                                                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                                            />
                                            <span className="text-xs font-bold text-gray-500 w-10 text-right">{rotation}°</span>
                                        </div>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: "none" }}
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            handleImgUpload(e.target.files[0]);
                                        }
                                        e.target.value = ""; // reset so same file can be selected
                                    }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">ซีรีส์ / หมวดหมู่ (Series)</label>
                                <input
                                    type="text"
                                    value={form.series}
                                    onChange={(e) => setForm({ ...form, series: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-pink-500"
                                    placeholder="เช่น Mamba Series"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">รหัส (Code)</label>
                                    <input
                                        type="text"
                                        value={form.code}
                                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-pink-500"
                                        placeholder="เช่น MBBK"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อลาย (Name) *</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-pink-500"
                                        placeholder="เช่น Mamba black"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-2xl">
                            <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors">
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!form.name.trim() || isCropping}
                                className="px-6 py-2.5 rounded-xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 text-white hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save className="w-4 h-4" />
                                {isCropping ? "กำลังบันทึก..." : "บันทึก"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ===== Single Delete Confirm Modal ===== */}
            {deleteConfirmSingle && (
                <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
                        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">ยืนยันการลบ</h3>
                        <p className="text-gray-500 mb-6">คุณแน่ใจหรือไม่ว่าต้องการลบลายสินค้านี้? การกระทำนี้ไม่สามารถย้อนกลับได้</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmSingle(null)}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={confirmDeleteSingle}
                                className="flex-1 px-4 py-2 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600"
                            >
                                ลบข้อมูล
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Bulk Delete Confirm Modal ===== */}
            {deleteConfirmBulk && (
                <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center animate-zoom-in">
                        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">ยืนยันการลบ {selectedIds.size} รายการ</h3>
                        <p className="text-gray-500 mb-6">คุณแน่ใจหรือไม่ว่าต้องการลบลายสินค้าทั้งหมดที่เลือก?</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmBulk(false)}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={confirmDeleteBulk}
                                className="flex-1 px-4 py-2 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
                            >
                                ลบข้อมูล
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Series Delete Confirm Modal ===== */}
            {deleteConfirmSeries && (
                <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl text-center transform transition-all animate-[slideIn_0.3s_ease]">
                        <div className="relative mx-auto w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-5">
                            <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-20"></div>
                            <Trash2 className="w-10 h-10 text-red-500 relative z-10" />
                        </div>
                        <h3 className="text-xl font-extrabold text-gray-800 mb-3">ลบหมวดหมู่</h3>
                        <p className="text-sm text-gray-500 mb-8 font-medium">
                            คุณแน่ใจหรือไม่ว่าต้องการลบลายทั้งหมดในหมวดหมู่ <br/>
                            <span className="text-red-500 font-bold text-base mt-2 inline-block px-3 py-1 bg-red-50 rounded-lg">"{deleteConfirmSeries}"</span><br/>
                            <span className="text-xs font-normal mt-2 block opacity-80">(ไม่สามารถขอกู้คืนรายการที่ถูกลบได้)</span>
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmSeries(null)}
                                className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all hover:scale-[1.02]"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={confirmDeleteSeries}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-red-500/25 hover:scale-[1.02]"
                            >
                                ยืนยันการลบ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        {/* ===== Prompt Modal ===== */}
        {seriesPrompt.isOpen && (
            <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-3xl w-full max-w-sm p-6 md:p-8 shadow-2xl transform transition-all animate-[slideIn_0.3s_ease]">
                    <h3 className="text-xl font-extrabold text-pink-500 mb-2">
                        {seriesPrompt.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4 font-medium">
                        <Trans th="กรุณาระบุชื่อซีรีส์/หมวดหมู่ที่ต้องการ" en="Please specify the series/category name" />
                    </p>
                    <input
                        type="text"
                        value={seriesPromptValue}
                        onChange={(e) => setSeriesPromptValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmSeriesPrompt();
                            if (e.key === 'Escape') setSeriesPrompt(prev => ({ ...prev, isOpen: false }));
                        }}
                        autoFocus
                        placeholder={typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Series Name" : "ชื่อหมวดหมู่"}
                        className="w-full px-4 py-3 bg-pink-50 border-2 border-pink-100 rounded-xl focus:outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100/50 mb-3 font-medium text-gray-700 placeholder-pink-300"
                    />

                    {/* Existing Series Chips */}
                    <div className="mb-6">
                        <p className="text-xs text-gray-400 mb-2 font-medium">
                            <Trans th="หรือเลือกจากที่มีอยู่:" en="Or select existing:" />
                        </p>
                        <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto pr-1">
                            {Array.from(new Set(textures.map(t => t.series).filter(s => s && s.trim() !== ''))).map(series => (
                                <button
                                    key={series}
                                    onClick={() => setSeriesPromptValue(series)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${seriesPromptValue === series ? 'bg-pink-100 text-pink-600 border-pink-200' : 'bg-gray-50 hover:bg-pink-50 hover:text-pink-500 text-gray-600 border-gray-100 hover:border-pink-200'}`}
                                >
                                    {series}
                                </button>
                            ))}
                            {Array.from(new Set(textures.map(t => t.series).filter(s => s && s.trim() !== ''))).length === 0 && (
                                <span className="text-xs text-gray-400 italic">
                                    <Trans th="ยังไม่มีหมวดหมู่" en="No existing series" />
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setSeriesPrompt(prev => ({ ...prev, isOpen: false }))}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all hover:scale-[1.02]"
                        >
                            <Trans th="ยกเลิก" en="Cancel" />
                        </button>
                        <button
                            onClick={confirmSeriesPrompt}
                            disabled={!seriesPromptValue.trim()}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-400 to-purple-500 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-pink-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Trans th="ตกลง" en="OK" />
                        </button>
                    </div>
                </div>
            </div>
        )}
        </div>
    );
}
