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

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [annual, setAnnual] = useState(false);
  const { tenant, plan: currentPlan } = useTenantAuthStore();

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setPlans(json.data);
      })
      .catch(console.error);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/60 border-b border-white/5">
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
                className="px-5 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl text-sm font-semibold"
              >
                จัดการร้าน
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-sm text-gray-300 hover:text-white">
                  เข้าสู่ระบบ
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl text-sm font-semibold"
                >
                  สร้างร้านฟรี
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            <span className="bg-gradient-to-r from-white to-amber-200 bg-clip-text text-transparent">
              เลือกแพ็กเกจที่เหมาะกับคุณ
            </span>
          </h1>
          <p className="text-gray-400 text-lg mb-8">
            เริ่มต้นใช้งานด้วยรหัสเชิญจากผู้ดูแลระบบ
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-1.5 py-1.5">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                !annual
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              รายเดือน
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                annual
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              รายปี
              <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
          {plans.map((plan) => {
            const features = getFeatures(plan);
            const isPro = plan.slug === "pro";
            const isCurrent = currentPlan?.slug === plan.slug;
            const price = Number(plan.price);
            const displayPrice = annual ? Math.round(price * 0.8) : price;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col p-6 rounded-2xl border transition-all ${
                  isPro
                    ? "bg-gradient-to-b from-pink-500/10 to-purple-500/10 border-pink-500/30 shadow-2xl shadow-pink-500/10 scale-[1.02]"
                    : "bg-white/[0.03] border-white/[0.06] hover:border-white/10"
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full text-xs font-bold shadow-lg">
                    ⭐ ยอดนิยม
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4 px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-400 rounded-full text-xs font-bold">
                    ✓ ปัจจุบัน
                  </div>
                )}

                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-extrabold">
                    ฿{displayPrice.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-400">/เดือน</span>
                </div>

                {annual && price > 0 && (
                  <p className="text-xs text-green-400 -mt-4 mb-4">
                    ประหยัด ฿{((price - displayPrice) * 12).toLocaleString()}/ปี
                  </p>
                )}

                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-pink-400">📦</span>
                    <span>
                      สินค้าสูงสุด{" "}
                      <b className="text-white">
                        {plan.maxProducts >= 99999 ? "ไม่จำกัด" : plan.maxProducts}
                      </b>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-purple-400">🏪</span>
                    <span>
                      ร้านค้า <b className="text-white">{plan.maxShops}</b> ร้าน
                    </span>
                  </div>
                  <div className="h-px bg-white/5 my-3" />
                  {features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="text-green-400 text-xs">✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                {isCurrent ? (
                  <div className="py-3 text-center text-sm text-gray-500 bg-white/5 rounded-xl">
                    แพ็กเกจปัจจุบัน
                  </div>
                ) : (
                  <Link
                    href={tenant ? `/admin` : "/register"}
                    className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                      isPro
                        ? "bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-lg hover:shadow-pink-500/25 hover:-translate-y-0.5"
                        : "bg-white/10 hover:bg-white/15"
                    }`}
                  >
                    {price === 0 ? "เริ่มต้นฟรี" : "เลือกแพ็กเกจนี้"}
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">คำถามที่พบบ่อย</h2>
          <div className="space-y-4">
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
                className="group bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden"
              >
                <summary className="px-6 py-4 cursor-pointer text-sm font-medium flex items-center justify-between hover:bg-white/[0.03] transition-colors">
                  {faq.q}
                  <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-6 pb-4 text-sm text-gray-400">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-sm text-gray-600">© {new Date().getFullYear()} ShopRent</span>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-400">
            กลับหน้าหลัก
          </Link>
        </div>
      </footer>
    </div>
  );
}
