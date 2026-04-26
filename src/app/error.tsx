"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Error Boundary]", error);
    }, [error]);

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%)",
            color: "#fff",
            fontFamily: "'Inter', sans-serif",
            padding: "2rem",
        }}>
            <div style={{
                maxWidth: "420px",
                textAlign: "center",
                background: "rgba(255,255,255,0.05)",
                borderRadius: "1.5rem",
                padding: "3rem 2rem",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(12px)",
            }}>
                <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>⚠️</div>
                <h2 style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    marginBottom: "0.75rem",
                    background: "linear-gradient(135deg, #f472b6, #a78bfa)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                }}>
                    เกิดข้อผิดพลาด
                </h2>
                <p style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "0.875rem",
                    marginBottom: "1.5rem",
                    lineHeight: 1.6,
                }}>
                    ระบบพบปัญหาที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง
                </p>
                {error?.digest && (
                    <p style={{
                        color: "rgba(255,255,255,0.3)",
                        fontSize: "0.7rem",
                        fontFamily: "monospace",
                        marginBottom: "1rem",
                    }}>
                        Error ID: {error.digest}
                    </p>
                )}
                <button
                    onClick={reset}
                    style={{
                        padding: "0.75rem 2rem",
                        background: "linear-gradient(135deg, #f472b6, #a78bfa)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "0.75rem",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        boxShadow: "0 4px 15px rgba(244, 114, 182, 0.3)",
                    }}
                >
                    🔄 ลองใหม่อีกครั้ง
                </button>
            </div>
        </div>
    );
}
