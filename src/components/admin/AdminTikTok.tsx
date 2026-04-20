"use client";

import { useState } from "react";
import { Trans } from "@/components/Trans";

export default function AdminTikTok() {
    const [tiktokAccount, setTiktokAccount] = useState('');
    const [connected, setConnected] = useState(false);

    const handleConnect = () => {
        if (tiktokAccount.trim()) {
            setConnected(true);
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-800 to-black flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl">🎵</span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">TikTok Shop</h2>
                    <p className="text-xs text-gray-400">{<Trans th="เชื่อมต่อ TikTok Shop เพื่อจัดการสินค้าและออเดอร์" en="Connect TikTok Shop to manage products and orders." />}</p>
                </div>
            </div>

            {!connected ? (
                /* Connect TikTok */
                <div className="bg-white rounded-2xl p-8 shadow-sm ring-1 ring-gray-100 text-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center mx-auto mb-6 shadow-xl">
                        <span className="text-5xl">🎵</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{<Trans th="เชื่อมต่อ TikTok Shop" en="Connect TikTok Shop" />}</h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                        <Trans th="เชื่อมต่อบัญชี TikTok Shop เพื่อ sync สินค้า, จัดการออเดอร์ และดูสถิติจากที่เดียว" en="Connect your TikTok Shop account to sync products and manage orders. and view statistics from one place" />
                                            </p>

                    <div className="max-w-sm mx-auto mb-6">
                        <label className="block text-sm font-medium text-gray-600 mb-2 text-left">{<Trans th="TikTok Shop ID หรือ Username" en="TikTok Shop ID or Username" />}</label>
                        <input
                            type="text"
                            value={tiktokAccount}
                            onChange={e => setTiktokAccount(e.target.value)}
                            placeholder="@hdgwrapskin"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-500/30"
                        />
                    </div>

                    <button
                        onClick={handleConnect}
                        className="px-8 py-3 bg-gradient-to-r from-gray-800 to-black text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                        <Trans th="🔗 เชื่อมต่อ TikTok Shop" en="🔗 Connect TikTok Shop" />
                                            </button>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { icon: "📦", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Sync products" : "Sync สินค้า"), desc: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Pull products from TikTok Shop to manage." : "ดึงสินค้าจาก TikTok Shop มาจัดการ") },
                            { icon: "📋", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Manage orders" : "จัดการออเดอร์"), desc: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "View and manage orders from TikTok" : "ดูและจัดการออเดอร์จาก TikTok") },
                            { icon: "📊", label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Analyze sales" : "วิเคราะห์ยอดขาย"), desc: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "View real-time sales statistics" : "ดูสถิติยอดขายแบบ Real-time") },
                        ].map((item, i) => (
                            <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <span className="text-2xl">{item.icon}</span>
                                <p className="text-sm font-bold text-gray-800 mt-2">{item.label}</p>
                                <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                /* Connected State */
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center">
                                <span className="text-3xl">🎵</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-lg font-bold text-gray-800">{tiktokAccount}</p>
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">{<Trans th="เชื่อมต่อแล้ว" en="Connected" />}</span>
                                </div>
                                <p className="text-sm text-gray-500">TikTok Shop</p>
                            </div>
                            <button
                                onClick={() => setConnected(false)}
                                className="px-4 py-2 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50"
                            >
                                <Trans th="ยกเลิกเชื่อมต่อ" en="Disconnect" />
                                                                </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "product" : "สินค้า"), value: "12", icon: "📦", color: "from-blue-50 to-indigo-50 border-blue-100 text-blue-600" },
                            { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "TikTok orders" : "ออเดอร์ TikTok"), value: "0", icon: "📋", color: "from-green-50 to-emerald-50 border-green-100 text-green-600" },
                            { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "TikTok sales" : "ยอดขาย TikTok"), value: "฿0", icon: "💰", color: "from-amber-50 to-yellow-50 border-amber-100 text-amber-600" },
                            { label: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Followers" : "ผู้ติดตาม"), value: "1.2K", icon: "👥", color: "from-purple-50 to-pink-50 border-purple-100 text-purple-600" },
                        ].map((s, i) => (
                            <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 border shadow-sm`}>
                                <span className="text-2xl">{s.icon}</span>
                                <p className={`text-2xl font-bold mt-2 ${s.color.split(' ').pop()}`}>{s.value}</p>
                                <p className="text-xs text-gray-500">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100 text-center py-12">
                        <span className="text-4xl">🚧</span>
                        <p className="text-lg font-bold text-gray-800 mt-3">{<Trans th="กำลังพัฒนา" en="developing" />}</p>
                        <p className="text-sm text-gray-500 mt-1">{<Trans th="ฟีเจอร์ sync สินค้าและออเดอร์จาก TikTok Shop จะเปิดใช้งานเร็วๆ นี้" en="The feature to sync products and orders from TikTok Shop will be available soon." />}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
