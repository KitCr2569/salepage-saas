"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "1618165805968471";
const FB_SCOPE = "pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement";

export default function RegisterPage() {
  const router = useRouter();

  // Steps: 1=invite code, 2=FB login, 3=select page
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [inviteCode, setInviteCode] = useState("");
  const [invitePlan, setInvitePlan] = useState("");
  const [checkingCode, setCheckingCode] = useState(false);
  const [error, setError] = useState("");

  // FB data
  const [fbToken, setFbToken] = useState("");
  const [fbPages, setFbPages] = useState<any[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);

  // ─── Step 1: Validate Invite Code ───
  const handleCheckCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCheckingCode(true);
    try {
      const res = await fetch("/api/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate", code: inviteCode.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setInvitePlan(json.data.planSlug);
        setStep(2);
      } else {
        setError(json.error || "รหัสเชิญไม่ถูกต้อง");
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
    setCheckingCode(false);
  };

  // ─── Step 2: Facebook Login ───
  const handleFbLogin = () => {
    const redirectUri = `${window.location.origin}/register`;
    const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${FB_SCOPE}&response_type=token`;
    window.location.href = url;
  };

  // Check for FB token in URL hash on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get("access_token");
      if (token) {
        setFbToken(token);
        setStep(3);
        // Fetch pages
        setLoadingPages(true);
        fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${token}&fields=id,name,picture,access_token`)
          .then(r => r.json())
          .then(data => {
            setFbPages(data.data || []);
            setLoadingPages(false);
          })
          .catch(() => setLoadingPages(false));
        // Restore invite code from sessionStorage
        const saved = sessionStorage.getItem("register-invite");
        if (saved) {
          const { code, plan } = JSON.parse(saved);
          setInviteCode(code);
          setInvitePlan(plan);
        }
        // Clean hash
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save invite code before FB redirect
  const handleFbLoginWithSave = () => {
    sessionStorage.setItem("register-invite", JSON.stringify({ code: inviteCode, plan: invitePlan }));
    handleFbLogin();
  };

  // ─── Step 3: Select Page & Create Account ───
  const handleSelectPage = async (page: any) => {
    setCreatingAccount(true);
    setError("");
    try {
      // Get FB user info
      const userRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${fbToken}&fields=name,email`);
      const userData = await userRes.json();

      // Create tenant + shop via API
      const res = await fetch("/api/tenant/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userData.email || `fb_${userData.id}@platform.local`,
          password: `fb_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          name: userData.name || "Facebook User",
          shopName: page.name,
          inviteCode: inviteCode,
          facebookPageId: page.id,
          facebookPageToken: page.access_token,
          facebookUserId: userData.id,
          facebookAccessToken: fbToken,
        }),
      });
      const json = await res.json();
      if (json.success) {
        // Save auth
        const { token, tenant, shops, plan } = json.data;
        localStorage.setItem("tenant-token", token);
        localStorage.setItem("tenant-data", JSON.stringify({ tenant, shops, plan }));
        if (shops?.[0]) localStorage.setItem("tenant-active-shop", JSON.stringify(shops[0]));
        router.push("/admin");
      } else {
        setError(json.error || "สร้างบัญชีล้มเหลว");
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการสร้างบัญชี");
    }
    setCreatingAccount(false);
  };

  const inputClass = "w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25 transition-all";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#1a1a2e] to-slate-950 flex items-center justify-center px-4 py-12">
      <div className="fixed top-20 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-amber-500/20">S</div>
            <span className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">SaaS Platform</span>
          </Link>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step >= s ? "bg-amber-500 text-white" : "bg-white/10 text-gray-500"
              }`}>{s}</div>
              {s < 3 && <div className={`w-8 h-0.5 ${step > s ? "bg-amber-500" : "bg-white/10"}`} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl">

          {/* ═══ Step 1: Invite Code ═══ */}
          {step === 1 && (
            <>
              <div className="text-center mb-6">
                <span className="text-4xl mb-3 block">🔑</span>
                <h1 className="text-2xl font-bold text-white mb-2">กรอกรหัสเชิญ</h1>
                <p className="text-sm text-gray-400">กรุณากรอกรหัสเชิญที่ได้รับจากผู้ดูแลระบบ</p>
              </div>
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">⚠️ {error}</div>}
              <form onSubmit={handleCheckCode} className="space-y-4">
                <input type="text" placeholder="INV-XXXXXXXX" value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())} required
                  className={`${inputClass} text-center text-lg tracking-widest font-mono`} />
                <button type="submit" disabled={checkingCode || !inviteCode.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-bold text-white hover:shadow-lg hover:shadow-amber-500/25 transition-all disabled:opacity-50">
                  {checkingCode ? "⏳ กำลังตรวจสอบ..." : "ตรวจสอบรหัสเชิญ →"}
                </button>
              </form>
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">มีบัญชีอยู่แล้ว? <Link href="/login" className="text-amber-400 hover:text-amber-300 font-medium">เข้าสู่ระบบ</Link></p>
              </div>
            </>
          )}

          {/* ═══ Step 2: Facebook Login ═══ */}
          {step === 2 && (
            <>
              <div className="text-center mb-6">
                <span className="text-4xl mb-3 block">📘</span>
                <h1 className="text-2xl font-bold text-white mb-2">เชื่อมต่อ Facebook</h1>
                <p className="text-sm text-gray-400">เข้าสู่ระบบด้วย Facebook เพื่อเลือกเพจที่ต้องการจัดการ</p>
                <div className="mt-3">
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-bold uppercase">{invitePlan}</span>
                </div>
              </div>
              <button onClick={handleFbLoginWithSave}
                className="w-full py-3.5 bg-[#1877F2] rounded-xl font-bold text-white hover:bg-[#166FE5] transition-all flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                เข้าสู่ระบบด้วย Facebook
              </button>
              <button onClick={() => setStep(1)} className="w-full mt-4 text-sm text-gray-500 hover:text-gray-300">← กลับไปกรอกรหัสเชิญ</button>
            </>
          )}

          {/* ═══ Step 3: Select Page ═══ */}
          {step === 3 && (
            <>
              <div className="text-center mb-6">
                <span className="text-4xl mb-3 block">📄</span>
                <h1 className="text-2xl font-bold text-white mb-2">เลือกเพจ</h1>
                <p className="text-sm text-gray-400">เลือกเพจ Facebook ที่ต้องการเชื่อมต่อกับร้านค้า</p>
              </div>
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">⚠️ {error}</div>}
              {loadingPages ? (
                <div className="py-8 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">กำลังโหลดเพจ...</p>
                </div>
              ) : fbPages.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">ไม่พบเพจ Facebook ที่คุณเป็นผู้ดูแล</div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {fbPages.map(page => (
                    <button key={page.id} onClick={() => handleSelectPage(page)} disabled={creatingAccount}
                      className="w-full flex items-center gap-3 p-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl transition-all text-left disabled:opacity-50">
                      {page.picture?.data?.url ? (
                        <img src={page.picture.data.url} alt="" className="w-10 h-10 rounded-lg" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-lg">📄</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{page.name}</p>
                        <p className="text-xs text-gray-500">ID: {page.id}</p>
                      </div>
                      <span className="text-amber-400 text-sm">เลือก →</span>
                    </button>
                  ))}
                </div>
              )}
              {creatingAccount && (
                <div className="mt-4 text-center text-amber-400 text-sm">⏳ กำลังสร้างบัญชี...</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
