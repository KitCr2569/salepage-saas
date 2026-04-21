"use client";

import { useState, useEffect, useCallback } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminProducts from "@/components/admin/AdminProducts";
import AdminPayment from "@/components/admin/AdminPayment";
import AdminShipping from "@/components/admin/AdminShipping";
import AdminSalePage from "@/components/admin/AdminSalePage";
import AdminCartSummary from "@/components/admin/AdminCartSummary";
import AdminOrders from "@/components/admin/AdminOrders";
import AdminProfile from "@/components/admin/AdminProfile";
import AdminUnifiedChat from "@/components/admin/AdminUnifiedChat";
import AdminBroadcast from "@/components/admin/AdminBroadcast";
import AdminFacebookTools from "@/components/admin/AdminFacebookTools";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminOrderNotification from "@/components/admin/AdminOrderNotification";
import AdminHome from "@/components/admin/AdminHome";
import AdminChatbot from "@/components/admin/AdminChatbot";
import AdminTikTok from "@/components/admin/AdminTikTok";
import AdminSalesTools from "@/components/admin/AdminSalesTools";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminMasterData from "@/components/admin/AdminMasterData";
import AdminUpgrade from "@/components/admin/AdminUpgrade";
import ShopSelector from "@/components/admin/ShopSelector";
import AdminStaff from "@/components/admin/AdminStaff";
import TenantOverview from "@/components/admin/TenantOverview";
import { CustomerAnalysis, RetargetCustomers, ScheduledPosting, EmailMarketing, CrossSell } from "@/components/admin/SalesToolPages";
import { shopConfig } from "@/data";
import { useAuthStore } from "@/store/useAuthStore";
import { useShopStore } from "@/store/useShopStore";
import { useLocaleStore } from "@/store/useLocaleStore";

export type AdminTab =
    | "dashboard"
    | "home"
    | "ShopProfilePage"
    | "Products"
    | "mainPayment"
    | "ShippingMethod"
    | "SalePage"
    | "CartSummary"
    | "ecommerce-order-summary"
    | "UnifiedChat"
    | "Broadcast"
    | "FacebookTools"
    | "Chatbot"
    | "TikTok"
    | "SalesTools"
    | "Analytics"
    | "MasterData"
    | "Upgrade"
    | "CustomerAnalysis"
    | "RetargetCustomers"
    | "ScheduledPosting"
    | "EmailMarketing"
    | "CrossSell"
    | "Staff"
    | "TenantOverview";

// Top tabs use i18n keys — resolved at render time
const topTabDefs: { id: AdminTab; labelKey: string }[] = [
    { id: "ShopProfilePage", labelKey: "tab.profile" },
    { id: "Products", labelKey: "tab.products" },
    { id: "mainPayment", labelKey: "tab.payment" },
    { id: "ShippingMethod", labelKey: "tab.shipping" },
    { id: "SalePage", labelKey: "tab.salepage" },
    { id: "CartSummary", labelKey: "tab.cartSummary" },
    { id: "ecommerce-order-summary", labelKey: "tab.orders" },
    { id: "Broadcast", labelKey: "tab.broadcast" },
    { id: "FacebookTools", labelKey: "tab.fbtools" },
    { id: "UnifiedChat", labelKey: "tab.unifiedChat" },
];

const allTabIds = [...topTabDefs.map(t => t.id), 'home', 'Chatbot', 'TikTok', 'SalesTools', 'Analytics', 'MasterData', 'Upgrade', 'CustomerAnalysis', 'RetargetCustomers', 'ScheduledPosting', 'EmailMarketing', 'CrossSell', 'Staff', 'TenantOverview'];
const validTabs = new Set(allTabIds);

