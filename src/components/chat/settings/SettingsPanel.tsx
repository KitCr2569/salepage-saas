"use client";

import { useState, useEffect, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { Trans } from "@/components/Trans";
import {
    ORDER_CONFIRMATION,
    TRACKING_BUTTON_MSG,
    PAYMENT_CONFIRMATION,
    AUTO_CANCEL_MSG,
    ADMIN_PAYMENT_NOTIFICATION,
    ADDRESS_UPDATE_CONFIRM,
    FOLLOW_UP_REMINDER,
    CHECKOUT_ORDER_SUMMARY,
    PAY_ORDER_SUMMARY,
} from "@/lib/message-templates";

interface ChannelInfo {
    id: string;
    type: string;
    name: string;
    isActive: boolean;
    config: {
        pageId?: string;
        pageName?: string;
        pageAccessToken?: string;
        verifyToken?: string;
        connectedAt?: string;
    };
}

interface TestResult {
    fbStatus: number;
    fbOk: boolean;
    fbResponse: Record<string, unknown>;
    tokenPrefix: string;
    recipientId: string;
}

export default function SettingsPanel() {
    const { get, patch, post } = useApi();
    const [channels, setChannels] = useState<ChannelInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [newToken, setNewToken] = useState("");
    const [updating, setUpdating] = useState(false);
    const [updateMsg, setUpdateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [tokenStatus, setTokenStatus] = useState<"checking" | "valid" | "expired" | "unknown">("checking");

    // New channel connect form
    const [connectPageId, setConnectPageId] = useState(process.env.NEXT_PUBLIC_FB_PAGE_ID || "");
    const [connectPageName, setConnectPageName] = useState("");
    const [connectToken, setConnectToken] = useState("");
    const [connecting, setConnecting] = useState(false);
    const [connectMsg, setConnectMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Template editor state
    const [templates, setTemplates] = useState<Record<string, string>>({});
    const [tplLoading, setTplLoading] = useState(true);
    const [tplSaving, setTplSaving] = useState(false);
    const [tplMsg, setTplMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [activeTplTab, setActiveTplTab] = useState<"checkout" | "pay">("checkout");
    const [previewKey, setPreviewKey] = useState<string | null>(null);
    const [editingKey, setEditingKey] = useState<string | null>(null);

    const TemplateEditor = ({
        tplKey,
        label,
        rows = 4,
        placeholder,
        varsHint = "",
    }: {
        tplKey: string;
        label: string;
        rows?: number;
        placeholder: string;
        varsHint?: string;
    }) => (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">{label}</label>
                <div className="flex gap-1.5 justify-end items-center">
                    {editingKey === tplKey ? (
                        <button onClick={() => setEditingKey(null)} className="text-[11px] bg-brand-100 text-brand-700 px-3 py-1 rounded-full font-bold shadow-sm ring-1 ring-brand-500/50">✅ เสร็จสิ้น</button>
                    ) : (
                        <button onClick={() => setEditingKey(tplKey)} className="text-[11px] bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors font-medium">✏️ แก้ไข</button>
                    )}
                    <button onClick={() => setPreviewKey(previewKey === tplKey ? null : tplKey)} className="text-[11px] text-brand-600 hover:text-brand-700 font-medium ml-1">
                        {previewKey === tplKey ? "ซ่อน preview" : "preview"}
                    </button>
                </div>
            </div>
            {varsHint && <p className="text-[10px] text-slate-500 mb-1">{varsHint}</p>}
            <textarea
                rows={rows}
                value={templates[tplKey] ?? ""}
                onChange={e => setTpl(tplKey, e.target.value)}
                readOnly={editingKey !== tplKey}
                placeholder={placeholder}
                className={`w-full px-3 py-2 border rounded-lg text-[13px] focus:outline-none resize-y font-mono leading-relaxed transition-colors shadow-sm ${
                    editingKey === tplKey 
                        ? "bg-white border-brand-400 ring-1 ring-brand-400 text-slate-800 placeholder-slate-400 cursor-text" 
                        : "bg-slate-50 border-slate-200 text-slate-600 placeholder-slate-400 cursor-not-allowed"
                }`}
            />
            {previewKey === tplKey && (
                <div className="mt-2 p-3 bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-700 whitespace-pre-wrap font-mono relative shadow-inner">
                    {templates[tplKey] || placeholder}
                </div>
            )}
        </div>
    );


    const fetchChannels = useCallback(async () => {
        setLoading(true);
        try {
            const res = await get<ChannelInfo[]>("/api/chat/channels");
            if (res.data) {
                setChannels(res.data);
            }
        } catch (err) {
            console.error("Failed to fetch channels:", err);
        } finally {
            setLoading(false);
        }
    }, [get]);

    const fetchTemplates = useCallback(async () => {
        setTplLoading(true);
        try {
            const res = await fetch("/api/settings");
            const data = await res.json();
            if (data.success) setTemplates(data.data || {});
        } catch {}
        finally { setTplLoading(false); }
    }, []);

    const saveTemplates = async () => {
        setTplSaving(true);
        setTplMsg(null);
        try {
            // ── Fetch current full config first, then merge template keys ──
            // ← critical: POST /api/settings REPLACES entire paymentConfig,
            //   so we must merge to avoid wiping bank/payment/shipping data
            const currentRes = await fetch("/api/settings");
            const currentData = await currentRes.json();
            const currentConfig: Record<string, unknown> = currentData.success ? (currentData.data || {}) : {};

            const merged = { ...currentConfig, ...templates };

            const res = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(merged),
            });
            const data = await res.json();
            if (data.success) {
                setTplMsg({ type: "success", text: "✅ บันทึก template สำเร็จ!" });
                setTimeout(() => setTplMsg(null), 3000);
            } else {
                setTplMsg({ type: "error", text: `❌ ${data.error || "บันทึกไม่สำเร็จ"}` });
            }
        } catch (err) {
            setTplMsg({ type: "error", text: `❌ ${err instanceof Error ? err.message : "เกิดข้อผิดพลาด"}` });
        } finally {
            setTplSaving(false);
        }
    };

    const setTpl = (key: string, value: string) =>
        setTemplates(prev => ({ ...prev, [key]: value }));

    // Check token validity
    const checkToken = useCallback(async () => {
        setTokenStatus("checking");
        try {
            const res = await fetch("/api/chat/test-send");
            const data = await res.json();
            if (data.success && data.data?.fbOk) {
                setTokenStatus("valid");
            } else if (data.data?.fbResponse?.error) {
                const errCode = (data.data.fbResponse.error as Record<string, unknown>)?.code;
                setTokenStatus(errCode === 190 ? "expired" : "unknown");
            } else {
                setTokenStatus("unknown");
            }
        } catch {
            setTokenStatus("unknown");
        }
    }, []);

    useEffect(() => {
        fetchChannels();
        checkToken();
        fetchTemplates();
    }, [fetchChannels, checkToken, fetchTemplates]);

    // Connect new Messenger channel
    const handleConnectChannel = async () => {
        if (!connectToken.trim()) {
            setConnectMsg({ type: "error", text: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Please place the Page Access Token." : "กรุณาวาง Page Access Token") });
            return;
        }
        setConnecting(true);
        setConnectMsg(null);
        try {
            const data = await post<{ id: string }>("/api/chat/channels", {
                type: "MESSENGER",
                name: connectPageName || "Messenger Channel",
                config: {
                    pageId: connectPageId,
                    pageName: connectPageName,
                    pageAccessToken: connectToken.trim(),
                    connectedAt: new Date().toISOString(),
                },
            });
            if (data.success) {
                setConnectMsg({ type: "success", text: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "✅ Messenger connected successfully!" : "✅ เชื่อมต่อ Messenger สำเร็จ!") });
                setConnectToken("");
                await fetchChannels();
                await checkToken();
            } else {
                setConnectMsg({ type: "error", text: `❌ ${data.error || (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Failed to connect" : "เชื่อมต่อไม่สำเร็จ")}` });
            }
        } catch (err) {
            setConnectMsg({ type: "error", text: `❌ ${err instanceof Error ? err.message : (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "An error occurred." : "เกิดข้อผิดพลาด")}` });
        } finally {
            setConnecting(false);
        }
    };



    const handleUpdateToken = async (channelId: string) => {
        if (!newToken.trim()) {
            setUpdateMsg({ type: "error", text: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Please place a new Token." : "กรุณาวาง Token ใหม่") });
            return;
        }
        setUpdating(true);
        setUpdateMsg(null);
        try {
            const channel = channels.find((c) => c.id === channelId);
            const currentConfig = channel?.config || {};
            await patch(`/api/chat/channels/${channelId}`, {
                config: {
                    ...currentConfig,
                    pageAccessToken: newToken.trim(),
                    tokenUpdatedAt: new Date().toISOString(),
                },
            });
            setUpdateMsg({ type: "success", text: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "✅ Token update successful!" : "✅ อัปเดต Token สำเร็จ!") });
            setNewToken("");
            await fetchChannels();
            await checkToken();
        } catch (err) {
            setUpdateMsg({
                type: "error",
                text: `❌ อัปเดตไม่สำเร็จ: ${err instanceof Error ? err.message : "Unknown error"}`,
            });
        } finally {
            setUpdating(false);
        }
    };

    const handleTestSend = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch("/api/chat/test-send");
            const data = await res.json();
            setTestResult(data.data);
            if (data.data?.fbOk) {
                setTokenStatus("valid");
            } else {
                setTokenStatus("expired");
            }
        } catch (err) {
            console.error("Test failed:", err);
        } finally {
            setTesting(false);
        }
    };

    const messengerChannel = channels.find((c) => c.type === "MESSENGER");

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="inline-block animate-spin w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full mb-3" />
                    <p className="text-surface-400 text-sm">{<Trans th="กำลังโหลดการตั้งค่า..." en="Loading settings..." />}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Trans th="⚙️ ตั้งค่าช่องทาง" en="⚙️ Channel settings" />
                                            </h2>
                    <p className="text-surface-400 text-sm mt-1">{<Trans th="จัดการการเชื่อมต่อ Facebook Messenger" en="Manage Facebook Messenger connections" />}</p>
                </div>

                {/* Token Status Card */}
                <div
                    className={`rounded-xl p-4 border ${
                        tokenStatus === "valid"
                            ? "bg-emerald-900/20 border-emerald-700/50"
                            : tokenStatus === "expired"
                            ? "bg-red-900/20 border-red-700/50"
                            : "bg-surface-800/50 border-surface-700"
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                                tokenStatus === "valid"
                                    ? "bg-emerald-500/20"
                                    : tokenStatus === "expired"
                                    ? "bg-red-500/20"
                                    : "bg-surface-700"
                            }`}
                        >
                            {tokenStatus === "valid" ? "✅" : tokenStatus === "expired" ? "❌" : "⏳"}
                        </div>
                        <div>
                            <p className="font-semibold text-white text-sm">
                                {<Trans th="สถานะ Token:" en="Token Status:" />}{" "}
                                {tokenStatus === "valid" && (
                                    <span className="text-emerald-400">{<Trans th="ใช้งานได้" en="Can be used" />}</span>
                                )}
                                {tokenStatus === "expired" && (
                                    <span className="text-red-400">{<Trans th="หมดอายุ" en="expire" />}</span>
                                )}
                                {tokenStatus === "checking" && (
                                    <span className="text-yellow-400">{<Trans th="กำลังตรวจสอบ..." en="Checking..." />}</span>
                                )}
                                {tokenStatus === "unknown" && (
                                    <span className="text-yellow-400">{<Trans th="ไม่ทราบสถานะ" en="Status unknown" />}</span>
                                )}
                            </p>
                            <p className="text-surface-400 text-xs mt-0.5">
                                {tokenStatus === "expired"
                                    ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Token has expired — please update your token below." : "Token หมดอายุแล้ว — กรุณาอัปเดต Token ใหม่ด้านล่าง")
                                    : tokenStatus === "valid"
                                    ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "The system can send messages via Messenger normally." : "ระบบส่งข้อความผ่าน Messenger ได้ปกติ")
                                    : "กำลังตรวจสอบการเชื่อมต่อ..."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Messenger Channel */}
                {messengerChannel ? (
                    <div className="bg-surface-900 rounded-xl border border-surface-800 overflow-hidden">
                        {/* Channel Info */}
                        <div className="p-4 border-b border-surface-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-xl">
                                        💬
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white text-sm">{messengerChannel.name}</p>
                                        <p className="text-surface-400 text-xs">
                                            Page ID: {messengerChannel.config.pageId || "-"}
                                        </p>
                                    </div>
                                </div>
                                <span
                                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                        messengerChannel.isActive
                                            ? "bg-emerald-500/20 text-emerald-400"
                                            : "bg-red-500/20 text-red-400"
                                    }`}
                                >
                                    {messengerChannel.isActive ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Connected" : "เชื่อมต่อแล้ว") : "ไม่ได้เชื่อมต่อ"}
                                </span>
                            </div>
                            {messengerChannel.config.connectedAt && (
                                <p className="text-surface-500 text-xs mt-2">
                                    {<Trans th="เชื่อมต่อเมื่อ:" en="Connect when:" />}{" "}
                                    {new Date(messengerChannel.config.connectedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
                                </p>
                            )}
                            {messengerChannel.config.pageAccessToken && (
                                <p className="text-surface-500 text-xs mt-1">
                                    Token: {messengerChannel.config.pageAccessToken.substring(0, 15)}...
                                    {messengerChannel.config.pageAccessToken.substring(
                                        messengerChannel.config.pageAccessToken.length - 6
                                    )}
                                </p>
                            )}
                        </div>

                        {/* Update Token Form */}
                        <div className="p-4">
                            <h3 className="text-sm font-semibold text-white mb-3">{<Trans th="🔑 อัปเดต Page Access Token" en="🔑 Update Page Access Token" />}</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-surface-400 mb-1.5">
                                        {<Trans th="วาง Token ใหม่จาก" en="Place new Token from" />}{" "}
                                        <a
                                            href="https://developers.facebook.com/tools/explorer/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-brand-400 hover:text-brand-300 underline"
                                        >
                                            Graph API Explorer
                                        </a>
                                    </label>
                                    <textarea
                                        value={newToken}
                                        onChange={(e) => setNewToken(e.target.value)}
                                        placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "EAAxx... (Place Page Access Token here)" : "EAAxx... (วาง Page Access Token ที่นี่)")}
                                        rows={3}
                                        className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm placeholder-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none font-mono"
                                    />
                                </div>

                                {updateMsg && (
                                    <div
                                        className={`px-3 py-2 rounded-lg text-sm ${
                                            updateMsg.type === "success"
                                                ? "bg-emerald-900/30 text-emerald-300 border border-emerald-700/50"
                                                : "bg-red-900/30 text-red-300 border border-red-700/50"
                                        }`}
                                    >
                                        {updateMsg.text}
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleUpdateToken(messengerChannel.id)}
                                        disabled={updating || !newToken.trim()}
                                        className="flex-1 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:bg-surface-700 disabled:text-surface-500 text-white text-sm font-medium transition-colors"
                                    >
                                        {updating ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Updating..." : "กำลังอัปเดต...") : "💾 บันทึก Token ใหม่"}
                                    </button>
                                    <button
                                        onClick={handleTestSend}
                                        disabled={testing}
                                        className="px-4 py-2.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 text-sm font-medium transition-colors border border-surface-700"
                                    >
                                        {testing ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Testing..." : "กำลังทดสอบ...") : "🧪 ทดสอบส่ง"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Test Result */}
                        {testResult && (
                            <div className="p-4 border-t border-surface-800">
                                <h4 className="text-xs font-medium text-surface-400 mb-2">{<Trans th="ผลการทดสอบ:" en="Test results:" />}</h4>
                                <div
                                    className={`px-3 py-2 rounded-lg text-sm ${
                                        testResult.fbOk
                                            ? "bg-emerald-900/30 text-emerald-300"
                                            : "bg-red-900/30 text-red-300"
                                    }`}
                                >
                                    <p className="font-medium mb-1">
                                        {testResult.fbOk ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "✅ Message sent successfully!" : "✅ ส่งข้อความสำเร็จ!") : "❌ ส่งไม่สำเร็จ"}
                                    </p>
                                    <p className="text-xs opacity-80">
                                        Status: {testResult.fbStatus} | Token: {testResult.tokenPrefix}
                                    </p>
                                    {!testResult.fbOk && testResult.fbResponse?.error ? (
                                        <p className="text-xs mt-1 opacity-80">
                                            Error: {JSON.stringify(testResult.fbResponse.error)}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-surface-900 rounded-xl border border-surface-800 overflow-hidden">
                        <div className="p-5 border-b border-surface-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-xl">💬</div>
                                <div>
                                    <p className="font-semibold text-white text-sm">{<Trans th="เชื่อมต่อ Facebook Messenger" en="Connect Facebook Messenger" />}</p>
                                    <p className="text-surface-400 text-xs">{<Trans th="ยังไม่มีช่องทาง — กรอกข้อมูลเพื่อเริ่มต้น" en="Don't have a channel yet — fill out your information to get started." />}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs text-surface-400 mb-1.5">Page ID</label>
                                <input
                                    value={connectPageId}
                                    onChange={(e) => setConnectPageId(e.target.value)}
                                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm placeholder-surface-500 focus:outline-none focus:border-brand-500"
                                    placeholder="Page ID ของคุณ"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-surface-400 mb-1.5">{<Trans th="ชื่อเพจ" en="Page name" />}</label>
                                <input
                                    value={connectPageName}
                                    onChange={(e) => setConnectPageName(e.target.value)}
                                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm placeholder-surface-500 focus:outline-none focus:border-brand-500"
                                    placeholder="ชื่อเพจ Facebook ของคุณ"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-surface-400 mb-1.5">
                                    {<Trans th="Page Access Token (จาก" en="Page Access Token (from" />}{" "}
                                    <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-brand-400 underline">
                                        Graph API Explorer
                                    </a>
                                    {" "}→ App ของคุณ)
                                </label>
                                <textarea
                                    value={connectToken}
                                    onChange={(e) => setConnectToken(e.target.value)}
                                    placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "EAAxx... (Place Page Access Token here)" : "EAAxx... (วาง Page Access Token ที่นี่)")}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm placeholder-surface-500 focus:outline-none focus:border-brand-500 resize-none font-mono"
                                />
                            </div>

                            {connectMsg && (
                                <div className={`px-3 py-2 rounded-lg text-sm ${
                                    connectMsg.type === "success"
                                        ? "bg-emerald-900/30 text-emerald-300 border border-emerald-700/50"
                                        : "bg-red-900/30 text-red-300 border border-red-700/50"
                                }`}>
                                    {connectMsg.text}
                                </div>
                            )}

                            <button
                                onClick={handleConnectChannel}
                                disabled={connecting || !connectToken.trim()}
                                className="w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-surface-700 disabled:text-surface-500 text-white text-sm font-bold transition-colors"
                            >
                                {connecting ? (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Connecting..." : "กำลังเชื่อมต่อ...") : "🔗 เชื่อมต่อ Messenger"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Help Section */}
                <div className="relative overflow-hidden bg-white rounded-2xl border border-indigo-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    {/* Decorative blurred blob */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-100/50 blur-[40px] rounded-full pointer-events-none"></div>
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-100/50 blur-[40px] rounded-full pointer-events-none"></div>
                    
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-slate-800 tracking-wide">{<Trans th="วิธีสร้าง Token ใหม่" en="How to create a new Token" />}</h3>
                    </div>

                    <div className="space-y-4 relative z-10 pl-1">
                        {(
                            [
                                { step: 1, text: <Trans th="เข้าไปที่เว็บไซต์" en="Go to" />, link: "Graph API Explorer", url: "https://developers.facebook.com/tools/explorer/" },
                                { step: 2, text: <Trans th='เลือกช่อง App เป็นชื่อ App ของคุณ' en='Choose your App' /> },
                                { step: 3, text: <Trans th='เลือกช่อง Page เป็นเพจของคุณ' en='Select your Page' /> },
                                { step: 4, text: <Trans th="เพิ่ม Permissions:" en="Add Permissions:" />, code: "pages_messaging" },
                                { step: 5, text: <Trans th='กดปุ่ม "Generate Access Token"' en='Press "Generate Access Token"' /> },
                                { step: 6, text: <Trans th='นำ Token ใหม่ที่ได้ มาวางในช่องด้านบน' en='Copy the Token and paste it above' /> },
                            ] as Array<{ step: number; text: JSX.Element; link?: string; url?: string; code?: string }>
                        ).map((item, idx) => (
                            <div key={idx} className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[11px] font-bold text-indigo-600 mt-0.5 shadow-sm">
                                    {item.step}
                                </div>
                                <div className="text-[13px] text-slate-600 leading-relaxed pt-0.5 font-medium">
                                    {item.text}{" "}
                                    {item.link && (
                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500 underline underline-offset-2 font-bold transition-colors">
                                            {item.link}
                                        </a>
                                    )}
                                    {item.code && (
                                        <code className="text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded text-xs ml-1 font-mono">
                                            {item.code}
                                        </code>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 relative z-10 shadow-sm">
                        <div className="text-amber-500 mt-0.5 text-base">⚠️</div>
                        <div className="text-[12px] text-amber-800 leading-relaxed font-semibold">
                            <Trans 
                                th="Token ที่ได้จาก Graph API Explorer ปกติจะหมดอายุภายใน ~1-2 ชั่วโมง แนะนำให้นำไปแปลงเป็น Long-lived token (อายุ 60 วัน หรือไม่มีวันหมดอายุ) เพื่อให้ไม่ต้องคอยมาต่ออายุบ่อยๆ ครับ" 
                                en="Tokens from Graph API Explorer typically expire in ~1-2 hours. We recommend converting them to Long-lived tokens (60 days or non-expiring) so you don't have to keep replacing them." 
                            />
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════ */}
                {/* MESSAGE TEMPLATE EDITOR                        */}
                {/* ══════════════════════════════════════════════ */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    {/* Section Header */}
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-xl">✉️</div>
                            <div>
                                <p className="font-bold text-slate-800 text-sm">Template ข้อความ Messenger</p>
                                <p className="text-slate-500 text-xs mt-0.5">แก้ไขข้อความที่ส่งให้ลูกค้าอัตโนมัติ</p>
                            </div>
                        </div>
                        {tplLoading && (
                            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        )}
                    </div>

                    {/* Tabs: Checkout / Pay */}
                    <div className="flex border-b border-slate-200 bg-slate-50/50">
                        <button
                            onClick={() => setActiveTplTab("checkout")}
                            className={`flex-1 px-4 py-3 text-sm font-bold transition-colors text-left border-b-2 ${
                                activeTplTab === "checkout"
                                    ? "text-emerald-700 border-emerald-500 bg-emerald-50"
                                    : "text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100"
                            }`}
                        >
                            <div className="flex items-center gap-1.5"><span className="text-base">🛒</span> Checkout</div>
                            <div className="text-[10px] font-medium opacity-80 mt-0.5 ml-6">ออเดอร์ผ่านเว็บ</div>
                        </button>
                        <button
                            onClick={() => setActiveTplTab("pay")}
                            className={`flex-1 px-4 py-3 text-sm font-bold transition-colors text-left border-b-2 ${
                                activeTplTab === "pay"
                                    ? "text-blue-700 border-blue-500 bg-blue-50"
                                    : "text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100"
                            }`}
                        >
                            <div className="flex items-center gap-1.5"><span className="text-base">💳</span> Pay</div>
                            <div className="text-[10px] font-medium opacity-80 mt-0.5 ml-6">สั่งซื้อผ่านแชท</div>
                        </button>
                    </div>

                    <div className="p-5 space-y-6">
                        {/* Placeholder hint */}
                        <div className="flex flex-wrap gap-1.5">
                            {["{orderNumber}","{customerName}","{total}","{itemLines}","{address}","{phone}","{note}","{shopUrl}","{orderDate}","{trackingUrl}"].map(p => (
                                <code key={p} className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-mono font-medium shadow-sm">{p}</code>
                            ))}
                        </div>

                        {/* ── CHECKOUT TAB ── */}
                        {activeTplTab === "checkout" && (
                            <div className="space-y-6 pt-2 border-t border-slate-100 mt-4">
                                <TemplateEditor 
                                    tplKey="tplCheckoutOrderSummary" 
                                    label="🛒 สรุปออเดอร์ (การ์ดก่อนคลิกยืนยันตะกร้า)" 
                                    rows={6} 
                                    placeholder={CHECKOUT_ORDER_SUMMARY} 
                                    varsHint="ตัวแปร: {itemLines}, {subtotal}, {shippingOptions}" 
                                />
                                <TemplateEditor 
                                    tplKey="confirmOrderMsg" 
                                    label="📋 ยืนยันออเดอร์ (ส่งให้ลูกค้าทันทีหลังสั่ง)" 
                                    rows={5} 
                                    placeholder={ORDER_CONFIRMATION} 
                                />
                                <TemplateEditor 
                                    tplKey="tplTrackingButton" 
                                    label="🔗 ข้อความพร้อมปุ่ม Tracking (ส่งพร้อมปุ่ม 'ตรวจสอบ/แก้ไข')" 
                                    rows={3} 
                                    placeholder={TRACKING_BUTTON_MSG} 
                                />
                                <TemplateEditor 
                                    tplKey="tplFollowUpReminder" 
                                    label="⏳ แจ้งเตือนค้างชำระ (ก่อนยกเลิกอัตโนมัติ)" 
                                    rows={5} 
                                    placeholder={FOLLOW_UP_REMINDER} 
                                />
                                <TemplateEditor 
                                    tplKey="tplAutoCancel" 
                                    label="⏰ ยกเลิกอัตโนมัติ (ไม่ชำระภายใน 2 ชั่วโมง)" 
                                    rows={6} 
                                    placeholder={AUTO_CANCEL_MSG} 
                                />
                                <TemplateEditor 
                                    tplKey="tplAddressConfirm" 
                                    label="📍 ยืนยันแก้ไขที่อยู่จัดส่ง" 
                                    rows={3} 
                                    placeholder={ADDRESS_UPDATE_CONFIRM} 
                                />
                            </div>
                        )}

                        {/* ── PAY TAB ── */}
                        {activeTplTab === "pay" && (
                            <div className="space-y-6 pt-2 border-t border-slate-100 mt-4">
                                <TemplateEditor 
                                    tplKey="confirmPaymentMsg" 
                                    label="🎉 ยืนยันชำระเงิน (ส่งให้ลูกค้าเมื่อแนบสลิปสำเร็จ)" 
                                    rows={5} 
                                    placeholder={PAYMENT_CONFIRMATION} 
                                />
                                <TemplateEditor 
                                    tplKey="tplPayOrderSummary" 
                                    label="🧾 สรุปออเดอร์ (แอดมินสร้างบิลในแชท)" 
                                    rows={6} 
                                    placeholder={PAY_ORDER_SUMMARY} 
                                    varsHint="ตัวแปร: {orderNumber}, {itemLines}, {subtotal}, {discountLine}, {shippingLine}, {shippingMethodLine}, {paymentMethodLine}, {total}, {paymentLinkSection}" 
                                />
                                <TemplateEditor 
                                    tplKey="tplAdminNotify" 
                                    label="🔔 แจ้ง Admin (แสดงใน Inbox เมื่อลูกค้าชำระเงิน)" 
                                    rows={3} 
                                    placeholder={ADMIN_PAYMENT_NOTIFICATION} 
                                    varsHint="* placeholders ที่ใช้ได้: {orderNumber}, {total}" 
                                />
                            </div>
                        )}

                        {/* Save feedback */}
                        {tplMsg && (
                            <div className={`px-3 py-2 rounded-lg text-sm ${
                                tplMsg.type === "success"
                                    ? "bg-emerald-900/30 text-emerald-300 border border-emerald-700/50"
                                    : "bg-red-900/30 text-red-300 border border-red-700/50"
                            }`}>
                                {tplMsg.text}
                            </div>
                        )}

                        {/* Save Button */}
                        <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                            <button
                                onClick={saveTemplates}
                                disabled={tplSaving}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:text-slate-500 text-white text-sm font-bold shadow-sm transition-colors"
                            >
                                {tplSaving ? "⏳ กำลังบันทึก..." : "💾 บันทึก Template"}
                            </button>
                            <button
                                onClick={() => { setTemplates({}); fetchTemplates(); }}
                                disabled={tplSaving || tplLoading}
                                className="px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold transition-colors border border-slate-200 shadow-sm"
                                title="รีเซ็ตเป็นค่าที่บันทึกไว้"
                            >
                                ↺
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium text-center">หากปล่อยว่าง ระบบจะใช้ template เริ่มต้น (แสดงเป็น placeholder สีเทาด้านบน)</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
