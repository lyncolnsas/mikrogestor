"use client";

import { Megaphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BannerProps {
    id: string;
    title: string;
    message: string;
    onDismiss: (id: string) => void;
}

export function SaasNotificationBanner({ id, title, message, onDismiss }: BannerProps) {
    return (
        <div className="relative group bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white overflow-hidden animate-in slide-in-from-top duration-500 border-b border-white/10">
            {/* Animated particles background */}
            <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-32 h-32 bg-white/20 rounded-full blur-2xl animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse delay-700" />
            </div>

            <div className="max-w-7xl mx-auto px-4 py-3 md:py-2">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 backdrop-blur-md border border-white/20 shadow-lg group-hover:rotate-12 transition-transform">
                            <Megaphone className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 overflow-hidden">
                            <span className="font-black text-[10px] uppercase tracking-[0.2em] bg-white/20 px-2 py-0.5 rounded text-white/90 whitespace-nowrap self-start sm:self-auto">
                                Comunicado
                            </span>
                            <p className="text-sm font-bold truncate">
                                <span className="text-white/80 mr-2 hidden sm:inline">{title}:</span>
                                <span className="text-white">{message}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 rounded-full bg-white/10 hover:bg-white text-white hover:text-indigo-600 font-black text-[10px] uppercase tracking-widest transition-all border border-white/20 hidden xs:flex"
                            onClick={() => onDismiss(id)}
                        >
                            Entendido
                        </Button>
                        <button
                            onClick={() => onDismiss(id)}
                            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
