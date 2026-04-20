"use client";

import { useState } from "react";
import { Trans } from "@/components/Trans";

export default function AdminUpgrade() {
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

    const plans = [
        {
            id: 'free',
            name: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "free" : "ฟรี"),
            price: 0,
            period: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "For life" : "ตลอดชีพ"),
            color: 'from-gray-400 to-gray-500',
            features: [
                '✅ ขายสินค้า 10 รายการ',
                '✅ รับออเดอร์ไม่จำกัด',
                '✅ แชท Messenger',
                '✅ เซลเพจพื้นฐาน',
                '❌ บรอดแคสต์ (จำกัด 100 คน/วัน)',
                '❌ AI Chatbot',
                '❌ วิเคราะห์ขั้นสูง',
            ],
            current: true,
        },
        {
            id: 'pro',
            name: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Pro" : "โปร"),
            price: 590,
            period: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "/month" : "/เดือน"),
            color: 'from-blue-500 to-indigo-600',
            popular: true,
            features: [
                '✅ ขายสินค้าไม่จำกัด',
                '✅ รับออเดอร์ไม่จำกัด',
                '✅ แชท Messenger + LINE',
                '✅ เซลเพจ Premium',
                '✅ บรอดแคสต์ไม่จำกัด',
                '✅ AI Chatbot',
                '✅ คูปองส่วนลด',
                '❌ วิเคราะห์ขั้นสูง',
            ],
        },
        {
            id: 'business',
            name: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "business" : "ธุรกิจ"),
            price: 1490,
            period: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "/month" : "/เดือน"),
            color: 'from-purple-500 to-pink-600',
            features: [
                '✅ ทุกอย่างใน โปร',
                '✅ TikTok Shop Integration',
                '✅ วิเคราะห์ขั้นสูง',
                '✅ Retarget ลูกค้า',
                '✅ Email Marketing',
                '✅ หลายร้านค้า',
                '✅ API ส่วนตัว',
                '✅ ซัพพอร์ตเฉพาะ',
            ],
        },
    ];

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
                    <span className="text-white text-xl">⚡</span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{<Trans th="อัพเกรดแพ็กเกจ" en="Upgrade package" />}</h2>
                    <p className="text-xs text-gray-400">{<Trans th="เลือกแพ็กเกจที่เหมาะกับธุรกิจของคุณ" en="Choose the package that suits your business." />}</p>
                </div>
            </div>

            {/* Current Plan */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 mb-6 border border-amber-200">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🎁</span>
                    <div>
                        <p className="text-sm font-bold text-gray-800"><Trans th="แพ็กเกจปัจจุบัน:" en="Current package:" /> <span className="text-amber-600">{<Trans th="ฟรี" en="free" />}</span></p>
                        <p className="text-xs text-gray-500">{<Trans th="อัพเกรดเพื่อปลดล็อกฟีเจอร์เพิ่มเติม" en="Upgrade to unlock additional features." />}</p>
                    </div>
                </div>
            </div>

            {/* Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map(plan => (
                    <div
                        key={plan.id}
                        className={`relative bg-white rounded-2xl overflow-hidden shadow-sm ring-1 transition-all ${
                            selectedPlan === plan.id ? 'ring-2 ring-blue-500 shadow-lg' : 'ring-gray-100 hover:shadow-md'
                        }`}
                    >
                        {plan.popular && (
                            <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold text-center py-1.5">
                                <Trans th="⭐ แนะนำ" en="⭐ Recommend" />
                                                            </div>
                        )}

                        <div className={`p-6 ${plan.popular ? 'pt-10' : ''}`}>
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4 shadow-md`}>
                                <span className="text-white text-2xl font-bold">{plan.name.charAt(0)}</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">{plan.name}</h3>
                            <div className="flex items-baseline gap-1 mt-2">
                                <span className="text-3xl font-bold text-gray-800">
                                    {plan.price === 0 ? 'ฟรี' : `฿${plan.price.toLocaleString()}`}
                                </span>
                                {plan.price > 0 && (
                                    <span className="text-sm text-gray-400">{plan.period}</span>
                                )}
                            </div>

                            <div className="mt-5 space-y-2">
                                {plan.features.map((feature, i) => (
                                    <p key={i} className={`text-xs ${feature.startsWith('✅') ? 'text-gray-700' : 'text-gray-400'}`}>
                                        {feature}
                                    </p>
                                ))}
                            </div>

                            <button
                                onClick={() => setSelectedPlan(plan.id)}
                                className={`w-full mt-6 py-3 rounded-xl font-medium text-sm transition-all ${
                                    plan.current
                                        ? 'bg-gray-100 text-gray-500 cursor-default'
                                        : `bg-gradient-to-r ${plan.color} text-white shadow-md hover:shadow-lg`
                                }`}
                                disabled={plan.current}
                            >
                                {plan.current ? '✅ ใช้งานอยู่' : 'เลือกแพ็กเกจนี้'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* FAQ */}
            <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">{<Trans th="❓ คำถามที่พบบ่อย" en="❓ Frequently asked questions" />}</h3>
                <div className="space-y-3">
                    {[
                        { q: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Can I cancel at any time?" : "ยกเลิกได้ตลอดเวลาไหม?"), a: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Yes, you can cancel at any time. There is no penalty." : "ได้ครับ ยกเลิกได้ตลอดเวลา ไม่มีค่าปรับ") },
                        { q: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Is there a free trial?" : "มีทดลองใช้ฟรีไหม?"), a: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "The Pro package has a 14-day free trial." : "แพ็กเกจ โปร มีทดลองใช้ฟรี 14 วัน") },
                        { q: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "How to pay?" : "ชำระเงินยังไง?"), a: (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Supports credit/debit cards, transfers via PromptPay." : "รองรับบัตรเครดิต/เดบิต, โอนผ่าน PromptPay") },
                    ].map((item, i) => (
                        <div key={i} className="bg-gray-50 rounded-xl p-4">
                            <p className="text-sm font-medium text-gray-800">{item.q}</p>
                            <p className="text-xs text-gray-500 mt-1">{item.a}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
