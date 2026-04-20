import type { Metadata, Viewport } from "next";
import AdminPWARegister from "@/components/admin/AdminPWARegister";

export const metadata: Metadata = {
    title: "Admin | จัดการร้านค้า",
    description: "ระบบจัดการร้านค้าและเซลเพจ",
    manifest: "/admin-manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "HDG Admin",
    },
    other: {
        "mobile-web-app-capable": "yes",
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    themeColor: "#0F0F23",
    interactiveWidget: "resizes-content",
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <AdminPWARegister />
            {children}
        </>
    );
}
