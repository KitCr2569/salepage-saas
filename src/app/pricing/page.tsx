"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTenantAuthStore } from "@/store/useTenantAuthStore";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  maxProducts: number;
  maxShops: number;
  features: string;
}

const featureLabels: Record<string, string> = {
  basic_store: "ร้านค้าพื้นฐาน",
  manual_orders: "จัดการออเดอร์",
  analytics: "วิเคราะห์ยอดขาย",
  custom_theme: "ปรับแต่งธีม",
  chatbot: "แชทบอท AI",
  broadcast: "บรอดแคสต์",
  facebook_tools: "เครื่องมือ Facebook",
  tiktok: "TikTok Tools",
  priority_support: "ซัพพอร์ตด่วน",
  api_access: "API Access",
};

const testimonials = [
  { name: "คุณนิว", biz: "ร้านเสื้อผ้า", text: "ใช้มา 3 เดือน ยอดขายเพิ่มขึ้น 40% จากระบบแชทบอทอัตโนมัติ", avatar: "👩" },
  { name: "คุณเจ", biz: "ร้านอาหาร", text: "ระบบจัดการออเดอร์สะดวกมาก ไม่ต้องจดออเดอร์มือเหมือนเมื่อก่อน", avatar: "👨" },
  { name: "คุณแพร", biz: "ร้านเครื่องสำอาง", text: "Broadcast ช่วยให้เข้าถึงลูกค้าได้เยอะมาก ขายดีขึ้นเห็นๆ", avatar: "👩‍💼" },
];

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [annual, setAnnual] = useState(false);
  const { tenant, plan: currentPlan } = useTenantAuthStore();
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setPlans(json.data);
      })
      .catch(console.error);
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getFeatures = (plan: Plan): string[] => {
    try {
      return typeof plan.features === "string"
        ? JSON.parse(plan.features)
        : Array.isArray(plan.features)
        ? plan.features
        : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-pink-500/10 blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl" style={{ animation: 'pulse 4s ease-in-out infinite 1s' }} />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-blue-500/8 blur-3xl" style={{ animation: 'pulse 5s ease-in-out infinite 2s' }} />
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-2xl bg-slate-950/70 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center font-bold text-sm shadow-lg shadow-pink-500/20">
              S
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              ShopRent
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {tenant ? (
              <Link
                href="/admin"
                className="px-5 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-pink-500/25 transition-all"
              >
                จัดการร้าน
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors">
                  เข้าสู่ระบบ
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-pink-500/25 transition-all"
                >
                  สร้างร้านฟรี
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="relative max-w-6xl mx-auto px-6 py-20">
        {/* Hero Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400 mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            เปิดให้บริการแล้ว
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-5 leading-tight">
            <span className="bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              เลือกแพ็กเกจ
            </span>
            <br />
            <span className="bg-gradient-to-r from-pink-400 to-amber-300 bg-clip-text text-transparent">
              ที่เหมาะกับคุณ
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-10">
            เริ่มต้นสร้างร้านค้าออนไลน์ระดับมืออาชีพ พร้อมเครื่องมือครบครัน
            <br className="hidden md:block" />
            AI Chatbot, Broadcast, วิเคราะห์ยอดขาย และอื่นๆ อีกมากมาย
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1.5">
            <button
              onClick={() => setAnnual(false)}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                !annual
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              รายเดือน
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                annual
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              รายปี
              <span className="bg-green-500/20 text-green-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-24">
          {plans.map((plan, planIdx) => {
            const features = getFeatures(plan);
            const isPro = plan.slug === "pro";
            const isCurrent = currentPlan?.slug === plan.slug;
            const price = Number(plan.price);
            const displayPrice = annual ? Math.round(price * 0.8) : price;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl border transition-all duration-500 hover:-translate-y-1 ${
                  isPro
                    ? "bg-gradient-to-b from-pink-500/10 via-purple-500/5 to-transparent border-pink-500/30 shadow-2xl shadow-pink-500/10"
                    : "bg-white/[0.03] border-white/[0.08] hover:border-white/15 hover:shadow-xl hover:shadow-purple-500/5"
                }`}
                style={{ animation: `fadeSlideUp 0.6s ease-out ${planIdx * 0.15}s both` }}
              >
                {isPro && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full text-xs font-bold shadow-lg shadow-pink-500/30 flex items-center gap-1.5">
                    ⭐ แนะนำ
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4 px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-400 rounded-full text-xs font-bold">
                    ✓ ปัจจุบัน
                  </div>
                )}

                <div className="p-8">
                  <h3 className="text-2xl font-extrabold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-5xl font-black tracking-tight">
                      {price === 0 ? 'ฟรี' : `฿${displayPrice.toLocaleString()}`}
                    </span>
                    {price > 0 && <span className="text-sm text-gray-400">/เดือน</span>}
                  </div>

                  {annual && price > 0 && (
                    <p className="text-xs text-green-400 mb-6 flex items-center gap-1">
                      🎉 ประหยัด ฿{((price - displayPrice) * 12).toLocaleString()}/ปี
                    </p>
                  )}

                  <div className="space-y-3 my-8">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">📦</span>
                      <span>
                        สินค้าสูงสุด{" "}
                        <b className="text-white">
                          {plan.maxProducts >= 99999 ? "ไม่จำกัด" : plan.maxProducts}
                        </b>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">🏪</span>
                      <span>
                        ร้านค้า <b className="text-white">{plan.maxShops}</b> ร้าน
                      </span>
                    </div>
                    <div className="h-px bg-white/5 my-4" />
                    {features.map((f) => (
                      <div key={f} className="flex items-center gap-3 text-sm text-gray-400">
                        <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-green-400 text-[10px]">✓</span>
                        </span>
                        <span>{featureLabels[f] || f}</span>
                      </div>
                    ))}
                  </div>

                  {isCurrent ? (
                    <div className="py-3.5 text-center text-sm text-gray-500 bg-white/5 rounded-2xl border border-white/5">
                      แพ็กเกจปัจจุบัน
                    </div>
                  ) : (
                    <Link
                      href={tenant ? `/admin` : "/register"}
                      className={`block w-full text-center py-3.5 rounded-2xl font-bold text-sm transition-all ${
                        isPro
                          ? "bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-xl hover:shadow-pink-500/25 hover:-translate-y-0.5"
                          : "bg-white/10 hover:bg-white/15 border border-white/10"
                      }`}
                    >
                      {price === 0 ? "🚀 เริ่มต้นฟรี" : "เลือกแพ็กเกจนี้ →"}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Testimonials */}
        <div className="max-w-3xl mx-auto mb-24">
          <h2 className="text-2xl font-bold text-center mb-2">
            <span className="bg-gradient-to-r from-pink-400 to-amber-300 bg-clip-text text-transparent">
              ลูกค้าพูดถึงเรา
            </span>
          </h2>
          <p className="text-center text-gray-500 text-sm mb-8">ความเห็นจากผู้ใช้งานจริง</p>
          <div className="relative overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${activeTestimonial * 100}%)` }}
            >
              {testimonials.map((t, i) => (
                <div key={i} className="min-w-full px-4">
                  <div className="bg-white/[0.04] border border-white/[0.08] rounded-3xl p-8 text-center">
                    <span className="text-5xl mb-4 block">{t.avatar}</span>
                    <p className="text-gray-300 text-base mb-4 italic">&ldquo;{t.text}&rdquo;</p>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.biz}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-2 mt-4">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTestimonial(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === activeTestimonial ? 'w-6 bg-pink-500' : 'bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mb-24">
          {[
            { value: "500+", label: "ร้านค้าที่ใช้งาน", icon: "🏪" },
            { value: "99.9%", label: "ระบบทำงานต่อเนื่อง", icon: "⚡" },
            { value: "24/7", label: "ซัพพอร์ตตลอด", icon: "💬" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <span className="text-2xl mb-1 block">{stat.icon}</span>
              <p className="text-2xl md:text-3xl font-black bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                {stat.value}
              </p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            <span className="bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              คำถามที่พบบ่อย
            </span>
          </h2>
          <div className="space-y-3">
            {[
              {
                q: "สามารถเปลี่ยนแพ็กเกจภายหลังได้ไหม?",
                a: "ได้ครับ สามารถอัปเกรดหรือดาวน์เกรดแพ็กเกจได้ตลอดเวลา โดยจะคิดค่าใช้จ่ายตามส่วนต่างของแพ็กเกจ",
              },
              {
                q: "แพ็กเกจฟรีมีข้อจำกัดอะไรบ้าง?",
                a: "แพ็กเกจฟรีสามารถเพิ่มสินค้าได้ 10 ชิ้น, มีร้านค้า 1 ร้าน และใช้ฟีเจอร์พื้นฐานได้ ไม่มีแชทบอท AI หรือ Broadcast",
              },
              {
                q: "ชำระเงินด้วยวิธีไหนได้บ้าง?",
                a: "รองรับการชำระผ่านโอนธนาคาร, พร้อมเพย์ และ QR Code สะดวกรวดเร็ว",
              },
              {
                q: "ถ้าแพ็กเกจหมดอายุ ข้อมูลจะหายไหม?",
                a: "ไม่หายครับ ข้อมูลจะถูกเก็บไว้ แต่ลูกค้าจะไม่สามารถเข้าดูหน้าร้านได้จนกว่าจะต่ออายุแพ็กเกจ",
              },
            ].map((faq) => (
              <details
                key={faq.q}
                className="group bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/10 transition-colors"
              >
                <summary className="px-6 py-5 cursor-pointer text-sm font-semibold flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  {faq.q}
                  <span className="text-gray-500 group-open:rotate-180 transition-transform duration-300 ml-4 flex-shrink-0">▼</span>
                </summary>
                <div className="px-6 pb-5 text-sm text-gray-400 leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-24 mb-8">
          <h3 className="text-2xl font-bold mb-3">พร้อมเริ่มต้นหรือยัง?</h3>
          <p className="text-gray-400 text-sm mb-6">สร้างร้านค้าออนไลน์ของคุณวันนี้ ฟรี! ไม่ต้องใช้บัตรเครดิต</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl text-base font-bold shadow-xl shadow-pink-500/25 hover:shadow-2xl hover:-translate-y-1 transition-all"
          >
            🚀 เริ่มต้นฟรีเลย
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 relative">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-sm text-gray-600">© {new Date().getFullYear()} ShopRent</span>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-400 transition-colors">
            กลับหน้าหลัก
          </Link>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
