"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";
import { useProductStore } from "@/store/useProductStore";
import Header from "@/components/Header";
import CategoryTabs from "@/components/CategoryTabs";
import ProductGrid from "@/components/ProductGrid";
import ProductModal from "@/components/ProductModal";
import CartDrawer from "@/components/CartDrawer";
import BottomBar from "@/components/BottomBar";
import SearchModal from "@/components/SearchModal";
import CheckoutFlow from "@/components/CheckoutFlow";
import Footer from "@/components/Footer";

export default function ShopBySlug() {
  const params = useParams();
  const slug = params?.slug as string;
  const { closeProductModal, isProductModalOpen, setActiveCategory } = useCartStore();
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shopInfo, setShopInfo] = useState<{ name: string; logo: string | null } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab) {
        setActiveCategory(tab);
      }
    }
  }, [setActiveCategory]);

  // clear ก่อน browser paint — ไม่มี flash เลย
  useLayoutEffect(() => {
    useProductStore.setState({ products: [], categories: [] });
    setLoading(true);
    setNotFound(false);
  }, [slug]);

  // fetch ข้อมูลร้านหลัง slug เปลี่ยน
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/shop/by-slug/${slug}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          useProductStore.setState({
            products: json.data.products,
            categories: json.data.categories,
          });
          setShopInfo({ name: json.data.shop.name, logo: json.data.shop.logo });
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash !== "#modal-open" && isProductModalOpen) {
        closeProductModal();
      }
    };
    const handlePopState = () => {
      if (window.location.hash !== "#modal-open" && isProductModalOpen) {
        closeProductModal();
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isProductModalOpen, closeProductModal]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-6xl mb-4">🏪</p>
          <h1 className="text-2xl font-bold mb-2">ไม่พบร้านค้านี้</h1>
          <p className="text-gray-400 mb-6">ร้าน &quot;{slug}&quot; อาจยังไม่ได้เปิดให้บริการ</p>
          <a href="/" className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl font-semibold text-sm">
            กลับหน้าหลัก
          </a>
        </div>
      </div>
    );
  }

  if (loading) return null;

  return (
    <main className="min-h-screen bg-surface-100">
      <Header />
      <CategoryTabs />
      <div className="pt-[116px] pb-4">
        <ProductGrid />
        <Footer />
      </div>
      <BottomBar />
      <ProductModal />
      <CartDrawer />
      <SearchModal />
      <CheckoutFlow />
    </main>
  );
}
