"use client";

import * as React from "react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface BannerCarouselProps {
    images: string[];
    tenantName?: string;
    description?: string;
}

export function BannerCarousel({ images, tenantName, description }: BannerCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-advance
    useEffect(() => {
        if (images.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex((current) => (current + 1) % images.length);
        }, 5000);

        return () => clearInterval(timer);
    }, [images.length]);

    const prevSlide = () => {
        setCurrentIndex((current) => (current - 1 + images.length) % images.length);
    };

    const nextSlide = () => {
        setCurrentIndex((current) => (current + 1) % images.length);
    };

    if (!images || images.length === 0) {
        return null; // Or return a default placeholder
    }

    return (
        <div className="relative w-full h-[300px] md:h-[500px] lg:h-[600px] overflow-hidden bg-slate-900 group">
            {/* Slides */}
            {images.map((img, index) => (
                <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
                        }`}
                >
                    <Image
                        src={img}
                        alt={`Banner ${index + 1}`}
                        fill
                        className="object-cover"
                        priority={index === 0}
                    />
                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
                </div>
            ))}

            {/* Navigation Buttons (Only if > 1 image) */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300"
                        aria-label="Anterior"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300"
                        aria-label="Próximo"
                    >
                        <ArrowRight size={24} />
                    </button>

                    {/* Indicators */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                        {images.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${index === currentIndex
                                        ? "bg-white w-8"
                                        : "bg-white/50 hover:bg-white/80"
                                    }`}
                                aria-label={`Ir para slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* Content (Hero Text) */}
            <div className="absolute inset-x-0 bottom-0 z-20 container py-12 md:py-20 flex flex-col items-center text-center">
                {/* This content is usually passed as children or overlay, 
                     but preserving simple text overlay here if needed */}
            </div>
        </div>
    );
}
