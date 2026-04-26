"use client";

import { useEffect } from "react";

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Admin Error]", error);
    }, [error]);

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0f0f23",
            color: "#fff",
            fontFamily: "'Inter', sans-serif",
            padding: "2rem",
        }}>
            <div style={{
                maxWidth: "480px",
                textAlign: "center",
                background: "rgba(255,255,255,0.05)",
                borderRadius: "1.5rem",
                padding: "2.5rem 2rem",
                border: "1px solid rgba(255,255,255,0.1)",
            }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔧</div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                    Admin Panel Error
                </h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
                    {error?.message || "เกิดข้อผิดพลาดในหน้า Admin"}
                </p>
                {error?.digest && (
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.7rem", fontFamily: "monospace", marginBottom: "1rem" }}>
                        {error.digest}
                    </p>
                )}
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.5rem" }}>
                    <button
                        onClick={reset}
                        style={{
                            padding: "0.6rem 1.5rem",
                            background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "0.75rem",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        🔄 ลองใหม่
                    </button>
                    <button
                        onClick={() => window.location.href = "/admin"}
                        style={{
                            padding: "0.6rem 1.5rem",
                            background: "rgba(255,255,255,0.1)",
                            color: "#fff",
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: "0.75rem",
                            fontSize: "0.85rem",
                            cursor: "pointer",
                        }}
                    >
                        🏠 กลับหน้าหลัก
                    </button>
                </div>
            </div>
        </div>
    );
}
