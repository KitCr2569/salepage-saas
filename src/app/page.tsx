"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    fetch("/api/platform-settings").then(r => r.json())
      .then(d => setSettings(d.data || {})).catch(() => {});
  }, []);

  const brand = settings.brand_name || "SaaS Platform";

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white overflow-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0a1a]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-bold text-sm shadow-lg shadow-amber-500/20">S</div>
            <span className="text-lg font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">{brand}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-all">แพ็กเกจ</Link>
            <Link href="/login" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-all">เข้าสู่ระบบ</Link>
            <Link href="/register" className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-amber-500/20 transition-all">เริ่มต้นใช้งาน</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-24 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-sm text-amber-400 mb-8">
            ✨ ระบบจัดการร้านค้าออนไลน์ครบวงจร
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
            <span className="bg-gradient-to-r from-white via-amber-100 to-orange-200 bg-clip-text text-transparent">
              สร้างร้านค้าออนไลน์
            </span>
            <br />
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              ขายได้ทันที
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            ระบบ SaaS สำหรับเปิดร้านค้าออนไลน์ ครบทุกฟีเจอร์ — จัดการสินค้า, ออเดอร์,
            ชำระเงิน QR PromptPay, แชทลูกค้าผ่าน Messenger และอีกมากมาย
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register"
              className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-amber-500/25 hover:-translate-y-0.5 transition-all">
              🚀 เริ่มต้นใช้งาน
            </Link>
            <Link href="/pricing"
              className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all">
              ดูแพ็กเกจ →
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4">
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">ทำไมต้องเลือกเรา?</span>
          </h2>
          <p className="text-gray-500 text-center mb-12">ฟีเจอร์ครบครันที่ช่วยให้ธุรกิจคุณเติบโต</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "🏪", title: "หน้าร้านออนไลน์", desc: "สร้างเว็บร้านค้าสวยๆ พร้อมขายได้ทันที รองรับ 2 ภาษา" },
              { icon: "💬", title: "แชท Messenger", desc: "เชื่อมต่อ Facebook Messenger รับออเดอร์และตอบแชทลูกค้าอัตโนมัติ" },
              { icon: "💳", title: "ชำระเงิน QR", desc: "ระบบชำระเงินผ่าน QR PromptPay สะดวก รวดเร็ว ปลอดภัย" },
              { icon: "📦", title: "จัดการออเดอร์", desc: "ระบบออเดอร์ครบวงจร — ยืนยัน, แพ็ค, จัดส่ง, แจ้ง Tracking" },
              { icon: "🤖", title: "AI Chatbot", desc: "บอทตอบลูกค้าอัตโนมัติ 24 ชม. ช่วยปิดการขายแม้ไม่มีใครออนไลน์" },
              { icon: "📊", title: "วิเคราะห์ลูกค้า", desc: "รู้จักลูกค้าของคุณ ส่ง Broadcast, Retarget ลูกค้าเก่าเพิ่มยอดขาย" },
            ].map((f, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:border-amber-500/20 hover:bg-amber-500/[0.02] transition-all group">
                <span className="text-3xl mb-4 block">{f.icon}</span>
                <h3 className="font-bold text-lg mb-2 group-hover:text-amber-400 transition-colors">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent to-amber-500/[0.02]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">เริ่มต้นเพียง ฿490/เดือน</span>
          </h2>
          <p className="text-gray-500 mb-10">2 แพ็กเกจให้เลือก ตอบโจทย์ทุกขนาดธุรกิจ</p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { name: "Starter", price: "490", features: ["ร้านค้า 1 ร้าน", "สินค้า 50 ชิ้น", "แชท Messenger", "ออเดอร์ + Tracking", "QR PromptPay"] },
              { name: "Pro", price: "790", features: ["ร้านค้า 3 ร้าน", "สินค้า 500 ชิ้น", "AI Chatbot", "Broadcast", "วิเคราะห์ลูกค้า", "Discount Code", "Meta Pixel"], popular: true },
            ].map((p, i) => (
              <div key={i} className={`relative p-6 rounded-2xl border text-left ${p.popular
                ? "bg-gradient-to-b from-amber-500/10 to-orange-500/5 border-amber-500/30"
                : "bg-white/[0.03] border-white/[0.06]"}`}>
                {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-xs font-bold">⭐ แนะนำ</div>}
                <h3 className="text-xl font-bold mb-1">{p.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-extrabold">฿{p.price}</span>
                  <span className="text-sm text-gray-400">/เดือน</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="text-green-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all ${p.popular
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-lg hover:shadow-amber-500/25"
                  : "bg-white/10 hover:bg-white/15"}`}>
                  เลือกแพ็กเกจนี้
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold mb-4">พร้อมเริ่มต้นแล้วหรือยัง?</h2>
          <p className="text-gray-500 mb-8">ติดต่อผู้ดูแลระบบเพื่อรับรหัสเชิญและเริ่มใช้งานได้ทันที</p>
          <div className="flex justify-center gap-4 flex-wrap">
            {settings.line_url && (
              <a href={settings.line_url} target="_blank" className="px-6 py-3 bg-[#06C755] rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2">
                💬 LINE: {settings.line_id || "ติดต่อเรา"}
              </a>
            )}
            {settings.facebook_url && (
              <a href={settings.facebook_url} target="_blank" className="px-6 py-3 bg-[#1877F2] rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2">
                📘 Facebook Page
              </a>
            )}
            <Link href="/register" className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-bold text-sm hover:shadow-lg transition-all">
              🚀 สมัครเลย
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-sm text-gray-600">© {new Date().getFullYear()} {brand}</span>
          <div className="flex gap-4">
            <Link href="/pricing" className="text-sm text-gray-500 hover:text-gray-400">แพ็กเกจ</Link>
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-400">เข้าสู่ระบบ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
