"use client";

// ═══════════════════════════════════════════════════════════════
// AdminFacebookTools — Facebook Marketing Tools for Admin Panel
// Similar to ADVERRABLUE — Inbox viewer, Comment extractor, etc.
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Trans } from "@/components/Trans";

// ─── Types ───────────────────────────────────────────────────
interface InboxConversation {
    id: string;
    customerName: string;
    customerId: string;
    lastMessage: string;
    lastMessageFrom: string;
    lastMessageTime: string;
    updatedTime: string;
    recentMessages: Array<{
        id: string;
        text: string;
        from: string;
        fromId: string;
        isPage: boolean;
        time: string;
    }>;
}

interface PostComment {
    id: string;
    name: string;
    userId: string;
    message: string;
    time: string;
    likeCount: number;
    phone: string | null;
    email: string | null;
}

// ─── Tool Definitions ────────────────────────────────────────
type ToolId = 'home' | 'inbox' | 'comments' | 'lucky-draw' | 'id-lookup';

const tools = [
    {
        id: 'inbox' as ToolId,
        icon: '📥',
        title: <Trans th="ดึงข้อมูล Inbox" en="Retrieve Inbox information" />,
        subtitle: <Trans th="ดูข้อความจากกล่องข้อความแฟนเพจ" en="View messages from the fan page message box." />,
        color: 'from-blue-500 to-cyan-500',
        bgColor: 'from-blue-50 to-cyan-50',
    },
    {
        id: 'comments' as ToolId,
        icon: '💬',
        title: <Trans th="ดึงคอมเมนต์โพสต์" en="Pull post comments" />,
        subtitle: <Trans th="ดึงชื่อ, ข้อความ, เบอร์, อีเมลจากคอมเมนต์" en="Extract name, message, number, email from comments" />,
        color: 'from-purple-500 to-pink-500',
        bgColor: 'from-purple-50 to-pink-50',
    },
    {
        id: 'lucky-draw' as ToolId,
        icon: '🎯',
        title: <Trans th="สุ่มจับรางวัล" en="Random prize draw" />,
        subtitle: <Trans th="สุ่มเลือกผู้โชคดีจากคอมเมนต์" en="Randomly select lucky winners from comments." />,
        color: 'from-amber-500 to-orange-500',
        bgColor: 'from-amber-50 to-orange-50',
    },
    {
        id: 'id-lookup' as ToolId,
        icon: '🔍',
        title: <Trans th="หา ID เพจ/กลุ่ม" en="Find the page/group ID" />,
        subtitle: <Trans th="ค้นหา ID จาก URL ของ Facebook" en="Find ID from Facebook URL" />,
        color: 'from-green-500 to-emerald-500',
        bgColor: 'from-green-50 to-emerald-50',
    },
];

