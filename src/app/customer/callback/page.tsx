"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCustomerStore } from "@/store/useCustomerStore";
import { Suspense } from "react";

const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "1417314816291087";

function CustomerCallbackInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useCustomerStore();
    const [status, setStatus] = useState("กำลังเข้าสู่ระบบ...");
    const [error, setError] = useState("");

    useEffect(() => {
        const handleCallback = async () => {
            // Get access token from URL hash (implicit flow)
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get("access_token");

            // Or from query params (authorization code flow)
            const code = searchParams.get("code");

            if (!accessToken && !code) {
                setError("ไม่พบข้อมูลการเข้าสู่ระบบ");
                setTimeout(() => router.push("/"), 2000);
                return;
            }

            try {
                let token = accessToken;

                // If we have a code, exchange it for a token (server-side would be better but for simplicity)
                if (!token && code) {
                    setError("กรุณาลองใหม่อีกครั้ง");
                    setTimeout(() => router.push("/"), 2000);
                    return;
                }

                if (!token) {
                    setError("ไม่สามารถเข้าสู่ระบบได้");
                    setTimeout(() => router.push("/"), 2000);
                    return;
                }

                // Fetch user info from Facebook Graph API
                setStatus("กำลังดึงข้อมูลผู้ใช้...");
                const userRes = await fetch(
                    `https://graph.facebook.com/me?fields=id,name,picture.width(200).height(200),email&access_token=${token}`
                );
                const userData = await userRes.json();

                if (userData.error) {
                    setError(userData.error.message || "ไม่สามารถดึงข้อมูลผู้ใช้ได้");
                    setTimeout(() => router.push("/"), 2000);
                    return;
                }

                // Login successful
                login(
                    {
                        id: userData.id,
                        name: userData.name,
                        picture: userData.picture?.data?.url || "",
                        email: userData.email || "",
                    },
                    token
                );

                setStatus("เข้าสู่ระบบสำเร็จ! กำลังดำเนินการชำระสินค้า...");

                // Check if there's a pending checkout (customer clicked checkout before login)
                const pendingCheckout = localStorage.getItem("hdg_pending_checkout");
                if (pendingCheckout) {
                    localStorage.removeItem("hdg_pending_checkout");
                    setTimeout(() => {
                        window.location.href = pendingCheckout;
                    }, 800);
                } else {
                    setStatus("เข้าสู่ระบบสำเร็จ! กำลังกลับหน้าร้าน...");
                    setTimeout(() => router.push("/"), 1000);
                }
            } catch (err) {
                console.error("Login error:", err);
                setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
                setTimeout(() => router.push("/"), 2000);
            }
        };

        handleCallback();
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full mx-4 text-center">
                {error ? (
                    <>
                        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">❌</span>
                        </div>
                        <p className="text-red-600 font-medium">{error}</p>
                        <p className="text-gray-400 text-sm mt-2">กำลังกลับหน้าร้าน...</p>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <p className="text-gray-800 font-medium">{status}</p>
                    </>
                )}
            </div>
        </div>
    );
}

export default function CustomerCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <p>กำลังโหลด...</p>
            </div>
        }>
            <CustomerCallbackInner />
        </Suspense>
    );
}
