"use client";
import { useLocaleStore } from "@/store/useLocaleStore";
import { ReactNode } from "react";

export function Trans({ th, en }: { th: string | ReactNode; en: string | ReactNode }) {
    const { locale } = useLocaleStore();
    return <>{locale === 'en' ? en : th}</>;
}

export function useT() {
    const { locale } = useLocaleStore();
    return (th: string, en: string) => locale === 'en' ? en : th;
}
