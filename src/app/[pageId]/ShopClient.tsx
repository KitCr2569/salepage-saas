"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/store/useCartStore";
import { useProductStore } from "@/store/useProductStore";
import { useShopStore } from "@/store/useShopStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { getThemeById } from "@/lib/themes";
import Header from "@/components/Header";
import CategoryTabs from "@/components/CategoryTabs";
import ProductGrid from "@/components/ProductGrid";
import TextureGallery from "@/components/TextureGallery";
import ProductModal from "@/components/ProductModal";
import CartDrawer from "@/components/CartDrawer";
import BottomBar from "@/components/BottomBar";
import SearchModal from "@/components/SearchModal";
import CheckoutFlow from "@/components/CheckoutFlow";
import Footer from "@/components/Footer";
import BannerCarousel from "@/components/BannerCarousel";

export default function ShopClient({
  pageId,
  initialShopData,
  initialSettings,
}: {
  pageId: string;
  initialShopData: any;
  initialSettings: any;
}) {
  const { closeProductModal, isProductModalOpen, activeCategory, setActiveCategory } = useCartStore();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab) {
        setActiveCategory(tab);
      }
    }
  }, [setActiveCategory]);

  // Seed data synchronously before first render
  if (!isInitialized.current) {
    if (initialSettings && Object.keys(initialSettings).length > 0) {
      useSettingsStore.setState(initialSettings);
    }
    if (initialShopData) {
      useProductStore.setState({
        products: initialShopData.products || [],
        categories: initialShopData.categories || [],
        textures: initialShopData.textures || [],
      });
      useShopStore.setState({
        shopConfig: initialShopData.shopConfig || null,
        categories: initialShopData.categories || [],
      });
    }
    isInitialized.current = true;
  }

  const salePageTheme = useSettingsStore((s) => s.salePageTheme);
  const theme = getThemeById(salePageTheme);

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


  return (
    <main
      className="min-h-screen"
      style={{
        backgroundColor: theme.vars['--sp-bg'],
        color: theme.vars['--sp-text'],
        ...Object.fromEntries(Object.entries(theme.vars)),
      } as React.CSSProperties}
    >
      <Header />
      <CategoryTabs />
      <div className="pt-[156px] pb-4">
        {/* Banner Carousel */}
        {activeCategory !== 'texture' && <BannerCarousel />}
        
        {activeCategory === 'texture' ? (
            <TextureGallery />
        ) : (
            <ProductGrid />
        )}
        
        <Footer pageId={pageId} />
      </div>
      <BottomBar />
      <ProductModal />
      <CartDrawer />
      <SearchModal />
      <CheckoutFlow />
    </main>
  );
}
