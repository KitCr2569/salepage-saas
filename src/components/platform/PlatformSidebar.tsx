"use client";
import Link from "next/link";

const NAV = [
  { id: "overview", icon: "📊", label: "ภาพรวม" },
  { id: "tenants", icon: "👥", label: "ลูกค้า" },
  { id: "invoices", icon: "💰", label: "แพ็คเกจ & ชำระเงิน" },
  { id: "invite", icon: "🔑", label: "รหัสเชิญ" },
  { id: "settings", icon: "⚙️", label: "ผู้ดูแลระบบ" },
];

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
  brandName?: string;
  email?: string;
}

export default function PlatformSidebar({ activeTab, onTabChange, brandName, email }: Props) {
  return (
    <aside className="w-56 min-h-screen bg-[#1a1a2e] border-r border-white/5 flex flex-col">
      {/* Brand */}
      <div className="p-4 border-b border-white/5">
        <Link href="/platform-admin" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-bold text-sm text-white">
            S
          </div>
          <div>
            <p className="font-bold text-sm text-white">{brandName || "SaaS Admin"}</p>
            <p className="text-[10px] text-gray-500">× AI UNLOCK</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5">
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
              activeTab === item.id
                ? "bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-400 font-medium"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-2 px-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs text-white font-bold">
            {email?.charAt(0)?.toUpperCase() || "A"}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-white truncate">{email || "admin"}</p>
            <p className="text-[10px] text-gray-500">ผู้ดูแลระบบ</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
