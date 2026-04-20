"use client";

import { useCartStore } from "@/store/useCartStore";
import { useProductStore } from "@/store/useProductStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { getThemeById } from "@/lib/themes";
import { useRef, useEffect, useState } from "react";

export default function CategoryTabs() {
    const { activeCategory, setActiveCategory, language } = useCartStore();
    const categories = useProductStore((s) => s.categories);
    const salePageTheme = useSettingsStore((s) => s.salePageTheme);
    const theme = getThemeById(salePageTheme);
    const scrollRef = useRef<HTMLDivElement>(null);
    const activeRef = useRef<HTMLButtonElement>(null);
    const hasActiveTextures = useProductStore((s) => s.textures).filter(t => t.isActive !== false).length > 0;

    // Drag to scroll state
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);
    const hasDragged = useRef(false);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        hasDragged.current = false;
        startX.current = e.pageX - scrollRef.current.offsetLeft;
        scrollLeft.current = scrollRef.current.scrollLeft;
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX.current) * 2;
        if (Math.abs(walk) > 10) {
            hasDragged.current = true;
        }
        scrollRef.current.scrollLeft = scrollLeft.current - walk;
    };

    const handleTabClick = (id: string, e: React.MouseEvent) => {
        if (hasDragged.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        setActiveCategory(id);
    };

    // Auto-scroll to active tab
    useEffect(() => {
        if (activeRef.current && scrollRef.current) {
            const container = scrollRef.current;
            const tab = activeRef.current;
            const scrollLeft = tab.offsetLeft - container.offsetWidth / 2 + tab.offsetWidth / 2;
            container.scrollTo({ left: scrollLeft, behavior: "smooth" });
        }
    }, [activeCategory]);

    return (
        <div className="fixed top-16 left-0 right-0 z-20 backdrop-blur-xl border-b" style={{ backgroundColor: theme.vars['--sp-header-bg'], borderColor: 'rgba(255,255,255,0.1)' }}>
            <div
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className={`flex items-center overflow-x-auto scrollbar-hide max-w-7xl mx-auto ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            >
                {categories.map((cat) => {
                    const isActive = cat.id === activeCategory;
                    return (
                        <button
                            key={cat.id}
                            ref={isActive ? activeRef : null}
                            onClick={(e) => handleTabClick(cat.id, e)}
                            className="flex-shrink-0 px-3 py-3 text-sm font-normal transition-all duration-150 whitespace-nowrap border select-none"
                            style={isActive ? {
                                color: theme.vars['--sp-tab-active-text'],
                                borderColor: theme.vars['--sp-tab-active-border'],
                                backgroundColor: theme.vars['--sp-tab-active-bg'],
                            } : {
                                color: theme.vars['--sp-text-secondary'],
                                borderColor: 'transparent',
                            }}
                        >
                            {language === "th" ? cat.name : cat.nameEn}
                        </button>
                    );
                })}
            </div>

            {/* Row 2: Texture Tab */}
            {hasActiveTextures && (
                <div 
                    className="flex items-center overflow-x-auto scrollbar-hide max-w-7xl mx-auto border-t justify-end" 
                    style={{ borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.1)' }}
                >
                    <div className="flex gap-2 p-1 px-4">
                        <button
                            onClick={() => setActiveCategory('texture')}
                            className="px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-150"
                            style={activeCategory === 'texture' ? {
                                color: theme.vars['--sp-tab-active-text'],
                                backgroundColor: theme.vars['--sp-tab-active-bg'],
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                            } : {
                                color: theme.vars['--sp-text-secondary'],
                                backgroundColor: 'rgba(255,255,255,0.05)',
                            }}
                        >
                            {language === "th" ? "🖼️ ดูลายสินค้า (Texture)" : "🖼️ View Textures"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