// ─── User Menu (Logout) ─────────────────────────────────────
function UserMenu() {
    const { userName, userPicture, connectedPage, logout } = useAuthStore();
    const [showMenu, setShowMenu] = useState(false);

    const handleLogout = () => {
        // Clean up Facebook SDK
        try {
            const FB = (window as any).FB;
            if (FB) FB.logout();
        } catch { /* ignore */ }
        logout();
        setShowMenu(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
            >
                {userPicture ? (
                    <img src={userPicture} alt="" className="w-7 h-7 rounded-full object-cover border border-gray-200" />
                ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{(userName || "A").charAt(0)}</span>
                    </div>
                )}
                <span className="text-sm text-gray-700 font-medium hidden lg:inline max-w-[120px] truncate">
                    {userName || "Admin"}
                </span>
                <span className="text-gray-400 text-xs">▼</span>
            </button>

            {showMenu && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl ring-1 ring-gray-200 z-50 overflow-hidden">
                        {/* User Info */}
                        <div className="px-4 py-3 bg-gradient-to-r from-pink-50 to-purple-50 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                {userPicture ? (
                                    <img src={userPicture} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center border-2 border-white shadow-sm">
                                        <span className="text-white text-sm font-bold">{(userName || "A").charAt(0)}</span>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate">{userName || "Admin"}</p>
                                    {connectedPage && (
                                        <p className="text-xs text-gray-500 truncate">📘 {connectedPage.name}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Actions */}
                        <div className="p-2">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <span>🚪</span>
                                <span className="font-medium">{useLocaleStore.getState().t('admin.logout')}</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<AdminTab>("home");
    const [totalUnread, setTotalUnread] = useState(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [focusOrderId, setFocusOrderId] = useState<string | null>(null);
    const { locale, setLocale, t } = useLocaleStore();
    // ⚡ Preloaded chat data — เพื่อส่งให้ AdminUnifiedChat ไม่ต้อง fetch ซ้ำ
    const [preloadedInbox, setPreloadedInbox] = useState<unknown[] | null>(null);
    const [chatToken, setChatToken] = useState<string | null>(null);

    // Poll unread + preload inbox data in background
    const fetchUnreadCount = useCallback(async () => {
        try {
            // Ensure chat auth token exists
            let token = chatToken || localStorage.getItem('chat-auth-token');
            const tokenExpiry = localStorage.getItem('chat-token-expiry');
            const isTokenValid = token && tokenExpiry && Date.now() < parseInt(tokenExpiry);

            if (!isTokenValid) {
                // Auto-login once to get token
                const loginRes = await fetch('/api/chat/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: 'admin@hdg.com', password: 'admin123' }),
                });
                const loginData = await loginRes.json();
                if (loginData.success && loginData.data?.token) {
                    token = loginData.data.token;
                    localStorage.setItem('chat-auth-token', token!);
                    localStorage.setItem('chat-agent', JSON.stringify(loginData.data.agent));
                    localStorage.setItem('chat-token-expiry', String(Date.now() + 7 * 24 * 60 * 60 * 1000));
                    setChatToken(token);
                }
            } else if (!chatToken) {
                setChatToken(token);
            }

            if (!token) return;

            const res = await fetch('/api/chat/inbox?limit=50', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                const total = json.data.reduce((sum: number, item: { unreadCount: number }) => sum + (item.unreadCount || 0), 0);
                setTotalUnread(total);
                setPreloadedInbox(json.data); // ← เก็บไว้ให้ UnifiedChat
            }
        } catch { /* silent */ }
    }, [chatToken]);

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 5_000); // ⚡ poll every 5s
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    // Reset unread badge เมื่ออยู่บน UnifiedChat tab (อ่านแล้ว)
    useEffect(() => {
        if (activeTab === 'UnifiedChat') {
            // Delay เล็กน้อยก่อน reset — รอให้ load ก่อน
            const t = setTimeout(() => setTotalUnread(0), 2000);
            return () => clearTimeout(t);
        }
    }, [activeTab]);

    // Sync shop data on admin mount
    const syncWithPage = useShopStore((s) => s.syncWithPage);
    useEffect(() => {
        syncWithPage();
    }, [syncWithPage]);

    // Read hash on mount and on hash changes
    useEffect(() => {
        const readHash = () => {
            const hash = window.location.hash.replace("#", "");
            if (hash && validTabs.has(hash as AdminTab)) {
                setActiveTab(hash as AdminTab);
            }
        };
        readHash();
        window.addEventListener("hashchange", readHash);
        return () => window.removeEventListener("hashchange", readHash);
    }, []);

    // Update URL hash when tab changes
    const handleTabChange = (tab: AdminTab) => {
        setActiveTab(tab);
        window.location.hash = tab;
        setIsMobileMenuOpen(false); // Close menu on mobile after selection
    };

    const renderContent = () => {
        switch (activeTab) {
            case "home":
                return <AdminHome onNavigate={handleTabChange} />;
            case "TenantOverview":
                return <TenantOverview onNavigate={handleTabChange} />;
            case "ShopProfilePage":
                return <AdminProfile />;
            case "Products":
                // Already always-mounted below, return nothing here
                return null;
            case "mainPayment":
                return <AdminPayment />;
            case "ShippingMethod":
                return <AdminShipping />;
            case "SalePage":
                return <AdminSalePage />;
            case "CartSummary":
                // Already always-mounted below, return nothing here
                return null;
            case "ecommerce-order-summary":
                // Already always-mounted below, return nothing here
                return null;
            case "UnifiedChat":
                // Already always-mounted below, return nothing here
                return null;
            case "Broadcast":
                // Already always-mounted below, return nothing here
                return null;
            case "FacebookTools":
                return <AdminFacebookTools onBack={() => handleTabChange('SalesTools')} />;
            case "Chatbot":
                return <AdminChatbot />;
            case "TikTok":
                return <AdminTikTok />;
            case "SalesTools":
                return <AdminSalesTools onNavigate={handleTabChange} />;
            case "Analytics":
                return <AdminAnalytics onBack={() => handleTabChange('home')} />;
            case "MasterData":
                return <AdminMasterData onNavigate={handleTabChange} onBack={() => handleTabChange('home')} />;
            case "Staff":
                return <AdminStaff onBack={() => handleTabChange('MasterData')} />;
            case "Upgrade":
                return <AdminUpgrade />;
            case "CustomerAnalysis":
                return <CustomerAnalysis onBack={() => handleTabChange('SalesTools')} />;
            case "RetargetCustomers":
                return <RetargetCustomers onBack={() => handleTabChange('SalesTools')} />;
            case "ScheduledPosting":
                return <ScheduledPosting onBack={() => handleTabChange('SalesTools')} />;
            case "EmailMarketing":
                return <EmailMarketing onBack={() => handleTabChange('SalesTools')} />;
            case "CrossSell":
                return <CrossSell onBack={() => handleTabChange('SalesTools')} />;
            default:
                return <AdminHome onNavigate={handleTabChange} />;
        }
    };
    return (
        <AdminLogin>
            <AdminOrderNotification onViewOrders={(orderId) => { setFocusOrderId(orderId); handleTabChange("ecommerce-order-summary"); }} />
            <div className="flex relative overflow-hidden h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
                {/* Mobile Sidebar Overlay */}
                {isMobileMenuOpen && (
                    <div 
                        className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}
                
                {/* Sidebar - matching cms.zwiz.ai orange-pink gradient */}
                <aside className={`w-64 bg-gradient-to-b from-orange-400 via-pink-400 to-pink-500 h-full flex-shrink-0 flex flex-col absolute md:relative z-50 transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    {/* Social icons */}
                    <div className="flex gap-1 px-4 pt-4">
                        {["📘", "✉️", "📷", "💬", "🎵"].map((icon, i) => (
                            <span key={i} className="text-xs opacity-80">{icon}</span>
                        ))}
                    </div>

                    {/* Profile section */}
                    <div className="flex flex-col items-center py-6">
                        <div className="w-20 h-20 rounded-full border-4 border-white/30 overflow-hidden mb-3">
                            <img
                                src={shopConfig.shopLogo}
                                alt="Shop Logo"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="bg-green-500 text-white text-[10px] px-3 py-0.5 rounded-full mb-2 flex items-center gap-1">
                            <span>▶</span> {t('admin.running')}
                        </div>
                        <div className="bg-white/20 text-white text-[10px] px-3 py-1 rounded-lg text-center max-w-[180px] truncate">
                            HDG WRAP STICKER FI...
                        </div>
                    </div>


                    {/* Navigation Menu */}
                    <nav className="flex-1 px-2 space-y-0.5">
                        {[
                            { icon: "🏠", label: t('sidebar.home'), id: "home" as AdminTab },
                            { icon: "🏢", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Overview" : "ภาพรวมธุรกิจ"), id: "TenantOverview" as AdminTab },
                            { icon: "💬", label: t('sidebar.chatbot'), id: "Chatbot" as AdminTab, badge: "Ai Agents" },
                            { icon: "🎵", label: t('sidebar.tiktok'), id: "TikTok" as AdminTab },
                            { icon: "📢", label: t('sidebar.broadcast'), id: "Broadcast" as AdminTab },
                            { icon: "🛒", label: t('sidebar.shop'), id: "ShopProfilePage" as AdminTab },
                            { icon: "🔗", label: t('sidebar.unifiedChat'), id: "UnifiedChat" as AdminTab, badge: "New", unread: totalUnread },
                            { icon: "📊", label: t('sidebar.salesTools'), id: "SalesTools" as AdminTab },
                            { icon: "📈", label: t('sidebar.analytics'), id: "Analytics" as AdminTab },
                            { icon: "📋", label: t('sidebar.masterData'), id: "MasterData" as AdminTab },
                        ].map((item, index) => {
                            const isActive = item.id === activeTab;
                            const showUnreadBadge = 'unread' in item && (item as any).unread > 0 && item.id !== activeTab;
                            return (
                                <button
                                    key={index}
                                    onClick={() => item.id && handleTabChange(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all text-left ${isActive
                                        ? "bg-white/20 text-white font-medium"
                                        : "text-white/80 hover:bg-white/10"
                                        }`}
                                >
                                    <span className="text-base">{item.icon}</span>
                                    <span>{item.label}</span>
                                    {showUnreadBadge ? (
                                        <span className="ml-auto min-w-[20px] h-5 bg-red-500 text-white text-[10px] px-1.5 rounded-full font-bold flex items-center justify-center">
                                            {(item as any).unread > 99 ? '99+' : (item as any).unread}
                                        </span>
                                    ) : item.badge && (
                                        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${item.badge === "New"
                                            ? "bg-indigo-200 text-indigo-700"
                                            : "bg-pink-200 text-pink-600"
                                            }`}>
                                            {item.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden h-full">
                    {/* Top Header Bar */}
                    <header className="bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 h-14 flex-shrink-0">
                        <button 
                            className="text-gray-500 hover:text-gray-700 md:hidden mr-2"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <span className="text-xl">☰</span>
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 flex items-center justify-center shadow-md">
                                <span className="text-white text-xs font-black tracking-tighter">H</span>
                            </div>
                            <span className="text-lg font-extrabold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">HDG.AI</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                className="text-gray-500 relative hover:text-gray-700 transition-colors"
                                onClick={() => handleTabChange('UnifiedChat')}
                                title={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "New message" : "ข้อความใหม่")}
                            >
                                🔔
                                {totalUnread > 0 && activeTab !== 'UnifiedChat' && (
                                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] px-1 rounded-full font-bold flex items-center justify-center animate-pulse">
                                        {totalUnread > 99 ? '99+' : totalUnread}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => { setLocale(locale === 'th' ? 'en' : 'th'); }}
                                className="flex items-center gap-1 text-sm text-gray-600 hover:text-pink-600 transition-colors px-2 py-1 rounded-lg hover:bg-pink-50 cursor-pointer hidden md:flex"
                            >
                                🌐 {locale === 'th' ? 'TH' : 'EN'}
                            </button>
                            <ShopSelector />
                            <div className="h-6 w-px bg-gray-200" />
                            <UserMenu />
                        </div>
                    </header>

                    {/* Tab Navigation Bar - hidden on mobile for chat to maximize space */}
                    <div className={`bg-white border-b border-gray-200 px-6 flex-shrink-0 ${activeTab === 'UnifiedChat' ? 'hidden md:block' : ''}`}>
                        <div className="flex items-center gap-1 overflow-x-auto">
                            {/* Grid icon */}
                            <button className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center mr-2">
                                <span className="text-white text-xs">⊞</span>
                            </button>
                            {topTabDefs.map((tab) => {const label = t(tab.labelKey); return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`flex-shrink-0 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-all flex items-center gap-1.5 ${activeTab === tab.id
                                        ? "border-pink-500 text-pink-500 font-medium"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    {label}
                                    {tab.id === 'UnifiedChat' && totalUnread > 0 && activeTab !== 'UnifiedChat' && (
                                        <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] px-1 rounded-full font-bold flex items-center justify-center">
                                            {totalUnread > 99 ? '99+' : totalUnread}
                                        </span>
                                    )}
                                </button>
                            );})}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div key={locale} className="flex-1 min-h-0 flex flex-col overflow-y-auto w-full relative pb-10">
                        {/* ⚡ Heavy tabs: always mounted, hidden via CSS — no reload on revisit */}
                        <div style={{ display: activeTab === 'UnifiedChat' ? 'flex' : 'none' }} className="flex-col flex-1 min-h-0">
                            <AdminUnifiedChat initialInbox={preloadedInbox} initialChatToken={chatToken} />
                        </div>
                        <div style={{ display: activeTab === 'Broadcast' ? 'block' : 'none' }}>
                            <AdminBroadcast />
                        </div>
                        <div style={{ display: activeTab === 'Analytics' ? 'block' : 'none' }}>
                            <AdminAnalytics />
                        </div>
                        <div style={{ display: activeTab === 'ecommerce-order-summary' ? 'block' : 'none' }}>
                            <AdminOrders isActive={activeTab === 'ecommerce-order-summary'} focusOrderId={focusOrderId} />
                        </div>
                        <div style={{ display: activeTab === 'CartSummary' ? 'block' : 'none' }}>
                            <AdminCartSummary isActive={activeTab === 'CartSummary'} />
                        </div>
                        <div style={{ display: activeTab === 'Products' ? 'block' : 'none' }}>
                            <AdminProducts />
                        </div>
                        {/* Light tabs: normal switch (saves memory) */}
                        {!['UnifiedChat', 'Broadcast', 'Analytics', 'ecommerce-order-summary', 'CartSummary', 'Products'].includes(activeTab) && renderContent()}

                    </div>
                </div>
            </div>
        </AdminLogin>
    );
}
