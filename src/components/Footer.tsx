"use client";

import { useCartStore } from "@/store/useCartStore";
import { useShopStore } from "@/store/useShopStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { getThemeById } from "@/lib/themes";
import { MessageCircle, Phone } from "lucide-react";

interface FooterProps {
    pageId?: string;
}

export default function Footer({ pageId }: FooterProps) {
    const { language } = useCartStore();
    const { shopConfig } = useShopStore();
    const { lineUrl, phoneNumber, refundPolicyUrl, salePageTheme } = useSettingsStore();
    const theme = getThemeById(salePageTheme);

    // Use pageId for Facebook/Messenger links, fallback to HDG page
    const fbPageId = pageId || "114336388182180";
    const fbLink = `https://www.facebook.com/${fbPageId}`;
    const messengerLink = `https://m.me/${fbPageId}`;

    return (
        <footer className="pb-20 pt-10 px-4 mt-8" style={{ backgroundColor: theme.vars['--sp-footer-bg'] }}>
            <div className="max-w-7xl mx-auto">
                {/* Shop Info */}
                <div className="flex flex-col items-center text-center mb-6">
                    <img
                        src={shopConfig.shopLogo}
                        alt={shopConfig.shopName}
                        className="w-16 h-16 rounded-full object-cover mb-3 shadow-md"
                    />
                    <h3 className="text-sm font-semibold mb-1" style={{ color: theme.vars['--sp-text'] }}>
                        {shopConfig.shopName}
                    </h3>
                </div>

                {/* Contact Links */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <a
                        href={fbLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                        <svg className="w-4 h-4 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        <span className="text-xs font-medium text-gray-700">Facebook</span>
                    </a>
                    <a
                        href={messengerLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors"
                    >
                        <MessageCircle className="w-4 h-4 text-purple-500" />
                        <span className="text-xs font-medium text-gray-700">Messenger</span>
                    </a>
                    <a
                        href={lineUrl || "https://line.me/ti/p/hdgwrap"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-50 hover:bg-green-100 transition-colors"
                    >
                        <svg className="w-4 h-4 text-[#06C755]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                        </svg>
                        <span className="text-xs font-medium text-gray-700">LINE</span>
                    </a>
                    <a
                        href={`tel:${phoneNumber || "+66891234567"}`}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors"
                    >
                        <Phone className="w-4 h-4 text-orange-500" />
                        <span className="text-xs font-medium text-gray-700">
                            {language === "th" ? "โทรหาเรา" : "Call Us"}
                        </span>
                    </a>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100 pt-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                        <a
                            href={refundPolicyUrl || "#"}
                            className="text-xs text-gray-400 hover:text-[#4267B2] transition-colors underline underline-offset-4"
                        >
                            {language === "th"
                                ? "เงื่อนไขและนโยบายการคืนเงิน"
                                : "Terms and Refund Policy"}
                        </a>
                        <p className="text-xs text-gray-300">
                            © 2026 {shopConfig.shopName}. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
