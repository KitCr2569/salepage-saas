"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSettingsStore, type BannerSlide } from "@/store/useSettingsStore";
import { getThemeById } from "@/lib/themes";

export default function BannerCarousel() {
    const bannerSlides = useSettingsStore((s) => s.bannerSlides);
    const salePageTheme = useSettingsStore((s) => s.salePageTheme);
    const theme = getThemeById(salePageTheme);
    const [currentSlide, setCurrentSlide] = useState(0);

    // Filter only slides that have an image
    const activeSlides = bannerSlides.filter((s) => s.image);

    // Auto-advance slide every 5 seconds
    const nextSlide = useCallback(() => {
        if (activeSlides.length <= 1) return;
        setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
    }, [activeSlides.length]);

    useEffect(() => {
        if (activeSlides.length <= 1) return;
        const timer = setInterval(nextSlide, 5000);
        return () => clearInterval(timer);
    }, [nextSlide, activeSlides.length]);

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
    };

    if (activeSlides.length === 0) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 mb-4">
            <div className="relative rounded-2xl overflow-hidden shadow-lg group">
                {/* Slides Container */}
                <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                    {activeSlides.map((slide, index) => (
                        <div key={index} className="w-full flex-shrink-0 relative">
                            <img
                                src={slide.image!}
                                alt={slide.text || `Banner ${index + 1}`}
                                className="w-full h-32 sm:h-48 md:h-56 object-cover"
                            />
                            {/* Text Overlay */}
                            {slide.text && (
                                <div className="absolute inset-0 flex items-end">
                                    <div
                                        className="w-full px-4 py-3 sm:px-6 sm:py-4"
                                        style={{
                                            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                                        }}
                                    >
                                        <p className="text-white text-sm sm:text-base md:text-lg font-medium drop-shadow-lg">
                                            {slide.text}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Navigation Arrows (show only when multiple slides) */}
                {activeSlides.length > 1 && (
                    <>
                        <button
                            onClick={prevSlide}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={nextSlide}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </>
                )}

                {/* Dots Indicator */}
                {activeSlides.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {activeSlides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className="w-2 h-2 rounded-full transition-all duration-300"
                                style={{
                                    backgroundColor: index === currentSlide
                                        ? theme.vars['--sp-accent']
                                        : 'rgba(255,255,255,0.5)',
                                    width: index === currentSlide ? '1.5rem' : '0.5rem',
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
