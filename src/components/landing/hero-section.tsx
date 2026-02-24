"use client";

import { motion } from "framer-motion";
import { landingContent } from "@/config/landing-page-content";
// Checking imports. I need next/link.
import NextLink from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, MousePointer2, Sparkles } from "lucide-react";

export function HeroSection() {
    return (
        <section className="relative py-24 px-6 md:py-32 overflow-hidden border-b bg-white dark:bg-slate-950">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10">
                <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-[140px]" />
            </div>

            <div className="max-w-6xl mx-auto text-center space-y-10 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="group relative inline-flex items-center gap-2 mb-8 cursor-default" role="button">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-20 blur-md transition-all duration-500 group-hover:opacity-40 animate-tilt" />
                        <div className="relative inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:bg-slate-900/90">
                            <Sparkles className="h-3 w-3 text-blue-400 animate-pulse" />
                            <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                                {landingContent.hero.badge}
                            </span>
                        </div>
                    </div>
                    <h1
                        className="text-5xl md:text-8xl font-black tracking-tighter text-slate-900 dark:text-white leading-[0.9]"
                        dangerouslySetInnerHTML={{ __html: landingContent.hero.headline }}
                    />
                </motion.div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto font-medium leading-relaxed"
                >
                    {landingContent.hero.subheadline}
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col sm:flex-row justify-center gap-4 pt-4"
                >
                    <Button size="lg" className="h-14 px-8 rounded-full text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/30 gap-3">
                        <NextLink href="/auth/register">{landingContent.hero.ctaCheck}</NextLink> <ArrowRight size={20} />
                    </Button>
                    <Button size="lg" variant="outline" className="h-14 px-8 rounded-full text-lg font-bold border-2 hover:bg-slate-50 gap-3">
                        {landingContent.hero.ctaDemo} <MousePointer2 size={20} />
                    </Button>
                </motion.div>

                {/* Social Proof Placeholder */}
                <div className="pt-12 flex flex-col items-center gap-4 grayscale opacity-50">
                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">{landingContent.features.title}</p>
                    <div className="flex gap-8 md:gap-16 items-center">
                        <div className="font-bold text-2xl text-slate-900 dark:text-white">MikroTik</div>
                        <div className="font-bold text-2xl text-slate-900 dark:text-white">WireGuard</div>
                        <div className="font-bold text-2xl text-slate-900 dark:text-white">PIX</div>
                    </div>
                </div>
            </div>
        </section>
    );
}
