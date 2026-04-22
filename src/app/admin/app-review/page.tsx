"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Facebook, CheckCircle, AlertTriangle, Send, RefreshCw, Zap, BarChart3, ShieldCheck, Server, ArrowRight, ExternalLink } from "lucide-react";

const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "";
const FB_SCOPE = "pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement,marketing_messages_messenger,ads_management";

// Caption component with English text
function Caption({ step, title, description }: { step: number; title: string; description: string }) {
    return (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-5 mb-4 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                    {step}
                </span>
                <h3 className="text-lg font-bold">{title}</h3>
            </div>
            <p className="text-blue-100 text-sm leading-relaxed ml-11">{description}</p>
        </div>
    );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {ok ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {label}
        </span>
    );
}

export default function AppReviewDemoPage() {
    const { isLoggedIn, userName, accessToken } = useAuthStore();
    const [triggerResult, setTriggerResult] = useState<Record<string, any>>({});
    const [triggerLoading, setTriggerLoading] = useState("");
    const [capiResult, setCapiResult] = useState<any>(null);
    const [capiLoading, setCapiLoading] = useState(false);
    const [commentsResult, setCommentsResult] = useState<any>(null);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [testPostUrl, setTestPostUrl] = useState("");

    const redirectUri = typeof window !== 'undefined'
        ? `${window.location.origin}/admin/auth/callback`
        : `${process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'}/admin/auth/callback`;

    const loginUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${FB_SCOPE}&response_type=token`;

    const triggerPermission = async (action: string) => {
        const psid = prompt("Enter the recipient PSID (Facebook Page-Scoped User ID):");
        if (!psid) return;
        setTriggerLoading(action);
        try {
            const res = await fetch('/api/admin/test-messenger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, psid }),
            });
            const data = await res.json();
            setTriggerResult(prev => ({ ...prev, [action]: data }));
        } catch (err) {
            setTriggerResult(prev => ({ ...prev, [action]: { success: false, message: String(err) } }));
        }
        setTriggerLoading("");
    };

    const testCAPI = async () => {
        setCapiLoading(true);
        try {
            const res = await fetch('/api/admin/test-capi', { method: 'POST' });
            setCapiResult(await res.json());
        } catch (err) {
            setCapiResult({ success: false, message: String(err) });
        }
        setCapiLoading(false);
    };

    const testComments = async () => {
        if (!testPostUrl) return;
        setCommentsLoading(true);
        try {
            const res = await fetch(`/api/facebook-tools/comments?postUrl=${encodeURIComponent(testPostUrl)}`);
            setCommentsResult(await res.json());
        } catch (err) {
            setCommentsResult({ success: false, message: String(err) });
        }
        setCommentsLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">App Review — End-to-End Demo</h1>
                        <p className="text-xs text-gray-500">App ID: {FACEBOOK_APP_ID} | E-Commerce SaaS Platform</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <StatusBadge ok={isLoggedIn} label={isLoggedIn ? `Logged in as ${userName}` : "Not logged in"} />
                        {isLoggedIn && (
                            <button 
                                onClick={() => {
                                    useAuthStore.getState().logout();
                                    window.location.reload();
                                }}
                                className="text-xs text-red-500 hover:text-red-700 underline"
                            >
                                Logout
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

                {/* ═══ INTRO ═══ */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">🏪 E-Commerce SaaS Platform</h2>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                        This application is an e-commerce platform integrated with Facebook Messenger. 
                        It enables business owners to manage their online store, process orders, and communicate 
                        with customers through Facebook Messenger — including sending marketing promotions 
                        and tracking ad conversions.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                            <p className="text-xs font-bold text-purple-700">Permission #1</p>
                            <p className="text-sm font-medium text-purple-900">marketing_messages_messenger</p>
                            <p className="text-[11px] text-purple-600 mt-1">Send marketing opt-in notifications & promotional messages to Messenger contacts</p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                            <p className="text-xs font-bold text-blue-700">Permission #2</p>
                            <p className="text-sm font-medium text-blue-900">ads_management</p>
                            <p className="text-[11px] text-blue-600 mt-1">Send purchase conversion events to Meta Ads Manager via Conversions API (CAPI)</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                            <p className="text-xs font-bold text-emerald-700">Permission #3</p>
                            <p className="text-sm font-medium text-emerald-900">pages_read_engagement</p>
                            <p className="text-[11px] text-emerald-600 mt-1">Read comments on Page posts to extract customer contact details and leads</p>
                        </div>
                    </div>
                </div>

                {/* ═══ STEP 1: LOGIN ═══ */}
                <Caption
                    step={1}
                    title="Facebook OAuth Login"
                    description="The admin authenticates via Facebook OAuth. The login dialog requests both marketing_messages_messenger and ads_management permissions. After granting access, the system obtains a User Access Token."
                />
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    {!isLoggedIn ? (
                        <div className="text-center">
                            <p className="text-sm text-gray-600 mb-4">Click the button below to start the Facebook OAuth login flow.</p>
                            <a
                                href={loginUrl}
                                onClick={() => localStorage.setItem('auth_redirect', '/admin/app-review')}
                                className="inline-flex items-center gap-3 bg-[#1877F2] hover:bg-[#166FE5] text-white px-8 py-3.5 rounded-xl font-medium text-sm shadow-lg shadow-blue-200 transition-all hover:shadow-xl"
                            >
                                <Facebook className="w-5 h-5" />
                                Login with Facebook
                            </a>
                            <p className="text-xs text-gray-400 mt-3">
                                Requested scope: <code className="bg-gray-100 px-1 rounded text-[10px]">{FB_SCOPE}</code>
                            </p>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                            <div>
                                <p className="text-green-700 font-bold">✅ Successfully authenticated as {userName}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Access Token: <code className="bg-gray-100 px-1 rounded">{accessToken?.substring(0, 20)}...</code>
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ═══ STEP 2: SERVER TOKEN FLOW ═══ */}
                <Caption
                    step={2}
                    title="Server-to-Server Token Management"
                    description="After Facebook login, the User Access Token is sent to our backend. The backend exchanges it for a Long-Lived Token, retrieves Page Access Tokens via /me/accounts, and stores them securely in the database."
                />
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 flex-wrap justify-center">
                        {[
                            { icon: "👤", label: "User Token", sub: "From OAuth" },
                            { icon: "→", label: "", sub: "" },
                            { icon: <Server className="w-5 h-5" />, label: "Backend API", sub: "/api/auth/facebook/login" },
                            { icon: "→", label: "", sub: "" },
                            { icon: "🔑", label: "Long-Lived Token", sub: "Exchange via Graph API" },
                            { icon: "→", label: "", sub: "" },
                            { icon: "📄", label: "Page Access Token", sub: "/me/accounts" },
                            { icon: "→", label: "", sub: "" },
                            { icon: "💾", label: "Database", sub: "Stored in channels table" },
                        ].map((item, i) => (
                            item.label === "" ? (
                                <ArrowRight key={i} className="w-5 h-5 text-gray-300 flex-shrink-0" />
                            ) : (
                                <div key={i} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200 min-w-[100px]">
                                    <div className="text-2xl mb-1">{typeof item.icon === 'string' ? item.icon : item.icon}</div>
                                    <p className="text-xs font-bold text-gray-800">{item.label}</p>
                                    <p className="text-[10px] text-gray-500">{item.sub}</p>
                                </div>
                            )
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-4">
                        The Page Access Token is used for all subsequent Messenger API calls and Conversions API events. 
                        It is never exposed to the client — all API calls are made server-side.
                    </p>
                </div>

                {/* ═══ PERMISSION 1: marketing_messages_messenger ═══ */}
                <div className="border-t-4 border-purple-500 pt-6">
                    <h2 className="text-xl font-bold text-purple-900 mb-1 flex items-center gap-2">
                        📢 Permission: marketing_messages_messenger
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">End-to-end demonstration of marketing message capabilities</p>
                </div>

                {/* STEP 3: Broadcast */}
                <Caption
                    step={3}
                    title="Broadcast Center — Send Marketing Messages"
                    description="The admin navigates to the Broadcast Center to send promotional messages to customers who previously messaged the Facebook Page. Contacts are synced from Facebook conversations (PSIDs)."
                />
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-gray-700">
                            <strong>Broadcast Center</strong> is located in the Admin Dashboard sidebar under "📢 Broadcast".
                            It supports audience selection, message composition with variables, image attachments, and Message Tags.
                        </p>
                        <a href="/admin" className="flex items-center gap-1.5 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-medium transition-colors shadow-md">
                            Open Admin Dashboard <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        {[
                            { icon: <RefreshCw className="w-6 h-6" />, title: "1. Sync Contacts", desc: "Fetch PSIDs from Page conversations via Graph API" },
                            { icon: <Send className="w-6 h-6" />, title: "2. Compose & Send", desc: "Write promotional messages with personalization variables" },
                            { icon: <BarChart3 className="w-6 h-6" />, title: "3. Track Results", desc: "Monitor delivery status and success rates" },
                        ].map((item, i) => (
                            <div key={i} className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                                <div className="text-purple-600 mx-auto mb-2 flex justify-center">{item.icon}</div>
                                <p className="text-xs font-bold text-purple-800">{item.title}</p>
                                <p className="text-[10px] text-purple-600 mt-1">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* STEP 4: Marketing Opt-in Trigger */}
                <Caption
                    step={4}
                    title="Marketing Opt-in Template (notification_messages)"
                    description="This is the core use of marketing_messages_messenger. The system sends a notification_messages opt-in template that allows customers to subscribe to future marketing notifications from the business."
                />
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                        <p className="text-xs text-purple-700 mb-2"><strong>What this button does:</strong></p>
                        <ul className="text-[11px] text-purple-600 space-y-1 list-disc ml-4">
                            <li>Calls <code className="bg-purple-100 px-1 rounded">POST /api/admin/test-messenger</code> with action <code className="bg-purple-100 px-1 rounded">trigger_marketing_messages</code></li>
                            <li>Backend sends a <code className="bg-purple-100 px-1 rounded">notification_messages</code> template to the specified PSID</li>
                            <li>Customer receives an opt-in card on Messenger with a "Get Updates" button</li>
                        </ul>
                    </div>
                    <button
                        onClick={() => triggerPermission('trigger_marketing_messages')}
                        disabled={triggerLoading === 'trigger_marketing_messages'}
                        className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Zap className="w-4 h-4" />
                        {triggerLoading === 'trigger_marketing_messages' ? 'Sending...' : '📢 Trigger Marketing Opt-in Template'}
                    </button>
                    {triggerResult['trigger_marketing_messages'] && (
                        <div className={`p-3 rounded-xl text-sm ${triggerResult['trigger_marketing_messages'].success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {triggerResult['trigger_marketing_messages'].success ? '✅' : '❌'} {triggerResult['trigger_marketing_messages'].message || JSON.stringify(triggerResult['trigger_marketing_messages'])}
                        </div>
                    )}
                </div>

                {/* STEP 5: Human Agent */}
                <Caption
                    step={5}
                    title="Human Agent Message (HUMAN_AGENT tag)"
                    description="Send a follow-up message using the HUMAN_AGENT message tag. This allows live agents to respond to customer inquiries within 7 days, outside the standard 24-hour messaging window."
                />
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                    <button
                        onClick={() => triggerPermission('trigger_human_agent')}
                        disabled={triggerLoading === 'trigger_human_agent'}
                        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Send className="w-4 h-4" />
                        {triggerLoading === 'trigger_human_agent' ? 'Sending...' : '🧑‍💼 Send Human Agent Message'}
                    </button>
                    {triggerResult['trigger_human_agent'] && (
                        <div className={`p-3 rounded-xl text-sm ${triggerResult['trigger_human_agent'].success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {triggerResult['trigger_human_agent'].success ? '✅' : '❌'} {triggerResult['trigger_human_agent'].message || JSON.stringify(triggerResult['trigger_human_agent'])}
                        </div>
                    )}
                </div>

                {/* ═══ PERMISSION 2: ads_management ═══ */}
                <div className="border-t-4 border-blue-500 pt-6">
                    <h2 className="text-xl font-bold text-blue-900 mb-1 flex items-center gap-2">
                        📊 Permission: ads_management
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">End-to-end demonstration of Conversions API integration</p>
                </div>

                {/* STEP 6: CAPI Flow */}
                <Caption
                    step={6}
                    title="Meta Conversions API (CAPI) — Purchase Event Tracking"
                    description="When a customer completes a purchase, the backend automatically sends a 'Purchase' conversion event to Meta Ads Manager via the Conversions API. This requires the ads_management permission."
                />
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                    {/* Flow diagram */}
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                        <p className="text-xs text-blue-700 font-bold mb-3">How Purchase Tracking Works:</p>
                        <div className="flex items-center gap-2 flex-wrap justify-center text-center">
                            {[
                                { icon: "🛒", label: "Customer\nPlaces Order" },
                                { icon: "⚙️", label: "Backend\nProcesses Order" },
                                { icon: "📊", label: "CAPI Sends\nPurchase Event" },
                                { icon: "📈", label: "Meta Ads Manager\nReceives Data" },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    {i > 0 && <ArrowRight className="w-4 h-4 text-blue-300 flex-shrink-0" />}
                                    <div className="bg-white rounded-lg p-2.5 border border-blue-200 min-w-[90px]">
                                        <span className="text-xl">{item.icon}</span>
                                        <p className="text-[10px] text-blue-700 font-medium mt-1 whitespace-pre-line">{item.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Technical details */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <p className="text-xs text-gray-700 mb-2"><strong>Technical Implementation:</strong></p>
                        <ul className="text-[11px] text-gray-600 space-y-1 list-disc ml-4">
                            <li>API Endpoint: <code className="bg-gray-200 px-1 rounded">POST https://graph.facebook.com/v19.0/&#123;PIXEL_ID&#125;/events</code></li>
                            <li>Event: <code className="bg-gray-200 px-1 rounded">Purchase</code> with order value in THB</li>
                            <li>User data is hashed with SHA-256 for privacy compliance</li>
                            <li>Admin can enable/disable this in Payment Settings → "Send store purchases to Meta Ads Manager"</li>
                        </ul>
                    </div>

                    {/* Test button */}
                    <button
                        onClick={testCAPI}
                        disabled={capiLoading}
                        className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <BarChart3 className="w-4 h-4" />
                        {capiLoading ? 'Sending test event...' : '🧪 Test Send Purchase Event to Meta Ads Manager'}
                    </button>
                    {capiResult && (
                        <div className={`p-3 rounded-xl text-sm ${capiResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {capiResult.success ? '✅' : '❌'} {capiResult.message || capiResult.error || JSON.stringify(capiResult)}
                        </div>
                    )}
                </div>

                {/* ═══ PERMISSION 3: pages_read_engagement ═══ */}
                <div className="border-t-4 border-emerald-500 pt-6">
                    <h2 className="text-xl font-bold text-emerald-900 mb-1 flex items-center gap-2">
                        💬 Permission: pages_read_engagement
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">End-to-end demonstration of fetching post comments</p>
                </div>

                {/* STEP 7: Read Comments */}
                <Caption
                    step={7}
                    title="Read Page Post Comments — Lead Extraction"
                    description="The admin uses the Facebook Tools suite to paste a post URL. The backend uses the Page Access Token to fetch comments (requires pages_read_engagement) and automatically extracts phone numbers and emails for lead generation."
                />
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                    {/* Technical details */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <p className="text-xs text-gray-700 mb-2"><strong>Technical Implementation:</strong></p>
                        <ul className="text-[11px] text-gray-600 space-y-1 list-disc ml-4">
                            <li>API Endpoint: <code className="bg-gray-200 px-1 rounded">GET https://graph.facebook.com/v19.0/&#123;PAGE_ID&#125;_&#123;POST_ID&#125;/comments</code></li>
                            <li>Fields: <code className="bg-gray-200 px-1 rounded">id, message, from, created_time, like_count</code></li>
                            <li>The backend parses <code className="bg-gray-200 px-1 rounded">message</code> with Regex to find phone numbers and emails.</li>
                        </ul>
                    </div>

                    {/* Test input */}
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Paste a Facebook Post URL from your Page..." 
                            value={testPostUrl}
                            onChange={(e) => setTestPostUrl(e.target.value)}
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                        />
                        <button
                            onClick={testComments}
                            disabled={commentsLoading || !testPostUrl}
                            className="py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            <RefreshCw className={`w-4 h-4 ${commentsLoading ? 'animate-spin' : ''}`} />
                            {commentsLoading ? 'Fetching...' : 'Fetch Comments'}
                        </button>
                    </div>

                    {commentsResult && (
                        <div className={`p-4 rounded-xl text-sm overflow-auto max-h-60 ${commentsResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {commentsResult.success ? (
                                <div>
                                    <p className="font-bold mb-2">✅ Successfully fetched comments!</p>
                                    <p className="text-xs mb-2">Total Comments: {commentsResult.data?.stats?.total} | Unique Users: {commentsResult.data?.stats?.uniqueUsers} | With Phone: {commentsResult.data?.stats?.withPhone}</p>
                                    <div className="space-y-2 mt-3">
                                        {commentsResult.data?.comments?.slice(0, 3).map((c: any, i: number) => (
                                            <div key={i} className="bg-white p-2 rounded border border-green-100 text-xs text-gray-700">
                                                <strong>{c.name}:</strong> {c.message}
                                                {(c.phone || c.email) && (
                                                    <div className="text-[10px] mt-1 text-emerald-600 flex gap-2">
                                                        {c.phone && <span>📞 {c.phone}</span>}
                                                        {c.email && <span>📧 {c.email}</span>}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {commentsResult.data?.comments?.length > 3 && (
                                            <p className="text-xs text-gray-500 italic">...and {commentsResult.data.comments.length - 3} more comments</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="font-bold">❌ Error</p>
                                    <p className="text-xs mt-1">{commentsResult.message || commentsResult.error || JSON.stringify(commentsResult)}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ═══ SUMMARY ═══ */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl p-6 shadow-lg">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6" />
                        Summary — End-to-End Experience
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="font-bold text-green-100 text-xs mb-2">marketing_messages_messenger</p>
                            <ul className="text-sm space-y-1.5">
                                <li>✅ Facebook OAuth with permission granted</li>
                                <li>✅ Page Token obtained via /me/accounts</li>
                                <li>✅ Contacts synced from conversations</li>
                                <li>✅ Broadcast messages sent to audience</li>
                                <li>✅ Marketing opt-in template triggered</li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-bold text-green-100 text-xs mb-2">ads_management</p>
                            <ul className="text-sm space-y-1.5">
                                <li>✅ Facebook OAuth with permission granted</li>
                                <li>✅ CAPI integration in order pipeline</li>
                                <li>✅ Purchase events sent on checkout</li>
                                <li>✅ SHA-256 hashed user data for privacy</li>
                                <li>✅ Toggle on/off in Payment Settings</li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-bold text-green-100 text-xs mb-2">pages_read_engagement</p>
                            <ul className="text-sm space-y-1.5">
                                <li>✅ Facebook OAuth with permission granted</li>
                                <li>✅ Fetch comments from Page posts</li>
                                <li>✅ Regex parsing for lead extraction</li>
                                <li>✅ Admin bypass mode supported</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <p className="text-center text-xs text-gray-400 pb-8">
                    End of App Review Demonstration — E-Commerce SaaS Platform
                </p>
            </div>
        </div>
    );
}
