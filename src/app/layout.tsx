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
  title: "HDG Wrap | สติ๊กเกอร์กันรอยกล้อง เลนส์ ฟิล์มกันรอย 3M",
  description:
    "HDG Wrap สติ๊กเกอร์กันรอยกล้อง เลนส์ มือถือ คุณภาพวัสดุ 3M กันน้ำ กันรอย ลอกออกง่าย ไม่ทิ้งกาว มีให้เลือกมากกว่า 76 ลาย",
  keywords: ["สติ๊กเกอร์กันรอย", "ฟิล์มกันรอย", "camera skin", "HDG wrap", "3M", "กล้อง", "เลนส์"],
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
