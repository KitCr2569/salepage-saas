"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { useTenantAuthStore } from "@/store/useTenantAuthStore";
import { useShopStore } from "@/store/useShopStore";
import { Facebook, Store, ChevronRight, LogOut, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocaleStore } from "@/store/useLocaleStore";

declare global {
    interface Window {
        FB: any;
        fbAsyncInit: () => void;
    }
}

const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "";
// Removed hardcoded REDIRECT_URI to use dynamic one
const FB_SCOPE = "pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement,marketing_messages_messenger,ads_management";

// ── Use <a> tag for maximum compatibility on Chrome Mobile / PWA standalone
function FacebookLoginButton({ appId }: { appId: string }) {
    const { t } = useLocaleStore();
    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/admin/auth/callback` : `${process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'}/admin/auth/callback`;
    const href = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${FB_SCOPE}&response_type=token`;
    return (
        <a
            href={href}
            className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166FE5] text-white px-6 py-3.5 rounded-xl font-medium text-sm shadow-lg shadow-blue-200 transition-all hover:shadow-xl mb-4"
            style={{ textDecoration: "none" }}
        >
            <Facebook className="w-5 h-5" />
            {t('login.loginWithFb')}
        </a>
    );
}

export default function AdminLogin({ children }: { children: React.ReactNode }) {
    // ── Tenant session (ใช้แค่แสดง context บน login screen) ──────────────
    const { activeShop: tenantShop, token: tenantToken, loadFromStorage } = useTenantAuthStore();
    const [tenantLoaded, setTenantLoaded] = useState(false);
    const router = useRouter();

    // ── Facebook auth ─────────────────────────────────────────────────────
    const {
        isLoggedIn,
        userName,
        userPicture,
        accessToken,
        login,
        logout,
        connectedPage,
        availablePages,
        setAvailablePages,
        connectPage,
    } = useAuthStore();

    const [isLoading, setIsLoading] = useState(false);
    const [fbReady, setFbReady] = useState(false);

    // โหลด tenant session
    useEffect(() => {
        loadFromStorage().then(() => setTenantLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // โหลด Facebook SDK
    useEffect(() => {
        if (typeof window === "undefined") return;
        if ((window as any).FB) { setFbReady(true); return; }
        window.fbAsyncInit = function () {
            window.FB.init({ appId: FACEBOOK_APP_ID, cookie: true, xfbml: false, version: "v19.0" });
            setFbReady(true);
        };
        if (!document.getElementById("facebook-jssdk")) {
            const script = document.createElement("script");
            script.id = "facebook-jssdk";
            script.src = "https://connect.facebook.net/th_TH/sdk.js";
            script.async = true;
            script.defer = true;
            document.body.appendChild(script);
        }
    }, []);

    // (Backend handles /me and /me/accounts now via /api/auth/facebook/login)

    // หลังจากเลือกเพจแล้ว → sync ข้อมูลสินค้าจาก tenant activeShop
    useEffect(() => {
        if (connectedPage && tenantShop) {
            fetch(`/api/shop/by-slug/${tenantShop.slug}`)
                .then(r => r.json())
                .then(json => {
                    if (json.success && json.data?.products) {
                        const { products, categories } = json.data;
                        useShopStore.setState({
                            shopId: tenantShop.id,
                            shopConfig: {
                                shopName: tenantShop.name,
                                shopLogo: connectedPage.picture || tenantShop.logo || "",
                                currency: "THB",
                                currencySymbol: "฿",
                            },
                            products: products.map((p: any) => ({
                                id: p.id, name: p.name,
                                description: p.description || "",
                                price: Number(p.price),
                                images: p.images as string[],
                                categoryId: p.categoryId || "all",
                                variants: p.variants || [],
                                badge: p.badge || undefined,
                            })),
                            categories: [
                                { id: "all", name: "ทั้งหมด", nameEn: "All" },
                                ...(categories || []).map((c: any) => ({ id: c.id, name: c.name, nameEn: c.nameEn })),
                            ],
                        });
                    }
                })
                .catch(() => {});
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectedPage?.id, tenantShop?.id]);

    // ── ถ้า login + เลือกเพจแล้ว → แสดง admin ────────────────────────────
    if (isLoggedIn && connectedPage) {
        return <>{children}</>;
    }

    // ── fn เลือกเพจ + auto-sync Token to DB ────────────────────────────────
    const handleSelectPage = async (page: typeof availablePages[0]) => {
        connectPage(page);

        // 🔑 Auto-sync: อัปเดต Page Access Token ในฐานข้อมูล (channels table) อัตโนมัติ
        // ไม่ต้องไปวาง Token จาก Graph API Explorer อีกต่อไป!
        try {
            const chatToken = localStorage.getItem("chat-auth-token");
            if (chatToken && page.accessToken) {
                const res = await fetch("/api/chat/channels", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${chatToken}`,
                    },
                    body: JSON.stringify({
                        type: "MESSENGER",
                        name: `MESSENGER Channel (Auto)`,
                        config: {
                            pageId: page.id,
                            pageName: page.name,
                            pageAccessToken: page.accessToken,
                            connectedAt: new Date().toISOString(),
                            tokenUpdatedAt: new Date().toISOString(),
                            autoSynced: true,
                        },
                    }),
                });
                const result = await res.json();
                if (result.success) {
                    console.log("✅ Page Access Token synced to DB automatically!");
                } else {
                    console.warn("⚠️ Token sync failed:", result.error);
                }
            }
        } catch (err) {
            console.warn("⚠️ Auto token sync error:", err);
        }

        // เข้า admin โดยตรงหลังเลือกเพจ
        router.push("/admin");
    };

    // ── Loading ───────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">{useLocaleStore.getState().t('login.loading')}</p>
                </div>
            </div>
        );
    }

    // ── Facebook Login Screen ─────────────────────────────────────────────
    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 flex items-center justify-center px-4">
                <div className="w-full max-w-md">
                    {/* Context: ถ้า tenant session อยู่ → แสดงชื่อร้าน */}
                    {tenantLoaded && tenantShop && (
                        <div className="mb-6 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl p-4 text-center shadow-lg">
                            <p className="text-white/70 text-xs mb-1">{useLocaleStore.getState().t('login.settingUp')}</p>
                            <p className="font-bold text-lg">{tenantShop.name}</p>
                            <p className="text-white/60 text-xs">/{tenantShop.slug}</p>
                        </div>
                    )}

                    <div className="text-center mb-8">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-400 to-pink-500 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-pink-200">
                            <Shield className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800">{useLocaleStore.getState().t('login.connectFb')}</h1>
                        <p className="text-gray-500 text-sm mt-1">{useLocaleStore.getState().t('login.selectPage')}</p>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100">
                        {/* Use <a> tag for reliable mobile Chrome navigation */}
                        <FacebookLoginButton appId={FACEBOOK_APP_ID} />
                    </div>

                    <p className="text-center text-xs text-gray-400 mt-6">{useLocaleStore.getState().t('login.poweredBy')}</p>
                </div>
            </div>
        );
    }

    // ── เลือกเพจ ─────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Tenant context */}
                {tenantLoaded && tenantShop && (
                    <div className="mb-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl p-3 text-center shadow-lg">
                        <p className="text-white/70 text-xs">{useLocaleStore.getState().t('login.yourShop')}</p>
                        <p className="font-bold">{tenantShop.name}</p>
                    </div>
                )}

                <div className="text-center mb-6">
                    {userPicture ? (
                        <img src={userPicture} alt={userName || ""} className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-white shadow-lg object-cover" />
                    ) : (
                        <div className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-white shadow-lg bg-pink-100 flex items-center justify-center">
                            <Shield className="w-8 h-8 text-pink-500" />
                        </div>
                    )}
                    <h2 className="text-lg font-bold text-gray-800">{useLocaleStore.getState().t('login.hello')}, {userName}!</h2>
                    <p className="text-sm text-gray-500">{useLocaleStore.getState().t('login.selectPageManage')}</p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Store className="w-4 h-4 text-pink-500" />
                        {useLocaleStore.getState().t('login.yourPages')}
                    </h3>

                    {availablePages.length === 0 ? (
                        <div className="text-center py-8">
                            <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500">{useLocaleStore.getState().t('login.noPagesFound')}</p>
                            <p className="text-xs text-gray-400 mt-1">{useLocaleStore.getState().t('login.checkAdmin')}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {availablePages.map((page) => (
                                <button
                                    key={page.id}
                                    onClick={() => handleSelectPage(page)}
                                    className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-100 hover:border-pink-300 hover:bg-pink-50 transition-all group"
                                >
                                    {page.picture ? (
                                        <img src={page.picture} alt={page.name} className="w-12 h-12 rounded-xl shadow-sm object-cover flex-shrink-0" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 flex-shrink-0">
                                            <Store className="w-6 h-6 text-blue-400" />
                                        </div>
                                    )}
                                    <div className="flex-1 text-left min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{page.name}</p>
                                        <p className="text-xs text-gray-400">ID: {page.id}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-pink-500 transition-colors flex-shrink-0" />
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <button
                            onClick={() => { try { (window as any).FB?.logout(); } catch {} logout(); }}
                            className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-red-500 py-2 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            {useLocaleStore.getState().t('admin.logout')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