// ═══════════════════════════════════════════════════════════════
export default function AdminFacebookTools({ onBack }: { onBack?: () => void }) {
    const [activeTool, setActiveTool] = useState<ToolId>('home');
    const { accessToken, connectedPage } = useAuthStore();

    const getAuthHeaders = useCallback((): Record<string, string> => {
        const headers: Record<string, string> = {};
        const chatToken = localStorage.getItem('chat-auth-token');
        if (chatToken) {
            headers['Authorization'] = `Bearer ${chatToken}`;
        } else if (accessToken && accessToken !== 'demo_token') {
            headers['x-fb-token'] = accessToken;
        } else {
            headers['x-admin-bypass'] = 'true';
        }
        if (connectedPage) {
            headers['x-page-id'] = connectedPage.id;
            headers['x-page-token'] = connectedPage.accessToken;
        }
 
        return headers;
    }, [accessToken, connectedPage]);

    if (activeTool !== 'home') {
        return (
            <div className="p-6 max-w-6xl mx-auto">
                {/* Back button */}
                <button
                    onClick={() => setActiveTool('home')}
                    className="mb-4 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium"
                >
                    <span>←</span> <Trans th="กลับไปหน้าเครื่องมือ" en="Return to the tools page" />
                                    </button>

                {activeTool === 'inbox' && <InboxTool getAuthHeaders={getAuthHeaders} />}
                {activeTool === 'comments' && <CommentsTool getAuthHeaders={getAuthHeaders} />}
                {activeTool === 'lucky-draw' && <LuckyDrawTool getAuthHeaders={getAuthHeaders} />}
                {activeTool === 'id-lookup' && <IdLookupTool />}
            </div>
        );
    }

    // ─── Home: Tool Cards Grid ───────────────────────────────────
    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Back to SalesTools button */}
            {onBack && (
                <button onClick={onBack} className="mb-4 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium group">
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> <Trans th="กลับไปเครื่องมือเพิ่มยอดขาย" en="Return to sales tools" />
                                    </button>
            )}
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                        <span className="text-3xl">🛠️</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Facebook Tools</h1>
                        <p className="text-gray-500 text-sm">{<Trans th="เครื่องมือการตลาดสำหรับ Facebook" en="Marketing tools for Facebook" />}</p>
                    </div>
                </div>
            </div>

            {/* Tool Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {tools.map(tool => (
                    <button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id)}
                        className={`group relative overflow-hidden bg-gradient-to-br ${tool.bgColor} border border-gray-100 rounded-2xl p-6 text-left hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1 active:scale-[0.98]`}
                    >
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center shadow-md mb-4`}>
                            <span className="text-2xl">{tool.icon}</span>
                        </div>
                        <h3 className="text-base font-bold text-gray-800 mb-1">{tool.title}</h3>
                        <p className="text-xs text-gray-500 leading-relaxed">{tool.subtitle}</p>

                        {/* Hover arrow */}
                        <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-gray-600">→</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Info Box */}
            <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                    <span className="text-xl">ℹ️</span>
                    <div>
                        <p className="text-sm font-bold text-gray-800 mb-1">{<Trans th="เกี่ยวกับ Facebook Tools" en="About Facebook Tools" />}</p>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            <Trans th="เครื่องมือเหล่านี้ใช้ Facebook Graph API อย่างเป็นทางการ
                                                        ทำงานผ่าน Page Access Token ที่ตั้งค่าไว้ในระบบ
                                                        ปลอดภัย ไม่เสี่ยงโดนแบน" en="These tools use the official Facebook Graph API.                             Works through the Page Access Token set in the system.                             Safe, no risk of being banned" />
                                                    </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// Tool 1: Inbox Viewer
