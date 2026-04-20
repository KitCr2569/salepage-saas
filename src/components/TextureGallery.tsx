"use client";

import { useProductStore } from "@/store/useProductStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { getThemeById } from "@/lib/themes";
import { useState } from "react";
import { ChevronDown, ChevronRight, Image as ImageIcon } from "lucide-react";
import { Trans } from "./Trans";

export default function TextureGallery() {
    const { textures } = useProductStore();
    const salePageTheme = useSettingsStore((s) => s.salePageTheme);
    const theme = getThemeById(salePageTheme);
    const [collapsedSeries, setCollapsedSeries] = useState<Set<string>>(new Set());

    const toggleCollapse = (series: string) => {
        setCollapsedSeries(prev => {
            const next = new Set(prev);
            if (next.has(series)) next.delete(series);
            else next.add(series);
            return next;
        });
    };

    const activeTextures = textures.filter(t => t.isActive !== false);

    const groupedTextures = activeTextures.reduce((acc, t) => {
        if (!acc[t.series]) acc[t.series] = [];
        acc[t.series].push(t);
        return acc;
    }, {} as Record<string, typeof textures>);

    if (activeTextures.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-surface-400">
                <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium"><Trans th="ไม่พบข้อมูลลายสินค้า" en="No textures found" /></p>
            </div>
        );
    }

    return (
        <div className="px-4 max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
            {Object.entries(groupedTextures).map(([series, items]) => {
                const isCollapsed = collapsedSeries.has(series);
                return (
                    <div key={series} className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: theme.vars['--sp-card-bg'] }}>
                        {/* Header */}
                        <div 
                            className="px-4 py-3 flex justify-between items-center cursor-pointer transition-colors"
                            style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
                            onClick={() => toggleCollapse(series)}
                        >
                            <div className="flex items-center gap-2">
                                {isCollapsed ? <ChevronRight className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                <h3 className="font-bold text-lg">{series}</h3>
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>{items.length}</span>
                            </div>
                        </div>
                        
                        {/* Grid */}
                        {!isCollapsed && (
                            <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                {items.map((t) => (
                                    <div 
                                        key={t.id} 
                                        className="group rounded-xl overflow-hidden border border-transparent hover:border-primary-500 transition-all bg-surface-900 shadow-sm"
                                    >
                                        <div className="aspect-[4/3] relative bg-surface-800">
                                            {t.image ? (
                                                <img src={t.image} alt={t.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-surface-400">
                                                    <ImageIcon className="w-8 h-8 mb-1 opacity-50" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-2 flex flex-col justify-end min-h-[50px] relative" style={{ backgroundColor: theme.vars['--sp-card-bg'] }}>
                                            {t.code && <div className="font-black text-sm text-right tracking-wider text-primary-400">{t.code}</div>}
                                            <div className="text-[10px] text-right truncate opacity-80">{t.name}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
