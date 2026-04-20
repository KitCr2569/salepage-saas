"use client";

import { Truck, Store } from "lucide-react";

// Real logo images stored in /public/logos/
const LOGO_MAP: Record<string, { src: string; name: string; color: string; bg: string }> = {
    flash: { src: "/logos/flash.png", name: "Flash Express", color: "#FFD100", bg: "#FFF8E0" },
    kerry: { src: "/logos/kerry.png", name: "Kerry Express", color: "#FF6600", bg: "#FFF3E8" },
    jt: { src: "/logos/jt.png", name: "J&T Express", color: "#D10000", bg: "#FFE8E8" },
    thaipost: { src: "/logos/thaipost.png", name: "ไปรษณีย์ไทย", color: "#D4001A", bg: "#FFE8EB" },
    ems: { src: "/logos/ems.png", name: "EMS", color: "#0055A4", bg: "#E8F0FF" },
    shopee: { src: "/logos/shopee.png", name: "Shopee Express", color: "#EE4D2D", bg: "#FFF0EC" },
    lazada: { src: "/logos/lazada.png", name: "Lazada Express", color: "#0F146D", bg: "#E8E9F5" },
    ninja: { src: "/logos/ninjavan.png", name: "NinjaVan", color: "#CD1F30", bg: "#FFE8EA" },
    ninjavan: { src: "/logos/ninjavan.png", name: "NinjaVan", color: "#CD1F30", bg: "#FFE8EA" },
    best: { src: "/logos/best.png", name: "Best Express", color: "#FF6600", bg: "#FFF3E8" },
    dhl: { src: "/logos/dhl.png", name: "DHL Express", color: "#FFCC00", bg: "#FFF8E0" },
    scg: { src: "/logos/scg.png", name: "SCG Express", color: "#004B93", bg: "#E8F0FF" },
    grab: { src: "/logos/grab.png", name: "GrabExpress", color: "#00B14F", bg: "#E8FFE8" },
};

// Get logo by matching shipping name
export function getShippingLogo(name: string): typeof LOGO_MAP[string] | null {
    const lower = name.toLowerCase();
    // Exact key match first
    if (LOGO_MAP[lower]) return LOGO_MAP[lower];
    // Partial match
    for (const [key, val] of Object.entries(LOGO_MAP)) {
        if (lower.includes(key)) return val;
    }
    // Thai name mappings
    if (lower.includes("ไปรษณีย์")) return LOGO_MAP.thaipost;
    if (lower.includes("แฟลช")) return LOGO_MAP.flash;
    if (lower.includes("เคอร์รี่") || lower.includes("เคอรี่")) return LOGO_MAP.kerry;
    if (lower.includes("j&t")) return LOGO_MAP.jt;
    return null;
}

// Shipping logo component with real PNG images
export function ShippingLogoIcon({ name, size = 40 }: { name: string; size?: number }) {
    const logo = getShippingLogo(name);
    if (logo) {
        return (
            <div
                style={{ width: size, height: size }}
                className="rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
            >
                <img
                    src={logo.src}
                    alt={logo.name}
                    className="w-full h-full object-cover"
                    style={{ width: size, height: size }}
                />
            </div>
        );
    }
    const isPickup = name.includes("รับ") || name.includes("หน้าร้าน") || name.toLowerCase().includes("pickup");
    
    return (
        <div
            style={{ width: size, height: size }}
            className={`rounded-lg flex items-center justify-center flex-shrink-0 ${isPickup ? "bg-amber-50" : "bg-blue-50"}`}
        >
            {isPickup ? (
                <Store className="text-amber-500" style={{ width: size * 0.5, height: size * 0.5 }} />
            ) : (
                <Truck className="text-blue-500" style={{ width: size * 0.5, height: size * 0.5 }} />
            )}
        </div>
    );
}
