"use client";

import { useEffect } from "react";

/**
 * Registers the admin service worker only on admin pages.
 * This component is rendered exclusively in the admin layout,
 * so it will NOT affect the main sale page or checkout.
 */
export default function AdminPWARegister() {
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/admin-sw.js", { scope: "/admin" })
                .then((reg) => {
                    console.log("[Admin PWA] Service Worker registered:", reg.scope);

                    // Auto-update: check for new SW every 60 minutes
                    setInterval(() => reg.update(), 60 * 60 * 1000);
                })
                .catch((err) => {
                    console.warn("[Admin PWA] SW registration failed:", err);
                });
        }
    }, []);

    return null; // No UI - just registers the service worker
}
