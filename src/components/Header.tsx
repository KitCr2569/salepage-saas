"use client";

import { useState, useEffect, useRef } from "react";
import { useCartStore } from "@/store/useCartStore";
import { useCustomerStore } from "@/store/useCustomerStore";
import { Search, ShoppingCart, LogOut, User, ChevronDown } from "lucide-react";
import { useShopStore } from "@/store/useShopStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { getThemeById } from "@/lib/themes";
import { Trans } from "@/components/Trans";

const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "";

export default function Header() {
    const {
        language,
        setLanguage,
        setSearchOpen,
        setCartOpen,
        getTotalItems,
    } = useCartStore();

    const { isLoggedIn, customer, logout } = useCustomerStore();
    const { connectedPage } = useAuthStore();
    const { shopConfig } = useShopStore();
    const salePageTheme = useSettingsStore((s) => s.salePageTheme);
    const theme = getThemeById(salePageTheme);
    const displayName = connectedPage?.name || shopConfig.shopName;

    const [mounted, setMounted] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const totalItems = mounted ? getTotalItems() : 0;

    const handleFacebookLogin = () => {
        // Use OAuth redirect flow (works on both HTTP and HTTPS)
        const redirectUri = `${window.location.origin}/customer/callback`;
        const scope = "public_profile,pages_messaging,pages_manage_metadata,pages_read_engagement";
        const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=token`;
        window.location.href = fbAuthUrl;
    };

    const handleLogout = () => {
        logout();
        setShowUserMenu(false);
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-30 backdrop-blur-xl border-b" style={{ backgroundColor: theme.vars['--sp-header-bg'], borderColor: 'rgba(255,255,255,0.1)', boxShadow: 'none' }}>
            {/* Main Header Row - 64px */}
            <div className="flex items-center justify-between px-4 h-16 max-w-7xl mx-auto">
                {/* Logo + Shop Name */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                        src={shopConfig.shopLogo}
                        alt="Shop Logo"
                        className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                    />
                    <h1 className="text-sm font-normal truncate" style={{ color: theme.vars['--sp-header-text'] }}>
                        {displayName}
                    </h1>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-0.5">
                    {/* Customer Profile (show only when logged in) */}
                    {mounted && isLoggedIn && customer && (
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-surface-800 rounded-full transition-colors"
                            >
                                {customer.picture ? (
                                    <img
                                        src={customer.picture}
                                        alt={customer.name}
                                        className="w-7 h-7 rounded-full object-cover border-2 border-primary-400"
                                    />
                                ) : (
                                    <div className="w-7 h-7 rounded-full bg-primary-800 flex items-center justify-center">
                                        <User className="w-4 h-4 text-primary-300" />
                                    </div>
                                )}
                                <span className="text-xs font-medium text-surface-200 hidden sm:block max-w-[80px] truncate">
                                    {customer.name.split(" ")[0]}
                                </span>
                                <ChevronDown className="w-3 h-3 text-surface-400 hidden sm:block" />
                            </button>

                            {/* Dropdown Menu */}
                            {showUserMenu && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-surface-800 rounded-2xl shadow-xl border border-surface-700 overflow-hidden z-50">
                                    <div className="px-4 py-3 border-b border-surface-700 bg-surface-900">
                                        <div className="flex items-center gap-3">
                                            {customer.picture ? (
                                                <img src={customer.picture} alt="" className="w-10 h-10 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-primary-800 flex items-center justify-center">
                                                    <User className="w-5 h-5 text-primary-300" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-surface-100 truncate">{customer.name}</p>
                                                <p className="text-xs text-surface-400 truncate">
                                                    {customer.email || "Facebook User"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-900/30 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <Trans th="ออกจากระบบ" en="Log out" />
                                                                            </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Language Switcher */}
                    <button
                        onClick={() => {
                            const newLang = language === "th" ? "en" : "th";
                            setLanguage(newLang);
                            if (typeof window !== "undefined") {
                                window.localStorage.setItem("hdg-locale", newLang);
                            }
                            import("@/store/useLocaleStore").then(m => m.useLocaleStore.getState().setLocale(newLang));
                        }}
                        className="flex items-center gap-1 px-2 py-2 hover:bg-surface-800 rounded-lg transition-colors text-sm text-surface-300"
                        aria-label="Switch language"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.6 9h16.8M3.6 15h16.8" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9 15.3 15.3 0 01-4-9 15.3 15.3 0 014-9z" />
                        </svg>
                        <span className="uppercase text-xs font-medium" suppressHydrationWarning>{language}</span>
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Search */}
                    <button
                        onClick={() => setSearchOpen(true)}
                        className="p-2 hover:bg-surface-800 transition-colors text-surface-300"
                        aria-label="Search products"
                    >
                        <Search className="w-5 h-5" />
                    </button>

                    {/* Cart */}
                    <button
                        onClick={() => setCartOpen(true)}
                        className="p-2 hover:bg-surface-800 transition-colors text-surface-300 relative"
                        aria-label="Open cart"
                    >
                        <ShoppingCart className="w-5 h-5" />
                        {totalItems > 0 && (
                            <span className="badge">{totalItems}</span>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
}
