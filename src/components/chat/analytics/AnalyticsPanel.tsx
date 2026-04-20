'use client';

// ═══════════════════════════════════════════════════════════════
// Analytics Panel — Dashboard สถิติการสนทนา
// ดึงข้อมูลจาก /api/chat/analytics
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import { Trans } from "@/components/Trans";

interface AnalyticsData {
    totalConversations: number;
    openConversations: number;
    assignedConversations: number;
    resolvedConversations: number;
    totalMessages: number;
    totalOrders: number;
    totalRevenue: number;
    channelBreakdown: Array<{
        channel: string;
        type: string;
        count: number;
        color: string;
        icon: string;
    }>;
    agentPerformance: Array<{
        name: string;
        handled: number;
        messages: number;
        avgTime: string;
        satisfaction: number;
    }>;
    recentActivity: Array<{
        time: string;
        event: string;
        detail: string;
        channel: string;
    }>;
}

function formatNumber(n: number): string {
    return new Intl.NumberFormat((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH')).format(n);
}

function StatCard({ icon, label, value, color, sub }: {
    icon: string; label: string; value: string | number; color: string; sub?: string;
}) {
    return (
        <div className="bg-surface-900 rounded-xl border border-surface-800 p-4 hover:border-surface-700 transition-colors">
            <div className="flex items-center gap-3 mb-2">
                <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${color}20` }}
                >
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-surface-400 truncate">{label}</p>
                    <p className="text-xl font-bold text-white">{typeof value === 'number' ? formatNumber(value) : value}</p>
                </div>
            </div>
            {sub && <p className="text-[11px] text-surface-500 mt-1">{sub}</p>}
        </div>
    );
}

export default function AnalyticsPanel() {
    const { get } = useApi();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const res = await get<AnalyticsData>('/api/chat/analytics');
            if (res.data) setData(res.data);
        } catch (err) {
            console.error('Failed to load analytics:', err);
        } finally {
            setLoading(false);
        }
    }, [get]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full mb-3" />
                    <p className="text-surface-400 text-sm">{<Trans th="กำลังโหลดสถิติ..." en="Loading statistics..." />}</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="h-full flex items-center justify-center text-surface-500">
                <p>{<Trans th="ไม่สามารถโหลดข้อมูลสถิติได้" en="Unable to load statistics data." />}</p>
            </div>
        );
    }

    const maxChannelCount = Math.max(...data.channelBreakdown.map(c => c.count), 1);

    return (
        <div className="h-full overflow-y-auto p-4 md:p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Trans th="📊 สถิติภาพรวม" en="📊 Overview statistics" />
                                                    </h2>
                        <p className="text-surface-400 text-sm mt-1">{<Trans th="ข้อมูลจากระบบ Unified Chat" en="Information from the Unified Chat system" />}</p>
                    </div>
                    <button
                        onClick={() => { setLoading(true); fetchData(); }}
                        className="px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs transition-colors"
                    >
                        <Trans th="🔄 รีเฟรช" en="🔄 Refresh" />
                                            </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard icon="💬" label={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "All conversations" : "การสนทนาทั้งหมด")} value={data.totalConversations} color="#6366f1" />
                    <StatCard icon="🟡" label={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "open" : "เปิดอยู่")} value={data.openConversations} color="#eab308"
                        sub={`${data.totalConversations > 0 ? Math.round(data.openConversations / data.totalConversations * 100) : 0}% ของทั้งหมด`} />
                    <StatCard icon="📨" label={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "All messages" : "ข้อความทั้งหมด")} value={data.totalMessages} color="#3b82f6" />
                    <StatCard icon="💰" label={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "income" : "รายได้")} value={`฿${formatNumber(data.totalRevenue)}`} color="#10b981"
                        sub={`จาก ${data.totalOrders} คำสั่งซื้อ`} />
                </div>

                {/* Status breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <StatCard icon="🟡" label={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Open" : "เปิดอยู่ (Open)")} value={data.openConversations} color="#eab308" />
                    <StatCard icon="🔵" label={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Assigned" : "มอบหมายแล้ว (Assigned)")} value={data.assignedConversations} color="#3b82f6" />
                    <StatCard icon="🟢" label={(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Resolved" : "แก้ไขแล้ว (Resolved)")} value={data.resolvedConversations} color="#22c55e" />
                </div>

                {/* Channel Breakdown */}
                <div className="bg-surface-900 rounded-xl border border-surface-800 p-5">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <Trans th="📡 แยกตามช่องทาง" en="📡 Separated by channel" />
                                            </h3>
                    {data.channelBreakdown.length === 0 ? (
                        <p className="text-surface-500 text-sm">{<Trans th="ยังไม่มีข้อมูลช่องทาง" en="There is no channel information yet." />}</p>
                    ) : (
                        <div className="space-y-3">
                            {data.channelBreakdown.map((ch) => (
                                <div key={ch.type} className="flex items-center gap-3">
                                    <span className="text-lg w-8 text-center">{ch.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm text-surface-200 truncate">{ch.channel}</span>
                                            <span className="text-sm font-semibold text-white ml-2">{ch.count}</span>
                                        </div>
                                        <div className="w-full bg-surface-800 rounded-full h-2">
                                            <div
                                                className="h-2 rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${(ch.count / maxChannelCount) * 100}%`,
                                                    backgroundColor: ch.color,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Agent Performance */}
                <div className="bg-surface-900 rounded-xl border border-surface-800 p-5">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <Trans th="👥 ประสิทธิภาพเจ้าหน้าที่" en="👥 Officer efficiency" />
                                            </h3>
                    {data.agentPerformance.length === 0 ? (
                        <p className="text-surface-500 text-sm">{<Trans th="ยังไม่มีข้อมูลเจ้าหน้าที่" en="There is no official information yet." />}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-surface-800">
                                        <th className="text-left py-2 px-3 text-surface-400 font-medium text-xs">{<Trans th="ชื่อ" en="name" />}</th>
                                        <th className="text-center py-2 px-3 text-surface-400 font-medium text-xs">{<Trans th="รับผิดชอบ" en="be responsible" />}</th>
                                        <th className="text-center py-2 px-3 text-surface-400 font-medium text-xs">{<Trans th="ข้อความ" en="message" />}</th>
                                        <th className="text-center py-2 px-3 text-surface-400 font-medium text-xs">{<Trans th="เวลาเฉลี่ย" en="average time" />}</th>
                                        <th className="text-center py-2 px-3 text-surface-400 font-medium text-xs">{<Trans th="ความพึงพอใจ" en="Satisfaction" />}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.agentPerformance.map((agent) => (
                                        <tr key={agent.name} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                                            <td className="py-3 px-3 text-surface-200 font-medium">{agent.name}</td>
                                            <td className="py-3 px-3 text-center text-surface-300">{agent.handled}</td>
                                            <td className="py-3 px-3 text-center text-surface-300">{agent.messages}</td>
                                            <td className="py-3 px-3 text-center text-surface-400 text-xs">{agent.avgTime}</td>
                                            <td className="py-3 px-3 text-center">
                                                {agent.satisfaction > 0 ? (
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        agent.satisfaction >= 95 ? 'bg-emerald-500/20 text-emerald-400'
                                                        : agent.satisfaction >= 90 ? 'bg-yellow-500/20 text-yellow-400'
                                                        : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                        {agent.satisfaction}%
                                                    </span>
                                                ) : (
                                                    <span className="text-surface-600 text-xs">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Recent Activity */}
                <div className="bg-surface-900 rounded-xl border border-surface-800 p-5">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <Trans th="🕐 กิจกรรมล่าสุด" en="🕐 Latest activity" />
                                            </h3>
                    {data.recentActivity.length === 0 ? (
                        <p className="text-surface-500 text-sm">{<Trans th="ยังไม่มีกิจกรรม" en="There is no activity yet." />}</p>
                    ) : (
                        <div className="space-y-2">
                            {data.recentActivity.map((act, i) => (
                                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-surface-800/50 transition-colors">
                                    <span className="text-xs text-surface-500 font-mono w-12 flex-shrink-0">{act.time}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                        act.event === (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "New message" : "ข้อความใหม่") ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                                    }`}>
                                        {act.event}
                                    </span>
                                    <span className="text-sm text-surface-300 truncate">{act.detail}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
