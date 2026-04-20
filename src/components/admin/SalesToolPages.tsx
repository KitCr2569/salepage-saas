"use client";

import { useState, useEffect } from "react";
import { Trans } from "@/components/Trans";

// ─── Types ───────────────────────────────────────────────────
interface CustomerData {
    id: string;
    name: string;
    avatar: string | null;
    totalMessages: number;
    lastActive: string;
    platform: string;
    firstContact: string;
    tags: string[];
}

interface RetargetGroup {
    id: string;
    name: string;
    filter: string;
    contactCount: number;
    lastSent: string | null;
}

interface ScheduledPost {
    id: string;
    content: string;
    scheduledAt: string;
    status: 'pending' | 'published' | 'failed';
    platform: string;
}

interface EmailCampaign {
    id: string;
    subject: string;
    sentCount: number;
    openRate: number;
    status: 'draft' | 'sent' | 'scheduled';
    createdAt: string;
}

interface CrossSellRule {
    id: string;
    triggerProduct: string;
    suggestProduct: string;
    isActive: boolean;
    conversions: number;
}

// ═══════════════════════════════════════════════════════════════
// 1. วิเคราะห์ลูกค้า (Customer Analysis)
// ═══════════════════════════════════════════════════════════════
export function CustomerAnalysis({ onBack }: { onBack?: () => void }) {
    const [customers, setCustomers] = useState<CustomerData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'messages' | 'recent'>('recent');

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('chat-auth-token');
            const res = await fetch('/api/chat/inbox?limit=100', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                const mapped: CustomerData[] = data.data.map((item: any) => ({
                    id: item.id,
                    name: item.contactName || 'ไม่ทราบชื่อ',
                    avatar: item.contactAvatar,
                    totalMessages: item.unreadCount || 0,
                    lastActive: item.lastMessageAt || new Date().toISOString(),
                    platform: item.channelType || 'MESSENGER',
                    firstContact: item.lastMessageAt || new Date().toISOString(),
                    tags: item.tags?.map((t: any) => t.name) || [],
                }));
                setCustomers(mapped);
            }
        } catch { }
        setLoading(false);
    };

    const filtered = customers
        .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => sortBy === 'recent'
            ? new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
            : b.totalMessages - a.totalMessages);

    const stats = {
        total: customers.length,
        activeToday: customers.filter(c => {
            const d = new Date(c.lastActive);
            const now = new Date();
            return d.toDateString() === now.toDateString();
        }).length,
        messenger: customers.filter(c => c.platform === 'MESSENGER').length,
        avgMessages: customers.length > 0 ? Math.round(customers.reduce((s, c) => s + c.totalMessages, 0) / customers.length) : 0,
    };

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
            {onBack && (
                <button onClick={onBack} className="mb-4 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium group">
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> <Trans th="กลับไปเครื่องมือเพิ่มยอดขาย" en="Back to Sales Tools" />
                                    </button>
            )}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center shadow-lg shadow-purple-200">
                    <span className="text-white text-xl">📊</span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{<Trans th="วิเคราะห์ลูกค้า" en="Customer Analysis" />}</h2>
                    <p className="text-xs text-gray-400">{<Trans th="ข้อมูลพฤติกรรมและสถิติลูกค้าทั้งหมด" en="Customer behavior and statistics data" />}</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                    { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "All Customers" : "ลูกค้าทั้งหมด"), value: stats.total, icon: '👥', color: 'from-blue-400 to-indigo-500' },
                    { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Active Today" : "แอคทีฟวันนี้"), value: stats.activeToday, icon: '🟢', color: 'from-green-400 to-emerald-500' },
                    { label: 'Messenger', value: stats.messenger, icon: '💬', color: 'from-blue-500 to-blue-600' },
                    { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Avg Messages" : "ข้อความเฉลี่ย"), value: stats.avgMessages, icon: '📩', color: 'from-orange-400 to-pink-500' },
                ].map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                                <span className="text-sm">{s.icon}</span>
                            </div>
                            <span className="text-xs text-gray-500">{s.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-800">{s.value.toLocaleString()}</p>
                    </div>
                ))}
            </div>

            {/* Search + Sort */}
            <div className="flex flex-col md:flex-row gap-2 mb-4">
                <input
                    type="text"
                    placeholder="🔍 ค้นหาลูกค้า..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
                />
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
                >
                    <option value="recent">{<Trans th="ล่าสุด" en="Latest" />}</option>
                    <option value="messages">{<Trans th="ข้อความมากสุด" en="Most Messages" />}</option>
                </select>
            </div>

            {/* Customer List */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">
                        <div className="w-8 h-8 border-3 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <Trans th="กำลังโหลด..." en="Loading..." />
                                            </div>
                ) : filtered.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">{<Trans th="ไม่พบลูกค้า" en="No customers found" />}</div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filtered.slice(0, 50).map((customer) => (
                            <div key={customer.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-300 to-pink-300 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {customer.avatar ? (
                                        <img src={customer.avatar} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-white font-bold text-sm">{customer.name.charAt(0)}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{customer.name}</p>
                                    <p className="text-xs text-gray-400">
                                        {customer.platform} · {new Date(customer.lastActive).toLocaleDateString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'), { timeZone: 'Asia/Bangkok' })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {customer.tags.slice(0, 2).map((tag, ti) => (
                                        <span key={ti} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">{tag}</span>
                                    ))}
                                    <span className="text-xs text-gray-400">{customer.totalMessages} 💬</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 2. Retarget ลูกค้า
// ═══════════════════════════════════════════════════════════════
export function RetargetCustomers({ onBack }: { onBack?: () => void }) {
    const [groups, setGroups] = useState<RetargetGroup[]>([
        { id: '1', name: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Customers who purchased last 30 days" : "ลูกค้าที่ซื้อ 30 วันที่แล้ว"), filter: 'purchased_30d', contactCount: 0, lastSent: null },
        { id: '2', name: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Customers inactive for 7 days" : "ลูกค้าที่ไม่ active 7 วัน"), filter: 'inactive_7d', contactCount: 0, lastSent: null },
        { id: '3', name: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "New customers without purchase" : "ลูกค้าใหม่ยังไม่ได้ซื้อ"), filter: 'new_no_purchase', contactCount: 0, lastSent: null },
    ]);
    const [showCreate, setShowCreate] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [sending, setSending] = useState<string | null>(null);

    const handleCreateGroup = () => {
        if (!newGroupName.trim()) return;
        setGroups([...groups, {
            id: String(Date.now()),
            name: newGroupName,
            filter: 'custom',
            contactCount: 0,
            lastSent: null,
        }]);
        setNewGroupName('');
        setShowCreate(false);
    };

    const handleSend = async (groupId: string) => {
        setSending(groupId);
        // Simulate sending
        await new Promise(r => setTimeout(r, 2000));
        setGroups(groups.map(g =>
            g.id === groupId ? { ...g, lastSent: new Date().toISOString() } : g
        ));
        setSending(null);
    };

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            {onBack && (
                <button onClick={onBack} className="mb-4 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium group">
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> <Trans th="กลับไปเครื่องมือเพิ่มยอดขาย" en="Back to Sales Tools" />
                                    </button>
            )}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-lg shadow-red-200">
                        <span className="text-white text-xl">🎯</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{<Trans th="Retarget ลูกค้า" en="Retarget Customers" />}</h2>
                        <p className="text-xs text-gray-400">{<Trans th="ส่งข้อความเฉพาะกลุ่มที่สนใจ" en="Send message to specific interest groups" />}</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="px-4 py-2 bg-gradient-to-r from-red-400 to-rose-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-red-200 hover:shadow-red-300 transition-shadow"
                >
                    + สร้างกลุ่มใหม่
                </button>
            </div>

            {showCreate && (
                <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100 mb-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Group Name e.g. VIP Customers" : "ชื่อกลุ่ม เช่น ลูกค้า VIP")}
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-rose-300 outline-none"
                        />
                        <button onClick={handleCreateGroup} className="px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-medium">{<Trans th="สร้าง" en="Create" />}</button>
                        <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm">{<Trans th="ยกเลิก" en="Cancel" />}</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map((group) => (
                    <div key={group.id} className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">🎯</span>
                            <h3 className="text-sm font-bold text-gray-800">{group.name}</h3>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                            <span>👥 {group.contactCount} {<Trans th="คน" en="people" />}</span>
                            <span>{group.lastSent ? `ส่งล่าสุด: ${new Date(group.lastSent).toLocaleDateString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'), { timeZone: 'Asia/Bangkok' })}` : 'ยังไม่เคยส่ง'}</span>
                        </div>
                        <button
                            onClick={() => handleSend(group.id)}
                            disabled={sending === group.id}
                            className="w-full py-2 bg-gradient-to-r from-red-400 to-rose-500 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-opacity"
                        >
                            {sending === group.id ? '⏳ กำลังส่ง...' : '📩 ส่งข้อความ'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 3. ตั้งเวลาโพสต์
// ═══════════════════════════════════════════════════════════════
export function ScheduledPosting({ onBack }: { onBack?: () => void }) {
    const [posts, setPosts] = useState<ScheduledPost[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [content, setContent] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');

    const handleCreate = () => {
        if (!content.trim() || !scheduledAt) return;
        setPosts([...posts, {
            id: String(Date.now()),
            content,
            scheduledAt,
            status: 'pending',
            platform: 'Facebook',
        }]);
        setContent('');
        setScheduledAt('');
        setShowCreate(false);
    };

    const handleDelete = (id: string) => {
        setPosts(posts.filter(p => p.id !== id));
    };

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            {onBack && (
                <button onClick={onBack} className="mb-4 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium group">
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> <Trans th="กลับไปเครื่องมือเพิ่มยอดขาย" en="Back to Sales Tools" />
                                    </button>
            )}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-200">
                        <span className="text-white text-xl">⏰</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{<Trans th="ตั้งเวลาโพสต์" en="Scheduled Posting" />}</h2>
                        <p className="text-xs text-gray-400">{<Trans th="ตั้งเวลาโพสต์ Facebook อัตโนมัติ" en="Schedule automatic Facebook posts" />}</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-cyan-200"
                >
                    + สร้างโพสต์
                </button>
            </div>

            {showCreate && (
                <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100 mb-4">
                    <textarea
                        placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Write post content..." : "เขียนเนื้อหาโพสต์...")}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:ring-2 focus:ring-cyan-300 outline-none mb-3"
                    />
                    <div className="flex gap-2 items-center">
                        <input
                            type="datetime-local"
                            value={scheduledAt}
                            onChange={(e) => setScheduledAt(e.target.value)}
                            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                        />
                        <button onClick={handleCreate} className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium">{<Trans th="ตั้งเวลา" en="Schedule" />}</button>
                        <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm">{<Trans th="ยกเลิก" en="Cancel" />}</button>
                    </div>
                </div>
            )}

            {posts.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 shadow-sm ring-1 ring-gray-100 text-center">
                    <span className="text-5xl mb-4 block">📅</span>
                    <p className="text-gray-500 text-sm">{<Trans th="ยังไม่มีโพสต์ที่ตั้งเวลาไว้" en="No scheduled posts yet" />}</p>
                    <p className="text-gray-400 text-xs mt-1">กดปุ่ม &quot;สร้างโพสต์&quot; เพื่อเริ่มต้น</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {posts.map((post) => (
                        <div key={post.id} className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-800 line-clamp-2">{post.content}</p>
                                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                        <span>📅 {new Date(post.scheduledAt).toLocaleString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'))}</span>
                                        <span className={`px-2 py-0.5 rounded-full font-medium ${
                                            post.status === 'published' ? 'bg-green-100 text-green-700' :
                                            post.status === 'failed' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {post.status === 'published' ? '✅ เผยแพร่แล้ว' : post.status === 'failed' ? '❌ ล้มเหลว' : '⏳ รอเผยแพร่'}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(post.id)} className="text-gray-400 hover:text-red-500 text-lg">×</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 4. Email Marketing
// ═══════════════════════════════════════════════════════════════
export function EmailMarketing({ onBack }: { onBack?: () => void }) {
    const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [subject, setSubject] = useState('');

    const handleCreate = () => {
        if (!subject.trim()) return;
        setCampaigns([...campaigns, {
            id: String(Date.now()),
            subject,
            sentCount: 0,
            openRate: 0,
            status: 'draft',
            createdAt: new Date().toISOString(),
        }]);
        setSubject('');
        setShowCreate(false);
    };

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            {onBack && (
                <button onClick={onBack} className="mb-4 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium group">
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> <Trans th="กลับไปเครื่องมือเพิ่มยอดขาย" en="Back to Sales Tools" />
                                    </button>
            )}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
                        <span className="text-white text-xl">📧</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Email Marketing</h2>
                        <p className="text-xs text-gray-400">{<Trans th="ส่ง Email ถึงลูกค้าที่ซื้อแล้ว" en="Send Email to purchased customers" />}</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-amber-200"
                >
                    + สร้างแคมเปญ
                </button>
            </div>

            {showCreate && (
                <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100 mb-4">
                    <input
                        type="text"
                        placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Email subject e.g. Special Promotion!" : "หัวข้อ Email เช่น โปรโมชั่นพิเศษ!")}
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-orange-300 outline-none mb-3"
                    />
                    <div className="flex gap-2">
                        <button onClick={handleCreate} className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium">{<Trans th="สร้าง" en="Create" />}</button>
                        <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm">{<Trans th="ยกเลิก" en="Cancel" />}</button>
                    </div>
                </div>
            )}

            {campaigns.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 shadow-sm ring-1 ring-gray-100 text-center">
                    <span className="text-5xl mb-4 block">📧</span>
                    <p className="text-gray-500 text-sm">{<Trans th="ยังไม่มีแคมเปญ Email" en="No Email Campaigns yet" />}</p>
                    <p className="text-gray-400 text-xs mt-1">{<Trans th="สร้างแคมเปญแรกเพื่อส่ง Email ถึงลูกค้า" en="Create first campaign to send emails" />}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {campaigns.map((campaign) => (
                        <div key={campaign.id} className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{campaign.subject}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                        <span>📩 {campaign.sentCount} {<Trans th="ส่งแล้ว" en="Sent" />}</span>
                                        <span>📊 {campaign.openRate}% เปิดอ่าน</span>
                                        <span className={`px-2 py-0.5 rounded-full font-medium ${
                                            campaign.status === 'sent' ? 'bg-green-100 text-green-700' :
                                            campaign.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-gray-100 text-gray-500'
                                        }`}>
                                            {campaign.status === 'sent' ? '✅ ส่งแล้ว' : campaign.status === 'scheduled' ? '⏳ รอส่ง' : '📝 แบบร่าง'}
                                        </span>
                                    </div>
                                </div>
                                <button className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100">
                                    <Trans th="แก้ไข" en="Edit" />
                                                                    </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 5. Cross-sell
// ═══════════════════════════════════════════════════════════════
export function CrossSell({ onBack }: { onBack?: () => void }) {
    const [rules, setRules] = useState<CrossSellRule[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [triggerProduct, setTriggerProduct] = useState('');
    const [suggestProduct, setSuggestProduct] = useState('');

    const handleCreate = () => {
        if (!triggerProduct.trim() || !suggestProduct.trim()) return;
        setRules([...rules, {
            id: String(Date.now()),
            triggerProduct,
            suggestProduct,
            isActive: true,
            conversions: 0,
        }]);
        setTriggerProduct('');
        setSuggestProduct('');
        setShowCreate(false);
    };

    const toggleRule = (id: string) => {
        setRules(rules.map(r =>
            r.id === id ? { ...r, isActive: !r.isActive } : r
        ));
    };

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            {onBack && (
                <button onClick={onBack} className="mb-4 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium group">
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> <Trans th="กลับไปเครื่องมือเพิ่มยอดขาย" en="Back to Sales Tools" />
                                    </button>
            )}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-green-500 flex items-center justify-center shadow-lg shadow-teal-200">
                        <span className="text-white text-xl">🔄</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Cross-sell</h2>
                        <p className="text-xs text-gray-400">{<Trans th="แนะนำสินค้าที่เกี่ยวข้องอัตโนมัติ" en="Automatically recommend related products" />}</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="px-4 py-2 bg-gradient-to-r from-teal-400 to-green-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-teal-200"
                >
                    + สร้างกฎใหม่
                </button>
            </div>

            {showCreate && (
                <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100 mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">{<Trans th="เมื่อลูกค้าซื้อสินค้า A → แนะนำสินค้า B" en="When customer buys Product A → Recommend Product B" />}</p>
                    <div className="flex gap-2 items-center mb-3">
                        <input
                            type="text"
                            placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Product A (Trigger)" : "สินค้า A (Trigger)")}
                            value={triggerProduct}
                            onChange={(e) => setTriggerProduct(e.target.value)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-teal-300 outline-none"
                        />
                        <span className="text-gray-400">→</span>
                        <input
                            type="text"
                            placeholder={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Product B (Recommend)" : "สินค้า B (แนะนำ)")}
                            value={suggestProduct}
                            onChange={(e) => setSuggestProduct(e.target.value)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-teal-300 outline-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleCreate} className="px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-medium">{<Trans th="สร้าง" en="Create" />}</button>
                        <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm">{<Trans th="ยกเลิก" en="Cancel" />}</button>
                    </div>
                </div>
            )}

            {rules.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 shadow-sm ring-1 ring-gray-100 text-center">
                    <span className="text-5xl mb-4 block">🔄</span>
                    <p className="text-gray-500 text-sm">{<Trans th="ยังไม่มีกฎ Cross-sell" en="No Cross-sell rules yet" />}</p>
                    <p className="text-gray-400 text-xs mt-1">{<Trans th="สร้างกฎเพื่อแนะนำสินค้าอัตโนมัติเมื่อลูกค้าซื้อสินค้า" en="Create rule to auto-recommend when buying" />}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {rules.map((rule) => (
                        <div key={rule.id} className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg font-medium">{rule.triggerProduct}</span>
                                        <span className="text-gray-400">→</span>
                                        <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg font-medium">{rule.suggestProduct}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-400">{rule.conversions} conversion</span>
                                    <button
                                        onClick={() => toggleRule(rule.id)}
                                        className={`w-10 h-5 rounded-full transition-colors ${rule.isActive ? 'bg-teal-500' : 'bg-gray-300'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${rule.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
