import type { Metadata, Viewport } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sarabun",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SHOP_NAME || "ร้านค้าออนไลน์",
  description:
    process.env.NEXT_PUBLIC_SHOP_DESCRIPTION || "ร้านค้าออนไลน์ สั่งซื้อสินค้าง่าย จัดส่งรวดเร็ว",
  keywords: ["ร้านค้าออนไลน์", "สั่งซื้อ", "จัดส่ง", "e-commerce"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
