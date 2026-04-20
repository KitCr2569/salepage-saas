"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTenantAuthStore } from "@/store/useTenantAuthStore";

interface Stats {
  tenants: number;
  shops: number;
  orders: number;
  revenue: number;
}

interface PlanStat {
  name: string;
  slug: string;
  price: number;
  subscribers: number;
}

interface TenantItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  plan: string;
  planSlug: string;
  subscriptionStatus?: string;
  subscriptionEnd?: string;
  shops: { id: string; name: string; slug: string; isActive?: boolean }[];
  invoiceCount?: number;
  shopCount?: number;
}

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  description?: string;
  paymentSlip?: string;
  paidAt?: string;
  dueDate: string;
  createdAt: string;
  tenant?: { name: string; email: string };
}

type Tab = "overview" | "tenants" | "invoices";

export default function PlatformAdminPage() {
  const router = useRouter();
  const { token, tenant, loadFromStorage } = useTenantAuthStore();
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [planStats, setPlanStats] = useState<PlanStat[]>([]);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    loadFromStorage().then(() => setLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loaded && !token) router.push("/login");
  }, [loaded, token, router]);

  const fetchData = useCallback(
    async (action: string) => {
      if (!token) return;
      const res = await fetch(`/api/platform-admin?action=${action}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) return;

      if (action === "overview") {
        setStats(json.data.stats);
        setPlanStats(json.data.plans);
        setTenants(json.data.recentTenants);
      } else if (action === "tenants") {
        setTenants(json.data);
      } else if (action === "invoices") {
        setInvoices(json.data);
      }
    },
    [token]
  );

  useEffect(() => {
    if (token) fetchData(tab === "overview" ? "overview" : tab);
  }, [token, tab, fetchData]);

  const handleToggleTenant = async (id: string) => {
    if (!token) return;
    await fetch("/api/platform-admin", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "toggle_tenant", targetId: id }),
    });
    fetchData(tab === "overview" ? "overview" : "tenants");
  };

  const handleApproveInvoice = async (id: string) => {
    if (!token) return;
    await fetch("/api/platform-admin", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "approve_invoice", targetId: id }),
    });
    fetchData("invoices");
  };

  if (!loaded || !tenant) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const planColors: Record<string, string> = {
    free: "text-gray-400",
    starter: "text-blue-400",
    pro: "text-purple-400",
    premium: "text-yellow-400",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center font-bold text-sm">
                S
              </div>
              <span className="font-bold text-sm bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                Platform Admin
              </span>
            </Link>
          </div>
          <span className="text-xs text-gray-500">{tenant.email}</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-white/5 rounded-xl p-1 w-fit">
          {(
            [
              { id: "overview", label: "📊 ภาพรวม" },
              { id: "tenants", label: "👥 ผู้เช่า" },
              { id: "invoices", label: "💰 ใบเรียกเก็บเงิน" },
            ] as { id: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === "overview" && stats && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "ผู้เช่าทั้งหมด", value: stats.tenants, icon: "👥", color: "from-blue-500/20 to-cyan-500/20" },
                { label: "ร้านค้าทั้งหมด", value: stats.shops, icon: "🏪", color: "from-pink-500/20 to-purple-500/20" },
                { label: "ออเดอร์ทั้งหมด", value: stats.orders, icon: "🛒", color: "from-green-500/20 to-emerald-500/20" },
                {
                  label: "รายได้รวม",
                  value: `฿${stats.revenue.toLocaleString()}`,
                  icon: "💰",
                  color: "from-yellow-500/20 to-orange-500/20",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`p-5 rounded-2xl bg-gradient-to-br ${s.color} border border-white/5`}
                >
                  <span className="text-2xl">{s.icon}</span>
                  <p className="text-2xl font-bold mt-2">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Plan Distribution */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 mb-8">
              <h3 className="font-bold mb-4">📊 สมาชิกแต่ละแพ็กเกจ</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {planStats.map((p) => (
                  <div key={p.slug} className="bg-white/5 rounded-xl p-4 text-center">
                    <p className={`text-lg font-bold ${planColors[p.slug] || "text-white"}`}>
                      {p.subscribers}
                    </p>
                    <p className="text-sm text-gray-400">{p.name}</p>
                    <p className="text-xs text-gray-600">฿{Number(p.price).toLocaleString()}/เดือน</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Tenants */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
              <h3 className="font-bold mb-4">🆕 ผู้เช่าล่าสุด</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-left border-b border-white/5">
                      <th className="pb-3 font-medium">ชื่อ</th>
                      <th className="pb-3 font-medium">อีเมล</th>
                      <th className="pb-3 font-medium">แพ็กเกจ</th>
                      <th className="pb-3 font-medium">ร้าน</th>
                      <th className="pb-3 font-medium">สถานะ</th>
                      <th className="pb-3 font-medium">วันสมัคร</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {tenants.map((t) => (
                      <tr key={t.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 font-medium">{t.name}</td>
                        <td className="py-3 text-gray-400">{t.email}</td>
                        <td className="py-3">
                          <span className={planColors[t.planSlug] || "text-gray-400"}>
                            {t.plan}
                          </span>
                        </td>
                        <td className="py-3 text-gray-400">{t.shopCount || t.shops?.length || 0}</td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              t.isActive
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {t.isActive ? "ใช้งาน" : "ระงับ"}
                          </span>
                        </td>
                        <td className="py-3 text-gray-500">
                          {new Date(t.createdAt).toLocaleDateString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'), { timeZone: 'Asia/Bangkok' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Tenants Tab */}
        {tab === "tenants" && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
            <h3 className="font-bold mb-4">👥 ผู้เช่าทั้งหมด ({tenants.length} ราย)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-left border-b border-white/5">
                    <th className="pb-3 font-medium">ชื่อ</th>
                    <th className="pb-3 font-medium">อีเมล</th>
                    <th className="pb-3 font-medium">แพ็กเกจ</th>
                    <th className="pb-3 font-medium">ร้านค้า</th>
                    <th className="pb-3 font-medium">สถานะ</th>
                    <th className="pb-3 font-medium">วันสมัคร</th>
                    <th className="pb-3 font-medium">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 font-medium">{t.name}</td>
                      <td className="py-3 text-gray-400">{t.email}</td>
                      <td className="py-3">
                        <span className={planColors[t.planSlug] || "text-gray-400"}>
                          {t.plan}
                        </span>
                      </td>
                      <td className="py-3">
                        {t.shops?.map((s) => (
                          <Link
                            key={s.id}
                            href={`/shop/${s.slug}`}
                            target="_blank"
                            className="text-pink-400 hover:text-pink-300 text-xs mr-2"
                          >
                            {s.name}
                          </Link>
                        ))}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            t.isActive
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {t.isActive ? "ใช้งาน" : "ระงับ"}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500">
                        {new Date(t.createdAt).toLocaleDateString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'), { timeZone: 'Asia/Bangkok' })}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => handleToggleTenant(t.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium ${
                            t.isActive
                              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          }`}
                        >
                          {t.isActive ? "ระงับ" : "เปิดใช้"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invoices Tab */}
        {tab === "invoices" && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
            <h3 className="font-bold mb-4">💰 ใบเรียกเก็บเงิน ({invoices.length} รายการ)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-left border-b border-white/5">
                    <th className="pb-3 font-medium">เลข Invoice</th>
                    <th className="pb-3 font-medium">ลูกค้า</th>
                    <th className="pb-3 font-medium">จำนวนเงิน</th>
                    <th className="pb-3 font-medium">รายละเอียด</th>
                    <th className="pb-3 font-medium">สถานะ</th>
                    <th className="pb-3 font-medium">วันที่</th>
                    <th className="pb-3 font-medium">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="py-3">{(inv as any).tenant?.name || "-"}</td>
                      <td className="py-3 font-bold">฿{Number(inv.amount).toLocaleString()}</td>
                      <td className="py-3 text-gray-400 text-xs max-w-[200px] truncate">
                        {inv.description || "-"}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            inv.status === "PAID"
                              ? "bg-green-500/20 text-green-400"
                              : inv.status === "PENDING"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {inv.status === "PAID"
                            ? "ชำระแล้ว"
                            : inv.status === "PENDING"
                            ? "รอชำระ"
                            : inv.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500 text-xs">
                        {new Date(inv.createdAt).toLocaleDateString((typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH'), { timeZone: 'Asia/Bangkok' })}
                      </td>
                      <td className="py-3">
                        {inv.status === "PENDING" && (
                          <button
                            onClick={() => handleApproveInvoice(inv.id)}
                            className="px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-xs font-medium"
                          >
                            ✓ อนุมัติ
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        ยังไม่มีใบเรียกเก็บเงิน
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
