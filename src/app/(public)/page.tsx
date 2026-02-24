import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Network,
    ArrowRight,
    ArrowUpRight,
    ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getPublicPlansAction } from "@/modules/saas/actions/plan.actions";
import { HeroSection } from "@/components/landing/hero-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { landingContent } from "@/config/landing-page-content";
import { AuthTrigger } from "@/components/auth/auth-trigger";

// Server Component
export default async function LandingPage() {
    // Fetch active public plans
    const plans = await getPublicPlansAction();

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 selection:bg-blue-500/30 overflow-x-hidden">
            {/* Nav - Glassmorphism */}
            <header className="fixed top-0 w-full z-50 px-6 h-20 flex items-center justify-between border-b bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl transition-all">
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
                        <Network className="h-6 w-6" />
                    </div>
                    <span className="font-black text-2xl tracking-tighter text-slate-900 dark:text-white uppercase hidden xl:block">
                        Mikrogestor
                    </span>
                </div>

                <nav className="hidden md:flex items-center gap-8">
                    <NavLink href="#features">Recursos</NavLink>
                    <NavLink href="#infra">Infraestrutura</NavLink>
                    <NavLink href="#pricing">Planos</NavLink>
                </nav>

                <AuthTrigger plans={plans} />
            </header>

            <main className="flex-1 pt-20">
                {/* Hero Section (Client Component for animations) */}
                <HeroSection />

                {/* Features - Anti-Template Cards */}
                {/* Features - Anti-Template Cards */}
                <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-6">
                        {landingContent.features.list.map((feature, idx) => (
                            <FeatureBlock
                                key={idx}
                                icon={<feature.icon className="h-7 w-7" />}
                                title={feature.title}
                                description={feature.description}
                                color={feature.color}
                                linkText={feature.linkText}
                            />
                        ))}
                    </div>
                </section>

                {/* Pricing Section (Dynamic from Database) */}
                <PricingSection plans={plans} />

                {/* Automation Spotlight */}
                {/* Automation Spotlight */}
                <section id="infra" className="py-24 px-6 bg-slate-900 text-white rounded-[3rem] mx-6 mb-24 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/20 blur-[150px] -z-0 opacity-50" />
                    <div className="max-w-6xl mx-auto grid md:grid-cols-2 items-center gap-16 relative z-10">
                        <div className="space-y-6">
                            <Badge className="bg-blue-500 hover:bg-blue-600 border-none font-bold">{landingContent.infrastructure.badge}</Badge>
                            <h2 className="text-4xl md:text-5xl font-black tracking-tight">{landingContent.infrastructure.headline}</h2>
                            <p className="text-slate-400 text-lg leading-relaxed">
                                {landingContent.infrastructure.description}
                            </p>
                            <ul className="space-y-4">
                                {landingContent.infrastructure.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-3">
                                        <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                            <ChevronRight className="h-3 w-3 text-emerald-500" />
                                        </div>
                                        <span className="font-medium">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-2 shadow-2xl">
                            <div className="bg-slate-950 rounded-2xl p-6 font-mono text-[11px] text-blue-400/90 leading-relaxed overflow-hidden">
                                <div className="flex gap-1.5 mb-4">
                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/30" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/30" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/30" />
                                </div>
                                <span className="text-slate-500">{landingContent.infrastructure.codeSnippet.title}</span> <br />
                                {landingContent.infrastructure.codeSnippet.line1} <br />
                                {landingContent.infrastructure.codeSnippet.line2} <br />
                                {landingContent.infrastructure.codeSnippet.line3} <br />
                                <span className="text-emerald-500 animate-pulse">{landingContent.infrastructure.codeSnippet.status}</span>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="py-12 border-t px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-slate-500 text-sm">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                        <Network className="h-5 w-5 text-blue-600" />
                        <span>{landingContent.footer.brand}</span>
                    </div>
                    <nav className="flex gap-8 font-medium">
                        {landingContent.footer.links.map((link, idx) => (
                            <Link key={idx} href={link.href} className="hover:text-blue-600">{link.label}</Link>
                        ))}
                    </nav>
                    <div>{landingContent.footer.copyright}</div>
                </div>
            </footer>
        </div>
    );
}

function NavLink({ href, children }: { href: string, children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors uppercase tracking-widest text-[11px]"
        >
            {children}
        </Link>
    )
}

function FeatureBlock({ icon, title, description, color, linkText }: { icon: React.ReactNode, title: string, description: string, color: 'blue' | 'emerald' | 'indigo', linkText: string }) {
    return (
        <div className="p-8 pb-10 rounded-[2rem] bg-white dark:bg-slate-900 border hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group">
            <div className={cn(
                "w-14 h-14 rounded-2xl mb-6 flex items-center justify-center transition-transform group-hover:scale-110",
                color === 'blue' ? "bg-blue-500/10 text-blue-600" :
                    color === 'emerald' ? "bg-emerald-500/10 text-emerald-600" :
                        "bg-indigo-500/10 text-indigo-600"
            )}>
                {icon}
            </div>
            <h3 className="text-xl font-black mb-3 text-slate-900 dark:text-white">{title}</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                {description}
            </p>
            <div className="pt-6">
                <Button variant="ghost" className="p-0 h-auto hover:bg-transparent text-blue-600 font-bold gap-2">
                    {linkText} <ArrowUpRight size={14} />
                </Button>
            </div>
        </div>
    );
}
