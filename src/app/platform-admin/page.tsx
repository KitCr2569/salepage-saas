"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTenantAuthStore } from "@/store/useTenantAuthStore";
import PlatformSidebar from "@/components/platform/PlatformSidebar";

// ─── Types ─────────────────────────────────────────
interface Stats { tenants: number; shops: number; orders: number; revenue: number; monthlyRevenue: number; }
interface PlanStat { name: string; slug: string; price: number; subscribers: number; }
interface TenantItem {
  id: string; name: string; email: string; phone?: string;
  isActive: boolean; createdAt: string; plan: string; planSlug: string;
  shops: { id: string; name: string; slug: string }[];
  shopCount?: number; avatarUrl?: string;
}
interface InvoiceItem {
  id: string; invoiceNumber: string; amount: number; status: string;
  description?: string; dueDate: string; createdAt: string;
  tenant?: { name: string; email: string };
}

// ─── Plan Badge ─────────────────────────────────────
function PlanBadge({ slug }: { slug: string }) {
  const colors: Record<string, string> = {
    free: "bg-gray-600 text-gray-200",
    starter: "bg-blue-600 text-blue-100",
    pro: "bg-purple-600 text-purple-100",
    premium: "bg-amber-600 text-amber-100",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${colors[slug] || "bg-gray-600 text-gray-200"}`}>
      {slug}
    </span>
  );
}

// ─── Main Page ──────────────────────────────────────
export default function PlatformAdminPage() {
  const router = useRouter();
  const { token, tenant, loadFromStorage } = useTenantAuthStore();
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [planStats, setPlanStats] = useState<PlanStat[]>([]);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [search, setSearch] = useState("");

  // ─── Invite Code state ───
  const [invPlan, setInvPlan] = useState("starter");
  const [invQty, setInvQty] = useState(1);
  const [invName, setInvName] = useState("");
  const [invCodes, setInvCodes] = useState<any[]>([]);
  const [invTotal, setInvTotal] = useState(0);
  const [invUsed, setInvUsed] = useState(0);
  const [invCreating, setInvCreating] = useState(false);
  const [copied, setCopied] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => { loadFromStorage().then(() => setLoaded(true)); }, []);
  useEffect(() => { if (loaded && !token) router.push("/login"); }, [loaded, token, router]);

  const fetchData = useCallback(async (action: string) => {
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
  }, [token]);

  useEffect(() => {
    if (token) {
      if (tab === "overview") { fetchData("overview"); fetchInviteCodes(); }
      else if (tab === "tenants") fetchData("tenants");
      else if (tab === "invoices") fetchData("invoices");
      else if (tab === "invite") fetchInviteCodes();
    }
  }, [token, tab, fetchData]);

  const fetchInviteCodes = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/invite-codes", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        setInvCodes(json.data.codes || []);
        setInvTotal(json.data.total || 0);
        setInvUsed(json.data.used || 0);
      }
    } catch {}
  };

  const createInviteCode = async () => {
    if (!token) return;
    setInvCreating(true);
    try {
      await fetch("/api/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planSlug: invPlan, quantity: invQty, label: invName || null }),
      });
      setInvName("");
      fetchInviteCodes();
    } catch {}
    setInvCreating(false);
  };

  const handleToggle = async (id: string) => {
    if (!token) return;
    await fetch("/api/platform-admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "toggle_tenant", targetId: id }),
    });
    fetchData(tab === "overview" ? "overview" : "tenants");
  };

  const handleApprove = async (id: string) => {
    if (!token) return;
    await fetch("/api/platform-admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "approve_invoice", targetId: id }),
    });
    fetchData("invoices");
  };

  const handleUpgrade = async (id: string, planSlug: string) => {
    if (!token) return;
    await fetch("/api/platform-admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "upgrade_tenant", targetId: id, planSlug }),
    });
    fetchData(tab === "overview" ? "overview" : "tenants");
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`⚠️ ลบบัญชี "${name}" ถาวร? ข้อมูลทั้งหมดจะหายไป!`)) return;
    if (!token) return;
    await fetch("/api/platform-admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "delete_tenant", targetId: id }),
    });
    fetchData(tab === "overview" ? "overview" : "tenants");
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(""), 2000);
  };

  const deleteCode = async (id: string) => {
    if (!token) return;
    await fetch(`/api/invite-codes?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchInviteCodes();
  };


  if (!loaded || !tenant) {
    return (
      <div className="min-h-screen bg-[#0f0f23] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  const suspended = tenants.filter(t => !t.isActive).length;

  return (
    <div className="min-h-screen bg-[#0f0f23] text-white flex">
      <PlatformSidebar activeTab={tab} onTabChange={setTab} brandName="HDG ADS" email={tenant.email} />

      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="h-14 bg-[#1a1a2e]/80 backdrop-blur border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-10">
          <h1 className="font-bold text-lg">
            {tab === "overview" && "ระบบจัดการผู้ดูแล (Superadmin Dashboard)"}
            {tab === "tenants" && "รายชื่อลูกค้า (Tenants)"}
            {tab === "invoices" && "แพ็คเกจ & ชำระเงิน"}
            {tab === "invite" && "รหัสเชิญ (Invite Codes)"}
            {tab === "settings" && "ผู้ดูแลระบบ"}
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">ข้อมูลล่าสุด: ประมาณ 1 นาทีที่ผ่านมา</span>
            <button onClick={() => fetchData(tab === "overview" ? "overview" : tab)}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs">
              🔄 รีเฟรช
            </button>
          </div>
        </div>

        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* ════════ OVERVIEW ════════ */}
          {tab === "overview" && stats && (
            <>
              <p className="text-sm text-gray-400">ตรวจสอบและจัดการลูกค้าทั้งหมดในระบบ</p>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "ลูกค้าทั้งหมด", value: stats.tenants, icon: "👥", sub: "" },
                  { label: "รายได้ต่อเดือน", value: `฿${stats.monthlyRevenue.toLocaleString()}`, icon: "💰",
                    sub: planStats.map(p => `${p.slug}: ${p.subscribers} × ฿${Number(p.price).toLocaleString()}`).join(" · ") },
                  { label: "รายได้รวม (ชำระแล้ว)", value: `฿${stats.revenue.toLocaleString()}`, icon: "📊", sub: "จากใบเรียกเก็บทั้งหมด" },
                  { label: "ร้านค้าทั้งหมด", value: stats.shops, icon: "🏪", sub: "ร้านค้าในระบบ" },
                ].map((s, i) => (
                  <div key={i} className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">{s.label}</span>
                      <span className="text-lg opacity-50">{s.icon}</span>
                    </div>
                    <p className={`text-2xl font-bold ${i === 1 ? "text-amber-400" : ""}`}>{s.value}</p>
                    {s.sub && <p className="text-[10px] text-gray-600 mt-1">{s.sub}</p>}
                  </div>
                ))}
              </div>

              {/* Plan distribution row */}
              <div className="grid grid-cols-3 gap-4">
                {planStats.map(p => (
                  <div key={p.slug} className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      p.slug === "pro" ? "bg-purple-500/20" : p.slug === "starter" ? "bg-blue-500/20" : "bg-gray-500/20"
                    }`}>
                      {p.slug === "pro" ? "💎" : p.slug === "starter" ? "👤" : "🆓"}
                    </div>
                    <div>
                      <p className="text-xl font-bold">{p.subscribers}</p>
                      <p className="text-xs text-gray-500">{p.name} ({Number(p.price).toLocaleString()} ฿/เดือน)</p>
                    </div>
                  </div>
                ))}
                <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-lg">🚫</div>
                  <div>
                    <p className="text-xl font-bold">{suspended}</p>
                    <p className="text-xs text-gray-500">ถูกระงับ</p>
                  </div>
                </div>
              </div>

              {/* Tenant List */}
              <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-5 flex items-center justify-between border-b border-white/5">
                  <h3 className="font-bold">รายชื่อลูกค้า (Tenants)</h3>
                  <input type="text" placeholder="🔍 ค้นหาชื่อ, อีเมล..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm w-64 outline-none focus:border-amber-500/50" />
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-left border-b border-white/5">
                      <th className="px-5 py-3 font-medium">ลูกค้า</th>
                      <th className="px-5 py-3 font-medium">แพ็กเกจ</th>
                      <th className="px-5 py-3 font-medium">สถานะ</th>
                      <th className="px-5 py-3 font-medium">ร้านค้า</th>
                      <th className="px-5 py-3 font-medium">กลุ่ม</th>
                      <th className="px-5 py-3 font-medium">วันที่สมัคร</th>
                      <th className="px-5 py-3 font-medium">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map(t => (
                      <tr key={t.id} className="hover:bg-white/[0.02]">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold">
                              {t.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium flex items-center gap-1">{t.name} <span className="text-amber-400 text-xs">👑</span></p>
                              <p className="text-xs text-gray-500">{t.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3"><PlanBadge slug={t.planSlug} /></td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs ${t.isActive ? "text-green-400" : "text-red-400"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${t.isActive ? "bg-green-400" : "bg-red-400"}`} />
                            {t.isActive ? "ใช้งาน" : "ระงับ"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-400">{t.shopCount || t.shops?.length || 0}</td>
                        <td className="px-5 py-3 text-gray-400">0</td>
                        <td className="px-5 py-3 text-gray-500 text-xs">
                          {new Date(t.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-5 py-3 relative">
                          <button onClick={() => setOpenMenu(openMenu === t.id ? null : t.id)}
                            className="text-gray-400 hover:text-white text-lg px-2">⋯</button>
                          {openMenu === t.id && (
                            <div className="absolute right-8 top-8 z-50 w-48 bg-[#1e1e3a] border border-white/10 rounded-xl shadow-2xl py-1 text-sm"
                              onMouseLeave={() => setOpenMenu(null)}>
                              {t.planSlug !== "pro" ? (
                                <button onClick={() => { handleUpgrade(t.id, "pro"); setOpenMenu(null); }}
                                  className="w-full text-left px-4 py-2 hover:bg-white/5 text-blue-400">⬆ อัปเกรดเป็น Pro</button>
                              ) : (
                                <button onClick={() => { handleUpgrade(t.id, "starter"); setOpenMenu(null); }}
                                  className="w-full text-left px-4 py-2 hover:bg-white/5 text-orange-400">⬇ ดาวน์เกรดเป็น Starter</button>
                              )}
                              <div className="border-t border-white/5 my-1" />
                              <button onClick={() => { handleToggle(t.id); setOpenMenu(null); }}
                                className={`w-full text-left px-4 py-2 hover:bg-white/5 ${t.isActive ? "text-yellow-400" : "text-green-400"}`}>
                                {t.isActive ? "⏸ ระงับบัญชี" : "▶ เปิดบัญชี"}
                              </button>
                              <div className="border-t border-white/5 my-1" />
                              <button onClick={() => { handleDelete(t.id, t.name); setOpenMenu(null); }}
                                className="w-full text-left px-4 py-2 hover:bg-white/5 text-red-400">🗑 ลบบัญชีถาวร</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={7} className="py-8 text-center text-gray-600">ยังไม่มีลูกค้า</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Invite Codes */}
              <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold flex items-center gap-2">🔑 รหัสเชิญ (Invite Codes)</h3>
                    <p className="text-xs text-gray-500 mt-0.5">สร้างรหัสเชิญให้ลูกค้าใหม่สำหรับลงทะเบียน</p>
                  </div>
                  <span className="text-xs text-gray-600">{invTotal} รหัสเชิญ / {invUsed} ใช้แล้ว</span>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">แพ็กเกจ</label>
                    <select value={invPlan} onChange={e => setInvPlan(e.target.value)}
                      className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm outline-none">
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">จำนวน</label>
                    <select value={invQty} onChange={e => setInvQty(Number(e.target.value))}
                      className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm outline-none">
                      {[1,2,3,5,10].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500 mb-1 block">ชื่อ (ไม่จำเป็น)</label>
                    <input type="text" placeholder="ชื่อลูกค้า..." value={invName}
                      onChange={e => setInvName(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm outline-none focus:border-amber-500/50" />
                  </div>
                  <div className="pt-4">
                    <button onClick={createInviteCode} disabled={invCreating}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-amber-500/20 transition-all disabled:opacity-50">
                      {invCreating ? '⏳...' : '+ สร้างรหัสเชิญ'}
                    </button>
                  </div>
                </div>

                {/* Codes list */}
                {invCodes.length > 0 && (
                  <div className="mt-4 space-y-1.5 max-h-48 overflow-y-auto">
                    {invCodes.slice(0, 10).map((c: any) => (
                      <div key={c.id} className={`flex items-center justify-between px-3 py-2 bg-white/[0.03] rounded-lg text-sm ${c.isUsed ? "opacity-50" : ""}`}>
                        <code className="font-mono text-amber-400">{c.code}</code>
                        <span className="text-xs text-gray-500 uppercase">{c.planSlug}</span>
                        <span className="text-xs text-gray-500">{c.label || "-"}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.isUsed ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                          {c.isUsed ? "ใช้แล้ว" : "ว่าง"}
                        </span>
                        <div className="flex gap-1">
                          {!c.isUsed && (
                            <>
                              <button onClick={() => copyCode(c.code)} title="คัดลอก"
                                className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-all">
                                {copied === c.code ? "✓" : "📋"}
                              </button>
                              <button onClick={() => deleteCode(c.id)} title="ลบ"
                                className="px-2 py-1 text-xs bg-white/5 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400 transition-all">
                                🗑
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ════════ INVITE TAB (full view) ════════ */}
          {tab === "invite" && (
            <div className="space-y-6">
              <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-5">
                <h3 className="font-bold mb-4">🔑 สร้างรหัสเชิญ</h3>
                <div className="flex items-center gap-3">
                  <select value={invPlan} onChange={e => setInvPlan(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm outline-none">
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="premium">Premium</option>
                  </select>
                  <select value={invQty} onChange={e => setInvQty(Number(e.target.value))}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm outline-none">
                    {[1,2,3,5,10].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <input type="text" placeholder="ชื่อลูกค้า..." value={invName}
                    onChange={e => setInvName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm outline-none" />
                  <button onClick={createInviteCode} disabled={invCreating}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                    {invCreating ? "⏳..." : "+ สร้าง"}
                  </button>
                </div>
              </div>

              <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/5 flex justify-between">
                  <h3 className="font-bold">รายการรหัสเชิญทั้งหมด ({invTotal})</h3>
                  <span className="text-xs text-gray-500">ใช้แล้ว {invUsed} / ว่าง {invTotal - invUsed}</span>
                </div>
                <div className="divide-y divide-white/5">
                  {invCodes.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02]">
                      <code className="font-mono text-amber-400 text-sm">{c.code}</code>
                      <PlanBadge slug={c.planSlug} />
                      <span className="text-xs text-gray-500">{c.label || "-"}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.isUsed ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                        {c.isUsed ? "ใช้แล้ว" : "ว่าง"}
                      </span>
                      <span className="text-xs text-gray-600">
                        {new Date(c.createdAt).toLocaleDateString("th-TH")}
                      </span>
                    </div>
                  ))}
                  {invCodes.length === 0 && (
                    <div className="py-8 text-center text-gray-600">ยังไม่มีรหัสเชิญ</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════════ TENANTS TAB ════════ */}
          {tab === "tenants" && (
            <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl overflow-hidden">
              <div className="p-5 flex items-center justify-between border-b border-white/5">
                <h3 className="font-bold">👥 ลูกค้าทั้งหมด ({tenants.length} ราย)</h3>
                <input type="text" placeholder="🔍 ค้นหา..." value={search} onChange={e => setSearch(e.target.value)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm w-64 outline-none focus:border-amber-500/50" />
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-left border-b border-white/5">
                    <th className="px-5 py-3 font-medium">ลูกค้า</th>
                    <th className="px-5 py-3 font-medium">แพ็กเกจ</th>
                    <th className="px-5 py-3 font-medium">สถานะ</th>
                    <th className="px-5 py-3 font-medium">ร้านค้า</th>
                    <th className="px-5 py-3 font-medium">วันที่สมัคร</th>
                    <th className="px-5 py-3 font-medium">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map(t => (
                    <tr key={t.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold">
                            {t.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{t.name}</p>
                            <p className="text-xs text-gray-500">{t.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3"><PlanBadge slug={t.planSlug} /></td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs ${t.isActive ? "text-green-400" : "text-red-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${t.isActive ? "bg-green-400" : "bg-red-400"}`} />
                          {t.isActive ? "ใช้งาน" : "ระงับ"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400">{t.shopCount || t.shops?.length || 0}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {new Date(t.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => handleToggle(t.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium ${
                            t.isActive ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          }`}>
                          {t.isActive ? "ระงับ" : "เปิดใช้"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ════════ INVOICES TAB ════════ */}
          {tab === "invoices" && (
            <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-white/5">
                <h3 className="font-bold">💰 ใบเรียกเก็บเงิน ({invoices.length} รายการ)</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-left border-b border-white/5">
                    <th className="px-5 py-3 font-medium">เลข Invoice</th>
                    <th className="px-5 py-3 font-medium">ลูกค้า</th>
                    <th className="px-5 py-3 font-medium">จำนวนเงิน</th>
                    <th className="px-5 py-3 font-medium">สถานะ</th>
                    <th className="px-5 py-3 font-medium">วันที่</th>
                    <th className="px-5 py-3 font-medium">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="px-5 py-3">{inv.tenant?.name || "-"}</td>
                      <td className="px-5 py-3 font-bold text-amber-400">฿{Number(inv.amount).toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          inv.status === "PAID" ? "bg-green-500/20 text-green-400"
                            : inv.status === "PENDING" ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                        }`}>
                          {inv.status === "PAID" ? "ชำระแล้ว" : inv.status === "PENDING" ? "รอชำระ" : inv.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {new Date(inv.createdAt).toLocaleDateString("th-TH")}
                      </td>
                      <td className="px-5 py-3">
                        {inv.status === "PENDING" && (
                          <button onClick={() => handleApprove(inv.id)}
                            className="px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-xs font-medium">
                            ✓ อนุมัติ
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-gray-600">ยังไม่มีใบเรียกเก็บเงิน</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ════════ SETTINGS TAB ════════ */}
          {tab === "settings" && <SettingsPanel token={token} />}
        </div>
      </main>
    </div>
  );
}

// ─── Settings Panel ────────────────────────────────────
function SettingsPanel({ token }: { token: string | null }) {
  const [lineId, setLineId] = useState("");
  const [lineUrl, setLineUrl] = useState("");
  const [fbUrl, setFbUrl] = useState("");
  const [brand, setBrand] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/platform-settings").then(r => r.json()).then(d => {
      const s = d.data || {};
      setLineId(s.line_id || ""); setLineUrl(s.line_url || "");
      setFbUrl(s.facebook_url || ""); setBrand(s.brand_name || "");
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/platform-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ settings: [
        { key: "line_id", value: lineId }, { key: "line_url", value: lineUrl },
        { key: "facebook_url", value: fbUrl }, { key: "brand_name", value: brand },
      ] }),
    });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const ic = "w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm outline-none focus:border-amber-500/50 text-white";
  if (loading) return <div className="py-12 text-center text-gray-600">⏳ กำลังโหลด...</div>;

  return (
    <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6">
      <h3 className="font-bold mb-1 flex items-center gap-2">⚙️ ตั้งค่าข้อมูลติดต่อ</h3>
      <p className="text-xs text-gray-500 mb-6">ข้อมูลจะแสดงที่หน้า Landing, Login และหลังบ้าน</p>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-xs text-gray-400 mb-1.5 block">💬 LINE ID</label>
          <input type="text" placeholder="@hdgsaas" value={lineId} onChange={e => setLineId(e.target.value)} className={ic} /></div>
        <div><label className="text-xs text-gray-400 mb-1.5 block">🔗 LINE URL</label>
          <input type="text" placeholder="https://line.me/ti/p/@hdgsaas" value={lineUrl} onChange={e => setLineUrl(e.target.value)} className={ic} /></div>
        <div><label className="text-xs text-gray-400 mb-1.5 block">📘 Facebook Page URL</label>
          <input type="text" placeholder="https://facebook.com/hdgsaas" value={fbUrl} onChange={e => setFbUrl(e.target.value)} className={ic} /></div>
        <div><label className="text-xs text-gray-400 mb-1.5 block">✨ ชื่อแบรนด์</label>
          <input type="text" placeholder="HDG ADS" value={brand} onChange={e => setBrand(e.target.value)} className={ic} /></div>
      </div>
      <div className="mt-6 flex justify-end">
        <button onClick={save} disabled={saving}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50">
          {saved ? "✅ บันทึกแล้ว!" : saving ? "⏳..." : "💾 บันทึกการตั้งค่า"}
        </button>
      </div>
    </div>
  );
}
