"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTenantAuthStore } from "@/store/useTenantAuthStore";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useTenantAuthStore();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    shopName: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    const result = await register({
      email: form.email,
      password: form.password,
      name: form.name,
      phone: form.phone,
      shopName: form.shopName,
    });

    if (result.success) {
      router.push("/admin");
    } else {
      setError(result.error || "เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center px-4 py-12">
      {/* Background effects */}
      <div className="fixed top-20 left-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-pink-500/20">
              S
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              ShopRent
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-white text-center mb-2">
            สร้างร้านค้าใหม่
          </h1>
          <p className="text-sm text-gray-400 text-center mb-8">
            เริ่มต้นฟรี ไม่ต้องใช้บัตรเครดิต
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Shop Name */}
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">ชื่อร้านค้า</label>
              <input
                type="text"
                placeholder="เช่น My Camera Shop"
                value={form.shopName}
                onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                required
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/25 transition-all"
              />
            </div>

            {/* Name */}
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">ชื่อ-นามสกุล</label>
              <input
                type="text"
                placeholder="ชื่อเจ้าของร้าน"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/25 transition-all"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">อีเมล</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/25 transition-all"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">
                เบอร์โทร <span className="text-gray-600">(ไม่บังคับ)</span>
              </label>
              <input
                type="tel"
                placeholder="0xx-xxx-xxxx"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/25 transition-all"
              />
            </div>

            {/* Password */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">รหัสผ่าน</label>
                <input
                  type="password"
                  placeholder="อย่างน้อย 6 ตัว"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/25 transition-all"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">ยืนยันรหัสผ่าน</label>
                <input
                  type="password"
                  placeholder="ยืนยันรหัสผ่าน"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/25 transition-all"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl font-bold text-white hover:shadow-lg hover:shadow-pink-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  กำลังสร้างร้านค้า...
                </span>
              ) : (
                "🚀 สร้างร้านค้าฟรี"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              มีบัญชีอยู่แล้ว?{" "}
              <Link href="/login" className="text-pink-400 hover:text-pink-300 font-medium">
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          การสมัครถือว่าคุณยอมรับ{" "}
          <a href="#" className="text-gray-500 hover:text-gray-400">เงื่อนไขการใช้งาน</a>{" "}
          และ{" "}
          <a href="#" className="text-gray-500 hover:text-gray-400">นโยบายความเป็นส่วนตัว</a>
        </p>
      </div>
    </div>
  );
}
