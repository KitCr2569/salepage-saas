"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function AdminAuthCallbackPage() {
    const router = useRouter();
    const { login, setAvailablePages } = useAuthStore();

    useEffect(() => {
        const handleCallback = async () => {
            // Facebook returns token in URL hash: #access_token=xxx&...
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get("access_token");

            if (!accessToken) {
                console.error("No access token found in URL", window.location.href);
                document.body.innerHTML = `
                    <div style="padding: 20px; font-family: sans-serif; text-align: center;">
                        <h2 style="color: red;">❌ Login Error</h2>
                        <p>Facebook did not return an access token.</p>
                        <p style="font-size: 12px; color: gray; word-break: break-all;">URL: ${window.location.href}</p>
                        <a href="/admin" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #1877F2; color: white; text-decoration: none; border-radius: 8px;">Try Again</a>
                    </div>
                `;
                return;
            }

            try {
                // Backend-first auth: ส่ง Token ให้ Backend จัดการดึง /me, /me/accounts และออก JWT ให้
                const loginRes = await fetch("/api/auth/facebook/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ accessToken }),
                }).then((r) => r.json());

                if (!loginRes.success) {
                    console.error("Backend login error:", loginRes.error);
                    document.body.innerHTML = `
                        <div style="padding: 20px; font-family: sans-serif; text-align: center;">
                            <h2 style="color: red;">❌ Login Error</h2>
                            <p>${loginRes.error}</p>
                            <a href="/admin" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #1877F2; color: white; text-decoration: none; border-radius: 8px;">Try Again</a>
                        </div>
                    `;
                    return;
                }

                const { token: jwtToken, user, pages } = loginRes;

                // 2. Login to auth store (store JWT instead of FB token if you want, or just store JWT in localStorage)
                // We'll store the JWT in both places so existing code that expects a token gets the JWT
                login({
                    userId: user.id,
                    userName: user.name,
                    userEmail: user.email || "",
                    userPicture: user.picture || "",
                    accessToken: jwtToken, // <--- ใช้ JWT แทน Facebook Token ตรงๆ
                });

                if (pages && pages.length > 0) {
                    setAvailablePages(pages);
                }

                // 3. Save JWT to localStorage for chat API compatibility
                localStorage.setItem("chat-auth-token", jwtToken);
                localStorage.setItem("chat-agent", JSON.stringify({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: "ADMIN"
                }));
                localStorage.setItem("chat-token-expiry", String(Date.now() + 7 * 24 * 60 * 60 * 1000));

                // 4. Auto-sync Page Access Token to DB (channels table)
                try {
                    const HDG_PAGE_ID = "114336388182180";
                    const hdgPage = pages.find((p: any) => p.id === HDG_PAGE_ID);

                    if (hdgPage) {
                        const syncRes = await fetch("/api/chat/channels", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${jwtToken}`,
                            },
                            body: JSON.stringify({
                                type: "MESSENGER",
                                name: "MESSENGER Channel (Auto)",
                                config: {
                                    pageId: hdgPage.id,
                                    pageName: hdgPage.name || "HDG Wrap Sticker Film Skin",
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

                // 5. Redirect back to where the user came from (or admin)
                const redirectTo = localStorage.getItem("auth_redirect") || "/admin";
                localStorage.removeItem("auth_redirect");
                router.push(redirectTo);
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
