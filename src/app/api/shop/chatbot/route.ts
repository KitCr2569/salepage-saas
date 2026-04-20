import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFacebookPageConfig } from '@/lib/facebook';


export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const shop = await prisma.shop.findFirst({ orderBy: { createdAt: 'asc' } });
        if (!shop) return NextResponse.json({ success: false, error: "No shop found" });

        const config = shop.chatbotConfig || {
            greeting: "สวัสดีค่ะ ยินดีต้อนรับสู่ร้านของเรา 🚗✨\nมีอะไรให้แอดมินช่วยเหลือไหมคะ?",
            greetingOptions: ["ดูสินค้าทั้งหมด", "ติดต่อแอดมิน", "โปรโมชั่น"],
            outOfHours: "ขณะนี้อยู่นอกเวลาทำการค่ะ จะรีบติดต่อกลับโดยเร็วที่สุดนะคะ 🙏",
            orderConfirm: "ได้รับออเดอร์เรียบร้อยแล้วค่ะ! 🎉\nทีมงานจะตรวจสอบและยืนยันในเร็วๆ นี้นะคะ",
            isAutoReplyEnabled: true,
            isGreetingEnabled: true,
            faq: [
                { q: "ราคาเท่าไหร่", a: "สามารถดูราคาสินค้าได้ในหน้าเซลเพจของเราเลยค่ะ 💰" },
                { q: "ส่งได้ทั่วประเทศไหม", a: "เราจัดส่งทั่วประเทศเลยค่ะ 📦" },
            ],
            hours: {
                start: "09:00",
                end: "18:00"
            }
        };

        const { pageAccessToken } = await getFacebookPageConfig(req);
        const token = pageAccessToken;
        let fbConnection = { connected: false, pageName: null, error: "No token found" };
        
        if (token) {
            try {
                const fbRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${token}`);
                if (fbRes.ok) {
                    const fbData = await fbRes.json();
                    fbConnection = { connected: true, pageName: fbData.name, error: "" };
                } else {
                    const errorData = await fbRes.json();
                    fbConnection = { connected: false, pageName: null, error: errorData?.error?.message || "Invalid Token" };
                }
            } catch (err: any) {
                fbConnection = { connected: false, pageName: null, error: err.message };
            }
        }

        return NextResponse.json({ success: true, config, fbConnection });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const shop = await prisma.shop.findFirst({ orderBy: { createdAt: 'asc' } });
        if (!shop) return NextResponse.json({ success: false, error: "No shop found" });

        await prisma.shop.update({
            where: { id: shop.id },
            data: { chatbotConfig: body.config }
        });

        return NextResponse.json({ success: true, message: "Chatbot config updated!" });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
