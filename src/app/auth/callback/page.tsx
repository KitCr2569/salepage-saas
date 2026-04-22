"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useShopStore } from "@/store/useShopStore";

export default function AuthCallbackPage() {
    const router = useRouter();
    const { login, setAvailablePages } = useAuthStore();

    useEffect(() => {
        const handleCallback = async () => {
            // Facebook returns token in URL hash: #access_token=xxx&...
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get("access_token");

            if (!accessToken) {
                console.error("No access token found in URL");
                router.push("/admin");
                return;
            }

            try {
                // 1. Get user info
                const userInfo = await fetch(
                    `https://graph.facebook.com/me?fields=id,name,picture.width(200).height(200)&access_token=${accessToken}`
                ).then((r) => r.json());

                if (userInfo.error) {
                    console.error("FB user info error:", userInfo.error);
                    router.push("/admin");
                    return;
                }

                // 2. Login to auth store
                login({
                    userId: userInfo.id,
                    userName: userInfo.name,
                    userEmail: "",
                    userPicture: userInfo.picture?.data?.url || "",
                    accessToken,
                });

                // 3. Exchange token + get pages
                let pages: any[] = [];
                try {
                    const ex = await fetch("/api/auth/exchange-token", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ shortLivedToken: accessToken }),
                    }).then((r) => r.json());

                    if (ex.success && ex.pages) {
                        pages = ex.pages;
                    } else {
                        throw new Error("exchange failed");
                    }
                } catch {
                    // Fallback: get pages directly
                    const fb = await fetch(
                        `https://graph.facebook.com/me/accounts?access_token=${accessToken}`
                    ).then((r) => r.json());
                    if (fb?.data) {
                        pages = fb.data.map((p: any) => ({
                            id: p.id,
                            name: p.name,
                            picture: `https://graph.facebook.com/${p.id}/picture?width=100&height=100`,
                            accessToken: p.access_token,
                        }));
                    }
                }

                if (pages.length > 0) {
                    setAvailablePages(pages);
                }

                // 4. Auto chat auth
                try {
                    const chat = await fetch("/api/chat/auth/login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                            email: process.env.NEXT_PUBLIC_CHAT_ADMIN_EMAIL || "admin@shop.com", 
                            password: process.env.NEXT_PUBLIC_CHAT_ADMIN_PASSWORD || "" 
                        }),
                    }).then((r) => r.json());
                    if (chat.success && chat.data?.token) {
                        localStorage.setItem("chat-auth-token", chat.data.token);
                        localStorage.setItem("chat-agent", JSON.stringify(chat.data.agent));
                        localStorage.setItem("chat-token-expiry", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
                    }
                } catch {}

                // 5. Auto-sync Page Access Token to DB (channels table)
                // ทำให้ Token อัปเดตอัตโนมัติทุกครั้งที่ Login → ไม่ต้องวาง Token เองอีก!
                try {
                    const TARGET_PAGE_ID = process.env.NEXT_PUBLIC_FB_PAGE_ID || "";
                    const hdgPage = TARGET_PAGE_ID ? pages.find((p: any) => p.id === TARGET_PAGE_ID) : pages[0];
                    const chatAuthToken = localStorage.getItem("chat-auth-token");

                    if (hdgPage && chatAuthToken) {
                        const syncRes = await fetch("/api/chat/channels", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${chatAuthToken}`,
                            },
                            body: JSON.stringify({
                                type: "MESSENGER",
                                name: "MESSENGER Channel (Auto)",
                                config: {
                                    pageId: hdgPage.id,
                                    pageName: hdgPage.name || "Facebook Page",
                                    pageAccessToken: hdgPage.accessToken,
                                    connectedAt: new Date().toISOString(),
                                    tokenUpdatedAt: new Date().toISOString(),
                                    autoSynced: true,
                                },
                            }),
                        });
                        const syncResult = await syncRes.json();
                        console.log("🔑 Auto-sync token:", syncResult.success ? "✅ Success" : "❌ Failed");
                    }
                } catch (syncErr) {
                    console.warn("⚠️ Token auto-sync error:", syncErr);
                }

                // 6. Redirect to admin
                router.push("/admin");
            } catch (err) {
                console.error("Auth callback error:", err);
                router.push("/admin");
            }
        };

        handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600 font-medium">กำลังเข้าสู่ระบบ...</p>
            </div>
        </div>
    );
}
