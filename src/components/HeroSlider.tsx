"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Slide {
    id: number;
    title: string;
    subtitle: string;
    bgGradient: string;
    icon: string;
}

const slides: Slide[] = [
    {
        id: 1,
        title: "Premium Camera Skin",
        subtitle: "สติ๊กเกอร์กันรอยกล้อง คุณภาพ 3M",
        bgGradient: "from-[#1a1a2e] via-[#16213e] to-[#0f3460]",
        icon: "📷",
    },
    {
        id: 2,
        title: "ป้องกันรอบด้าน",
        subtitle: "กันน้ำ กันรอย ลอกออกง่าย ไม่ทิ้งกาว",
        bgGradient: "from-[#0f3460] via-[#533483] to-[#e94560]",
        icon: "🛡️",
    },
    {
        id: 3,
        title: "76+ ลายให้เลือก",
        subtitle: "หลากหลายสไตล์ ตอบโจทย์ทุกความต้องการ",
        bgGradient: "from-[#2d3436] via-[#636e72] to-[#4267B2]",
        icon: "🎨",
    },
];

export default function HeroSlider() {
    const [current, setCurrent] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const goToSlide = useCallback(
        (index: number) => {
            if (isTransitioning) return;
            setIsTransitioning(true);
            setCurrent(index);
            setTimeout(() => setIsTransitioning(false), 500);
        },
        [isTransitioning]
    );

    const nextSlide = useCallback(() => {
        goToSlide((current + 1) % slides.length);
    }, [current, goToSlide]);

    const prevSlide = useCallback(() => {
        goToSlide((current - 1 + slides.length) % slides.length);
    }, [current, goToSlide]);

    // Auto-play
    useEffect(() => {
        const timer = setInterval(nextSlide, 5000);
        return () => clearInterval(timer);
    }, [nextSlide]);

    return (
        <div className="relative w-full overflow-hidden" style={{ height: 200 }}>
            {/* Slides */}
            {slides.map((slide, index) => (
                <div
                    key={slide.id}
                    className={`absolute inset-0 bg-gradient-to-r ${slide.bgGradient} transition-all duration-500 ease-in-out
                        ${index === current ? "opacity-100 translate-x-0" : index < current ? "opacity-0 -translate-x-full" : "opacity-0 translate-x-full"}`}
                >
                    {/* Decorative elements */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-white/[0.02] rounded-full" />
                    </div>

                    {/* Content */}
                    <div className="relative h-full flex items-center px-6 max-w-7xl mx-auto">
                        <div className="flex items-center gap-5">
                            <div className="text-5xl md:text-6xl flex-shrink-0 drop-shadow-lg">
                                {slide.icon}
                            </div>
                            <div>
                                <h2 className="text-white text-lg md:text-2xl font-bold mb-1 tracking-tight">
                                    {slide.title}
                                </h2>
                                <p className="text-white/70 text-sm md:text-base font-light">
                                    {slide.subtitle}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {/* Navigation Arrows */}
            <button
                onClick={prevSlide}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm 
                    flex items-center justify-center text-white/80 hover:bg-white/20 transition-all z-10"
                aria-label="Previous slide"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
            <button
                onClick={nextSlide}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm 
                    flex items-center justify-center text-white/80 hover:bg-white/20 transition-all z-10"
                aria-label="Next slide"
            >
                <ChevronRight className="w-4 h-4" />
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${index === current
                                ? "w-6 bg-white"
                                : "w-1.5 bg-white/40 hover:bg-white/60"
                            }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
