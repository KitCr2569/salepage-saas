"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { getThemeById } from "@/lib/themes";

/**
 * This component injects CSS variables from the selected theme
 * into the document root so all sale page components can read them.
 */
export default function SalePageThemeProvider({ children }: { children: React.ReactNode }) {
    const salePageTheme = useSettingsStore((s) => s.salePageTheme);
    const bannerImage = useSettingsStore((s) => s.bannerImage);

    useEffect(() => {
        const theme = getThemeById(salePageTheme);
        const root = document.documentElement;

        // Apply all CSS variables
        Object.entries(theme.vars).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        // Also set banner variable
        root.style.setProperty('--sp-banner', bannerImage ? `url(${bannerImage})` : 'none');

        return () => {
            // Cleanup
            Object.keys(theme.vars).forEach((key) => {
                root.style.removeProperty(key);
            });
            root.style.removeProperty('--sp-banner');
        };
    }, [salePageTheme, bannerImage]);

    return <>{children}</>;
}
