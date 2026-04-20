import { create } from "zustand";

interface TenantShop {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  description?: string;
  themeColor?: string;
  isActive: boolean;
  productCount?: number;
  categoryCount?: number;
  orderCount?: number;
}

interface TenantPlan {
  name: string;
  slug: string;
  price?: number;
  maxProducts: number;
  maxShops: number;
  features?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  autoRenew?: boolean;
}

interface TenantUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
}

interface TenantAuthState {
  // State
  token: string | null;
  tenant: TenantUser | null;
  shops: TenantShop[];
  activeShop: TenantShop | null;
  plan: TenantPlan | null;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    shopName: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loadFromStorage: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setActiveShop: (shop: TenantShop) => void;
}

export const useTenantAuthStore = create<TenantAuthState>((set, get) => ({
  token: null,
  tenant: null,
  shops: [],
  activeShop: null,
  plan: null,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/tenant/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();

      if (!json.success) {
        set({ isLoading: false });
        return { success: false, error: json.error };
      }

      const { token, tenant, shops, plan } = json.data;
      const activeShop = shops?.[0] || null;

      // Save to localStorage
      localStorage.setItem("tenant-token", token);
      localStorage.setItem("tenant-data", JSON.stringify({ tenant, shops, plan }));
      if (activeShop) {
        localStorage.setItem("tenant-active-shop", JSON.stringify(activeShop));
      }

      set({ token, tenant, shops, activeShop, plan, isLoading: false });
      return { success: true };
    } catch {
      set({ isLoading: false });
      return { success: false, error: "เกิดข้อผิดพลาดในการเชื่อมต่อ" };
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/tenant/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!json.success) {
        set({ isLoading: false });
        return { success: false, error: json.error };
      }

      const { token, tenant, shop, plan } = json.data;
      const activeShop = shop
        ? { id: shop.id, slug: shop.slug, name: shop.name, logo: null, isActive: true }
        : null;
      const shops = activeShop ? [activeShop] : [];

      localStorage.setItem("tenant-token", token);
      localStorage.setItem("tenant-data", JSON.stringify({ tenant, shops, plan }));
      if (activeShop) {
        localStorage.setItem("tenant-active-shop", JSON.stringify(activeShop));
      }

      set({ token, tenant, shops, activeShop, plan, isLoading: false });
      return { success: true };
    } catch {
      set({ isLoading: false });
      return { success: false, error: "เกิดข้อผิดพลาดในการสมัคร" };
    }
  },

  logout: () => {
    localStorage.removeItem("tenant-token");
    localStorage.removeItem("tenant-data");
    localStorage.removeItem("tenant-active-shop");
    set({ token: null, tenant: null, shops: [], activeShop: null, plan: null });
  },

  loadFromStorage: async () => {
    const token = localStorage.getItem("tenant-token");
    if (!token) return;

    const dataStr = localStorage.getItem("tenant-data");
    const activeShopStr = localStorage.getItem("tenant-active-shop");

    if (dataStr) {
      try {
        const { tenant, shops, plan } = JSON.parse(dataStr);
        const activeShop = activeShopStr ? JSON.parse(activeShopStr) : shops?.[0] || null;
        set({ token, tenant, shops, activeShop, plan });
      } catch {
        // Invalid data, clear
        get().logout();
      }
    }

    // Refresh profile in background
    get().refreshProfile();
  },

  refreshProfile: async () => {
    const { token } = get();
    if (!token) return;

    try {
      const res = await fetch("/api/tenant/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (json.success) {
        const { tenant, shops, plan } = json.data;
        const currentActiveShop = get().activeShop;
        const activeShop =
          shops.find((s: TenantShop) => s.id === currentActiveShop?.id) ||
          shops[0] ||
          null;

        localStorage.setItem(
          "tenant-data",
          JSON.stringify({ tenant, shops, plan })
        );
        if (activeShop) {
          localStorage.setItem(
            "tenant-active-shop",
            JSON.stringify(activeShop)
          );
        }

        set({ tenant, shops, activeShop, plan });
      } else {
        // Token invalid/expired
        get().logout();
      }
    } catch {
      // Silently fail, keep existing data
    }
  },

  setActiveShop: (shop) => {
    localStorage.setItem("tenant-active-shop", JSON.stringify(shop));
    set({ activeShop: shop });
  },
}));