// ═══════════════════════════════════════════════════════════════
function InboxTool({ getAuthHeaders }: { getAuthHeaders: () => Record<string, string> }) {
    const [conversations, setConversations] = useState<InboxConversation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | null>(null);

    const fetchInbox = async (after?: string) => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ limit: '25' });
            if (after) params.set('after', after);

            const res = await fetch(`/api/facebook-tools/inbox?${params.toString()}`, {
                headers: getAuthHeaders(),
            });
            const data = await res.json();

            if (data.success) {
                if (after) {
                    setConversations(prev => [...prev, ...data.data.conversations]);
                } else {
                    setConversations(data.data.conversations);
                }
                setNextCursor(data.data.paging?.after || null);
            } else {
                setError(data.error || 'เกิดข้อผิดพลาด');
            }
        } catch (err) {
            setError(`เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : 'Unknown'}`);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (iso: string) => {
        try {
            const d = new Date(iso);
            const now = new Date();
            const diffMs = now.getTime() - d.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours} ชม.ที่แล้ว`;
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
            return d.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' });
        } catch { return iso; }
    };

    const exportCSV = () => {
        const rows = conversations.map(c => ({
            'ชื่อลูกค้า': c.customerName,
            'PSID': c.customerId,
            'ข้อความล่าสุด': c.lastMessage.replace(/[\n\r,]/g, ' '),
            'เวลา': c.updatedTime,
        }));

        const headers = Object.keys(rows[0] || {});
        const csv = [
            headers.join(','),
            ...rows.map(r => headers.map(h => `"${r[h as keyof typeof r] || ''}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inbox_data_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
                        <span className="text-2xl">📥</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">{<Trans th="ดึงข้อมูล Inbox" en="Retrieve Inbox information" />}</h2>
                        <p className="text-sm text-gray-500">{<Trans th="ข้อความจากกล่องข้อความแฟนเพจ" en="Message from the fan page message box" />}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {conversations.length > 0 && (
                        <button
                            onClick={exportCSV}
                            className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors flex items-center gap-2"
                        >
                            📊 Export CSV
                        </button>
                    )}
                    <button
                        onClick={() => fetchInbox()}
                        disabled={loading}
                        className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${loading
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-200 hover:shadow-lg'
                            }`}
                    >
                        {loading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                                <Trans th="กำลังดึง..." en="Pulling..." />
                                                            </>
                        ) : (
                            <>{<Trans th="📥 ดึงข้อมูล Inbox" en="📥 Retrieve Inbox information" />}</>
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                    <span>❌</span> {error}
                </div>
            )}

            {conversations.length > 0 && (
                <div className="mb-3 text-sm text-gray-500">
                    <Trans th="พบ" en="meet" /> {conversations.length} <Trans th="แชท" en="Chat" />
                                    </div>
            )}

            {/* Conversation List */}
            <div className="space-y-2">
                {conversations.map(conv => (
                    <div key={conv.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                        <button
                            onClick={() => setExpandedId(expandedId === conv.id ? null : conv.id)}
                            className="w-full p-4 flex items-center gap-4 text-left"
                        >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-bold text-sm">{conv.customerName.charAt(0)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-sm text-gray-800">{conv.customerName}</span>
                                    <span className="text-[10px] text-gray-400 font-mono">PSID: {conv.customerId}</span>
                                </div>
                                <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-[10px] text-gray-400">{formatTime(conv.updatedTime)}</p>
                                <span className="text-gray-400 text-xs">{expandedId === conv.id ? '▲' : '▼'}</span>
                            </div>
                        </button>

                        {/* Expanded Messages */}
                        {expandedId === conv.id && conv.recentMessages.length > 0 && (
                            <div className="px-4 pb-4 border-t border-gray-50 bg-gray-50/50">
                                <p className="text-[10px] text-gray-400 py-2">{<Trans th="ข้อความล่าสุด" en="Latest message" />}</p>
                                <div className="space-y-2">
                                    {conv.recentMessages.map(msg => (
                                        <div key={msg.id} className={`flex ${msg.isPage ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${msg.isPage
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white border border-gray-200 text-gray-700'
                                                }`}>
                                                <p>{msg.text}</p>
                                                <p className={`text-[9px] mt-1 ${msg.isPage ? 'text-blue-100' : 'text-gray-400'}`}>
                                                    {msg.from} · {formatTime(msg.time)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Load More */}
            {nextCursor && !loading && (
                <div className="mt-4 text-center">
                    <button
                        onClick={() => fetchInbox(nextCursor)}
                        className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                    >
                        <Trans th="โหลดเพิ่มเติม..." en="Load more..." />
                                            </button>
                </div>
            )}

            {conversations.length === 0 && !loading && !error && (
                <div className="text-center py-16">
                    <span className="text-5xl mb-4 block">📥</span>
                    <p className="text-gray-500 font-medium">{<Trans th="กดปุ่ม &quot;ดึงข้อมูล Inbox&quot; เพื่อเริ่มต้น" en="Press the 'Extract Inbox Data' button to begin." />}</p>
                    <p className="text-gray-400 text-sm mt-1">{<Trans th="ข้อมูลจะถูกดึงจากกล่องข้อความแฟนเพจ" en="Information will be retrieved from the fan page message box." />}</p>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// Tool 2: Comment Extractor
// ═══════════════════════════════════════════════════════════════
function CommentsTool({ getAuthHeaders }: { getAuthHeaders: () => Record<string, string> }) {
    const [postInput, setPostInput] = useState('');
    const [comments, setComments] = useState<PostComment[]>([]);
    const [stats, setStats] = useState<{ total: number; uniqueUsers: number; withPhone: number; withEmail: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchComments = async () => {
        if (!postInput.trim()) return;
        setLoading(true);
        setError('');
        setComments([]);
        setStats(null);

        try {
            const isUrl = postInput.includes('facebook.com') || postInput.includes('fb.com');
            const params = new URLSearchParams();
            if (isUrl) params.set('postUrl', postInput.trim());
            else params.set('postId', postInput.trim());

            const res = await fetch(`/api/facebook-tools/comments?${params.toString()}`, {
                headers: getAuthHeaders(),
            });
            const data = await res.json();

            if (data.success) {
                setComments(data.data.comments);
                setStats(data.data.stats);
            } else {
                setError(data.error || 'เกิดข้อผิดพลาด');
            }
        } catch (err) {
            setError(`เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : 'Unknown'}`);
        } finally {
            setLoading(false);
        }
    };

    const exportCSV = () => {
        if (comments.length === 0) return;
        const headers = ['ชื่อ', 'User ID', 'ข้อความ', 'เบอร์โทร', 'อีเมล', 'เวลา', 'ไลค์'];
        const csv = [
            headers.join(','),
            ...comments.map(c => [
                `"${c.name}"`,
                c.userId,
                `"${c.message.replace(/[\n\r,\"]/g, ' ')}"`,
                c.phone || '',
                c.email || '',
                c.time,
                c.likeCount,
            ].join(','))
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `comments_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                    <span className="text-2xl">💬</span>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{<Trans th="ดึงคอมเมนต์โพสต์" en="Pull post comments" />}</h2>
                    <p className="text-sm text-gray-500">{<Trans th="ดึงชื่อ, ข้อความ, เบอร์โทร, อีเมลจากคอมเมนต์" en="Extract names, messages, phone numbers, and emails from comments." />}</p>
                </div>
            </div>

            {/* Input */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
                <label className="text-sm font-bold text-gray-700 mb-2 block">{<Trans th="Post ID หรือ URL ของโพสต์" en="Post ID or URL of the post" />}</label>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={postInput}
                        onChange={e => setPostInput(e.target.value)}
                        placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Paste the post URL or enter the Post ID such as 123456789..." : "วาง URL โพสต์ หรือใส่ Post ID เช่น 123456789...")}
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none"
                        onKeyDown={e => e.key === 'Enter' && fetchComments()}
                    />
                    <button
                        onClick={fetchComments}
                        disabled={loading || !postInput.trim()}
                        className={`px-6 py-3 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${loading || !postInput.trim()
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md shadow-purple-200 hover:shadow-lg'
                            }`}
                    >
                        {loading ? (
                            <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                        ) : '💬'} <Trans th="ดึงคอมเมนต์" en="pull comments" />
                                            </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                    <span>❌</span> {error}
                </div>
            )}

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-4 gap-3 mb-6">
                    {[
                        { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "All comments" : "คอมเมนต์ทั้งหมด"), value: stats.total, icon: '💬', color: 'bg-purple-50 text-purple-700' },
                        { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Unique people" : "คนไม่ซ้ำ"), value: stats.uniqueUsers, icon: '👥', color: 'bg-blue-50 text-blue-700' },
                        { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "There is a phone number." : "มีเบอร์โทร"), value: stats.withPhone, icon: '📞', color: 'bg-green-50 text-green-700' },
                        { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "have email" : "มีอีเมล"), value: stats.withEmail, icon: '📧', color: 'bg-amber-50 text-amber-700' },
                    ].map(s => (
                        <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
                            <span className="text-2xl block mb-1">{s.icon}</span>
                            <p className="text-2xl font-bold">{s.value}</p>
                            <p className="text-[10px] opacity-70">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Export */}
            {comments.length > 0 && (
                <div className="flex justify-end mb-3">
                    <button onClick={exportCSV} className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors flex items-center gap-2">
                        📊 Export CSV
                    </button>
                </div>
            )}

            {/* Comments Table */}
            {comments.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left font-bold text-gray-600">#</th>
                                    <th className="px-4 py-3 text-left font-bold text-gray-600">{<Trans th="ชื่อ" en="name" />}</th>
                                    <th className="px-4 py-3 text-left font-bold text-gray-600">{<Trans th="ข้อความ" en="message" />}</th>
                                    <th className="px-4 py-3 text-left font-bold text-gray-600">{<Trans th="📞 เบอร์" en="📞 Number" />}</th>
                                    <th className="px-4 py-3 text-left font-bold text-gray-600">{<Trans th="📧 อีเมล" en="📧 Email" />}</th>
                                    <th className="px-4 py-3 text-center font-bold text-gray-600">👍</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comments.map((c, i) => (
                                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                                        <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{c.name}</td>
                                        <td className="px-4 py-3 text-gray-600 max-w-[300px] truncate">{c.message}</td>
                                        <td className="px-4 py-3">
                                            {c.phone ? (
                                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs font-mono">{c.phone}</span>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {c.email ? (
                                                <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-lg text-xs">{c.email}</span>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-500">{c.likeCount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {comments.length === 0 && !loading && !error && (
                <div className="text-center py-16">
                    <span className="text-5xl mb-4 block">💬</span>
                    <p className="text-gray-500 font-medium">{<Trans th="ใส่ Post ID หรือ URL แล้วกดดึงคอมเมนต์" en="Enter Post ID or URL and press pull comments." />}</p>
                    <p className="text-gray-400 text-sm mt-1">{<Trans th="ระบบจะดึงข้อมูลคอมเมนต์พร้อมเบอร์โทรและอีเมลอัตโนมัติ" en="The system will automatically retrieve comments with phone numbers and emails." />}</p>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// Tool 3: Lucky Draw (Comment Picker)
// ═══════════════════════════════════════════════════════════════
function LuckyDrawTool({ getAuthHeaders }: { getAuthHeaders: () => Record<string, string> }) {
    const [postInput, setPostInput] = useState('');
    const [comments, setComments] = useState<PostComment[]>([]);
    const [winners, setWinners] = useState<PostComment[]>([]);
    const [winnerCount, setWinnerCount] = useState(1);
    const [noDuplicate, setNoDuplicate] = useState(true);
    const [keyword, setKeyword] = useState('');
    const [loading, setLoading] = useState(false);
    const [spinning, setSpinning] = useState(false);
    const [error, setError] = useState('');

    const fetchComments = async () => {
        if (!postInput.trim()) return;
        setLoading(true);
        setError('');
        setComments([]);
        setWinners([]);

        try {
            const isUrl = postInput.includes('facebook.com') || postInput.includes('fb.com');
            const params = new URLSearchParams({ limit: '50' });
            if (isUrl) params.set('postUrl', postInput.trim());
            else params.set('postId', postInput.trim());

            const res = await fetch(`/api/facebook-tools/comments?${params.toString()}`, {
                headers: getAuthHeaders(),
            });
            const data = await res.json();

            if (data.success) {
                setComments(data.data.comments);
            } else {
                setError(data.error || 'เกิดข้อผิดพลาด');
            }
        } catch (err) {
            setError(`เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : 'Unknown'}`);
        } finally {
            setLoading(false);
        }
    };

    const drawWinners = () => {
        let pool = [...comments];

        // Filter by keyword if set
        if (keyword.trim()) {
            pool = pool.filter(c => c.message.toLowerCase().includes(keyword.toLowerCase()));
        }

        // Remove duplicates if checked
        if (noDuplicate) {
            const seen = new Set<string>();
            pool = pool.filter(c => {
                if (seen.has(c.userId)) return false;
                seen.add(c.userId);
                return true;
            });
        }

        if (pool.length === 0) {
            setError('ไม่มีคอมเมนต์ที่ตรงเงื่อนไข');
            return;
        }

        setSpinning(true);
        setWinners([]);

        // Simulate spinning animation
        setTimeout(() => {
            const count = Math.min(winnerCount, pool.length);
            const shuffled = pool.sort(() => Math.random() - 0.5);
            setWinners(shuffled.slice(0, count));
            setSpinning(false);
        }, 2000);
    };

    return (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
                    <span className="text-2xl">🎯</span>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{<Trans th="สุ่มจับรางวัล" en="Random prize draw" />}</h2>
                    <p className="text-sm text-gray-500">{<Trans th="สุ่มเลือกผู้โชคดีจากคอมเมนต์" en="Randomly select lucky winners from comments." />}</p>
                </div>
            </div>

            {/* Step 1: Input */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
                <label className="text-sm font-bold text-gray-700 mb-2 block">{<Trans th="1️⃣ ใส่ Post ID หรือ URL" en="1️⃣ Enter Post ID or URL." />}</label>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={postInput}
                        onChange={e => setPostInput(e.target.value)}
                        placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Paste the post URL or enter the Post ID..." : "วาง URL โพสต์ หรือใส่ Post ID...")}
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                    />
                    <button
                        onClick={fetchComments}
                        disabled={loading || !postInput.trim()}
                        className={`px-6 py-3 rounded-xl font-medium text-sm ${loading || !postInput.trim()
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                            }`}
                    >
                        {loading ? 'กำลังดึง...' : '📥 ดึงคอมเมนต์'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                    <span>❌</span> {error}
                </div>
            )}

            {/* Step 2: Settings */}
            {comments.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
                    <label className="text-sm font-bold text-gray-700 mb-3 block"><Trans th="2️⃣ ตั้งค่าการจับรางวัล (คอมเมนต์" en="2️⃣ Set up the prize draw (comments" /> {comments.length} {<Trans th="รายการ)" en="list)" />}</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">{<Trans th="จำนวนผู้โชคดี" en="Number of lucky winners" />}</label>
                            <input
                                type="number"
                                value={winnerCount}
                                onChange={e => setWinnerCount(Math.max(1, parseInt(e.target.value) || 1))}
                                min={1}
                                max={100}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">{<Trans th="คำที่ต้องมีในคอมเมนต์ (ถ้ามี)" en="Words that must be included in comments (if any)" />}</label>
                            <input
                                type="text"
                                value={keyword}
                                onChange={e => setKeyword(e.target.value)}
                                placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "For example, interested, want..." : "เช่น สนใจ, ต้องการ...")}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                            />
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={noDuplicate}
                                    onChange={e => setNoDuplicate(e.target.checked)}
                                    className="w-4 h-4 rounded text-amber-500"
                                />
                                <span className="text-sm text-gray-700">{<Trans th="ไม่ซ้ำคน (1 คน = 1 สิทธิ์)" en="Not duplicate person (1 person = 1 right)" />}</span>
                            </label>
                        </div>
                    </div>
                    <button
                        onClick={drawWinners}
                        disabled={spinning}
                        className={`mt-4 w-full py-3 rounded-xl font-bold text-base transition-all ${spinning
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed animate-pulse'
                                : 'bg-gradient-to-r from-amber-500 to-red-500 text-white shadow-lg shadow-amber-200 hover:shadow-xl active:scale-[0.99]'
                            }`}
                    >
                        {spinning ? '🎰 กำลังสุ่ม...' : '🎯 สุ่มจับรางวัล!'}
                    </button>
                </div>
            )}

            {/* Spinning Animation */}
            {spinning && (
                <div className="text-center py-12">
                    <div className="text-7xl animate-bounce mb-4">🎰</div>
                    <p className="text-xl font-bold text-amber-600 animate-pulse">{<Trans th="กำลังสุ่มผู้โชคดี..." en="Random lucky winner..." />}</p>
                </div>
            )}

            {/* Winners */}
            {winners.length > 0 && !spinning && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200 p-6">
                    <h3 className="text-center text-xl font-bold text-amber-800 mb-4">{<Trans th="🎉 ผู้โชคดี!" en="🎉 Lucky person!" />}</h3>
                    <div className="space-y-3">
                        {winners.map((w, i) => (
                            <div key={w.id} className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold shadow-md">
                                    {i + 1}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-800">{w.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">&quot;{w.message}&quot;</p>
                                </div>
                                <span className="text-xs text-gray-400 font-mono">ID: {w.userId}</span>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={drawWinners}
                        className="mt-4 w-full py-2.5 bg-white border-2 border-amber-300 text-amber-700 rounded-xl font-bold text-sm hover:bg-amber-50 transition-colors"
                    >
                        <Trans th="🔄 สุ่มใหม่อีกครั้ง" en="🔄 Random again" />
                                            </button>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// Tool 4: ID Lookup
// ═══════════════════════════════════════════════════════════════
function IdLookupTool() {
    const [url, setUrl] = useState('');
    const [result, setResult] = useState<{ type: string; id: string; name?: string } | null>(null);
    const [error, setError] = useState('');

    const lookupId = () => {
        if (!url.trim()) return;
        setError('');
        setResult(null);

        try {
            const fbUrl = url.trim();

            // Page: facebook.com/pagename or facebook.com/pages/xxx/123
            const pageIdMatch = fbUrl.match(/facebook\.com\/pages\/[^/]+\/(\d+)/);
            if (pageIdMatch) {
                setResult({ type: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Page" : "เพจ (Page)"), id: pageIdMatch[1] });
                return;
            }

            // Group: facebook.com/groups/123
            const groupMatch = fbUrl.match(/facebook\.com\/groups\/(\d+)/);
            if (groupMatch) {
                setResult({ type: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Group" : "กลุ่ม (Group)"), id: groupMatch[1] });
                return;
            }

            // Profile: facebook.com/profile.php?id=123
            const profileMatch = fbUrl.match(/profile\.php\?id=(\d+)/);
            if (profileMatch) {
                setResult({ type: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Profile" : "โปรไฟล์ (Profile)"), id: profileMatch[1] });
                return;
            }

            // Post: /posts/123 or /permalink/123
            const postMatch = fbUrl.match(/(?:\/posts\/|permalink\/)(\d+)/);
            if (postMatch) {
                setResult({ type: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Post (Post)" : "โพสต์ (Post)"), id: postMatch[1] });
                return;
            }

            // Story: story_fbid=123
            const storyMatch = fbUrl.match(/story_fbid=(\d+)/);
            if (storyMatch) {
                setResult({ type: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Post (Post)" : "โพสต์ (Post)"), id: storyMatch[1] });
                return;
            }

            // Photo: /photos/xxx/123
            const photoMatch = fbUrl.match(/\/photos\/[^/]+\/(\d+)/);
            if (photoMatch) {
                setResult({ type: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Picture (Photo)" : "รูปภาพ (Photo)"), id: photoMatch[1] });
                return;
            }

            // Video: /videos/123
            const videoMatch = fbUrl.match(/\/videos\/(\d+)/);
            if (videoMatch) {
                setResult({ type: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Video" : "วิดีโอ (Video)"), id: videoMatch[1] });
                return;
            }

            // Generic numeric ID from URL
            const numericMatch = fbUrl.match(/\/(\d{8,})/);
            if (numericMatch) {
                setResult({ type: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "ID (type unknown)" : "ID (ไม่ทราบประเภท)"), id: numericMatch[1] });
                return;
            }

            // Username/slug
            const slugMatch = fbUrl.match(/facebook\.com\/([a-zA-Z0-9._-]+)\/?$/);
            if (slugMatch && !['groups', 'pages', 'profile.php', 'watch', 'events'].includes(slugMatch[1])) {
                setResult({ type: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Username (Username)" : "ชื่อผู้ใช้ (Username)"), id: slugMatch[1], name: slugMatch[1] });
                return;
            }

            // If it's just a number
            if (/^\d+$/.test(fbUrl)) {
                setResult({ type: 'ID', id: fbUrl });
                return;
            }

            setError('ไม่สามารถหา ID จาก URL นี้ได้ ลองใส่ URL ของ Facebook ให้ถูกต้อง');
        } catch {
            setError('เกิดข้อผิดพลาดในการวิเคราะห์ URL');
        }
    };

    const copyId = () => {
        if (result) {
            navigator.clipboard.writeText(result.id);
        }
    };

    return (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-md">
                    <span className="text-2xl">🔍</span>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{<Trans th="หา ID เพจ/กลุ่ม/โพสต์" en="Find the page/group/post ID." />}</h2>
                    <p className="text-sm text-gray-500">{<Trans th="ค้นหา Facebook ID จาก URL" en="Find Facebook ID from URL" />}</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
                <label className="text-sm font-bold text-gray-700 mb-2 block">{<Trans th="วาง URL ของ Facebook" en="Paste the Facebook URL" />}</label>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="https://www.facebook.com/..."
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-200 focus:border-green-400 outline-none"
                        onKeyDown={e => e.key === 'Enter' && lookupId()}
                    />
                    <button
                        onClick={lookupId}
                        disabled={!url.trim()}
                        className={`px-6 py-3 rounded-xl font-medium text-sm ${!url.trim()
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md'
                            }`}
                    >
                        <Trans th="🔍 ค้นหา ID" en="🔍 Search ID" />
                                            </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                    <span>❌</span> {error}
                </div>
            )}

            {result && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 p-6 text-center">
                    <p className="text-sm text-green-600 font-medium mb-2">{result.type}</p>
                    <div className="flex items-center justify-center gap-3">
                        <p className="text-3xl font-bold text-gray-800 font-mono">{result.id}</p>
                        <button
                            onClick={copyId}
                            className="px-4 py-2 bg-white border border-green-200 rounded-xl text-sm text-green-700 hover:bg-green-50 transition-colors"
                        >
                            <Trans th="📋 คัดลอก" en="📋 Copy" />
                                                    </button>
                    </div>
                    {result.name && (
                        <p className="text-sm text-gray-500 mt-2"><Trans th="ชื่อ:" en="name:" /> {result.name}</p>
                    )}
                </div>
            )}

            {!result && !error && (
                <div className="text-center py-12">
                    <span className="text-5xl mb-4 block">🔍</span>
                    <p className="text-gray-500 font-medium">{<Trans th="วาง URL แล้วกดค้นหา ID" en="Paste the URL and press search ID." />}</p>
                    <div className="mt-4 text-xs text-gray-400 space-y-1">
                        <p>{<Trans th="รองรับ: เพจ, กลุ่ม, โปรไฟล์, โพสต์, รูปภาพ, วิดีโอ" en="Supported: Pages, Groups, Profiles, Posts, Photos, Videos" />}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
