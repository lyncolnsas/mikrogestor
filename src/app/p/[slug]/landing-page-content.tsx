"use client";

import { motion, Variants } from "framer-motion";
import { Phone, Check, Zap, Wifi, Star, ChevronDown, ArrowRight, Shield, Globe, Server, Headset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubscriberLoginModal } from "@/components/subscriber/subscriber-login-modal";
import { BannerCarousel } from "@/components/landing/banner-carousel";


// Types
interface LandingPageData {
    tenant: {
        name: string;
        slug: string;
    };
    config: {
        title: string | null;
        subtitle?: string | null;
        heroDescription?: string | null;
        primaryColor: string;
        secondaryColor: string;
        logoUrl?: string | null;
        bannerUrl?: string | null;
        bannerUrls?: string[] | null;
        whatsapp?: string | null;
        address?: string | null;
        showCoverageChecker: boolean;
        showTestimonials: boolean;
        showFAQ: boolean;
        showFloatingCTA: boolean;
        isActive: boolean;
    };
    plans: Array<{
        id: string;
        name: string;
        price: number | string;
        download: number;
        upload: number;
        svaList: string | null; // JSON string
    }>;
    testimonials: Array<{
        id: string;
        content: string;
        rating: number;
        customerName: string;
        customerRole?: string | null;
        avatarUrl?: string | null;
    }>;
    faqs: Array<{
        id: string;
        question: string;
        answer: string;
    }>;
}

interface LandingPageContentProps {
    data: LandingPageData;
}

export function LandingPageContent({ data }: LandingPageContentProps) {
    const { config, plans, testimonials } = data;
    const primaryColor = config.primaryColor || "#2563eb";
    const secondaryColor = config.secondaryColor || "#10b981";

    // Variants for animations
    const fadeInUp: Variants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
    };

    const staggerContainer: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };


    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 overflow-x-hidden selection:bg-indigo-500/30">
            {/* Dynamic Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div
                    className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-20"
                    style={{ background: `radial-gradient(circle, ${primaryColor}, transparent)` }}
                />
                <div
                    className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-20"
                    style={{ background: `radial-gradient(circle, ${secondaryColor}, transparent)` }}
                />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
            </div>

            {/* Navbar */}
            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, type: "spring" }}
                className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/20"
            >
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {config.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={config.logoUrl} alt="Logo" className="h-10 w-auto" />
                        ) : (
                            <span className="text-2xl font-black tracking-tighter" style={{ color: primaryColor }}>
                                {(config.title || "Provedor").toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <SubscriberLoginModal tenantSlug={data.tenant.slug} />

                        {config.whatsapp && (
                            <Button
                                className="rounded-full font-bold shadow-lg shadow-green-500/20 hover:shadow-green-500/40 transition-all duration-300"
                                style={{ backgroundColor: '#25D366' }} // WhatsApp Green
                                asChild
                            >
                                <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noopener noreferrer">
                                    <Phone className="w-4 h-4 mr-2" />
                                    <span className="hidden sm:inline">WhatsApp</span>
                                </a>
                            </Button>
                        )}
                    </div>
                </div>
            </motion.nav>

            <main className="relative z-10 pt-20">

                {/* HERO SECTION */}
                <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
                    <div className="container mx-auto px-4 py-20 relative z-10">
                        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

                            {/* Left Content */}
                            <motion.div
                                initial="hidden"
                                animate="visible"
                                variants={staggerContainer}
                                className="flex-1 text-center lg:text-left space-y-8"
                            >
                                <motion.div variants={fadeInUp} className="inline-block">
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mx-auto lg:mx-0 w-fit">
                                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: secondaryColor }} />
                                        <span className="text-sm font-medium tracking-wide text-white/80">INTERNET DE ALTA VELOCIDADE</span>
                                    </div>
                                </motion.div>

                                <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tight">
                                    <span className="block text-white">Conecte-se ao</span>
                                    <span
                                        className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600"
                                        style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
                                    >
                                        Futuro Agora
                                    </span>
                                </motion.h1>

                                <motion.p variants={fadeInUp} className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                                    {config.heroDescription || config.subtitle || "Experiência de navegação ultra-rápida, estável e segura para sua casa e empresa."}
                                </motion.p>

                                <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                                    <Button
                                        size="lg"
                                        className="h-14 px-8 rounded-full text-lg font-bold shadow-xl hover:scale-105 transition-all duration-300"
                                        style={{ backgroundColor: primaryColor, boxShadow: `0 10px 40px -10px ${primaryColor}66` }}
                                        onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
                                    >
                                        Ver Planos
                                        <ArrowRight className="ml-2 w-5 h-5" />
                                    </Button>

                                </motion.div>
                            </motion.div>

                            {/* Right Visual */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                                className="flex-1 w-full max-w-lg lg:max-w-none relative"
                            >
                                <div className="relative z-10 rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-blue-500/10 bg-slate-900/40 backdrop-blur-sm p-2">
                                    {config.bannerUrls && config.bannerUrls.length > 0 ? (
                                        <BannerCarousel images={config.bannerUrls} />
                                    ) : config.bannerUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={config.bannerUrl} alt="Banner" className="rounded-2xl w-full h-auto object-cover" />
                                    ) : (
                                        <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center p-8 text-center border border-white/5">
                                            <Globe className="w-32 h-32 mb-6 opacity-50" style={{ color: primaryColor }} />
                                            <h3 className="text-3xl font-bold mb-2">Fibra 100% Óptica</h3>
                                            <p className="text-white/60">Tecnologia GPON de última geração</p>
                                        </div>
                                    )}

                                    {/* Floating stats card */}
                                    <motion.div
                                        animate={{ y: [-10, 10, -10] }}
                                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                        className="absolute -bottom-6 -left-6 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl z-20"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="bg-green-500/20 p-3 rounded-xl">
                                                <Wifi className="w-8 h-8 text-green-500" />
                                            </div>
                                            <div>
                                                <div className="text-sm text-white/60">Status da Rede</div>
                                                <div className="text-xl font-bold text-white flex items-center gap-2">
                                                    100% Online
                                                    <span className="flex h-3 w-3 relative">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>

                                </div>
                                {/* Decorative elements */}
                                <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-blue-500/20 blur-[100px] rounded-full" />
                            </motion.div>
                        </div>
                    </div>

                    {/* Scroll Indicator */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.5, duration: 1 }}
                        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/30"
                    >
                        <ChevronDown className="animate-bounce w-8 h-8" />
                    </motion.div>
                </section>



                {/* FEATURES GRID */}
                <section className="py-24 bg-slate-950/50">
                    <div className="container mx-auto px-4">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl md:text-5xl font-black mb-6">Por que somos diferentes?</h2>
                            <p className="text-slate-400 text-xl">Não vendemos apenas internet, entregamos a melhor experiência de conectividade.</p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[{
                                icon: Zap, title: "Ultra Velocidade", desc: "Downloads instantâneos e streaming em 4K sem trabamentos."
                            }, {
                                icon: Shield, title: "Segurança Total", desc: "Navegação protegida contra ameaças e ataques DDoS."
                            }, {
                                icon: Server, title: "Latência Baixa", desc: "Ping otimizado para jogos online e chamadas de vídeo."
                            }, {
                                icon: Headset, title: "Suporte Premium", desc: "Atendimento humanizado disponível 24 horas por dia."
                            }].map((feature, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 transition-all group"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <feature.icon className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                    <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* PLANS SECTION */}
                {plans.length > 0 && (
                    <section id="plans" className="py-24 relative">
                        <div className="container mx-auto px-4">
                            <div className="text-center max-w-3xl mx-auto mb-20">
                                <h2 className="text-4xl md:text-5xl font-black mb-6">Escolha seu Plano</h2>
                                <p className="text-slate-400 text-xl">Planos flexíveis desenhados para sua necessidade.</p>
                            </div>

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                                {plans.map((plan, index: number) => {
                                    const isHighlight = index === 1; // Center plan highlighted usually

                                    return (
                                        <motion.div
                                            key={plan.id}
                                            initial={{ opacity: 0, y: 30 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: index * 0.1 }}
                                            className={`relative rounded-3xl p-8 border transition-all duration-300 ${isHighlight
                                                ? 'bg-gradient-to-b from-white/10 to-white/5 border-white/20 shadow-2xl shadow-blue-500/10 transform md:-translate-y-4'
                                                : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                                                }`}
                                        >
                                            {isHighlight && (
                                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold px-6 py-2 rounded-full text-sm shadow-lg tracking-wide uppercase">
                                                    Mais Vendido
                                                </div>
                                            )}

                                            <div className="mb-8">
                                                <h3 className="text-2xl font-bold mb-2 text-white">{plan.name}</h3>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-slate-400">R$</span>
                                                    <span className="text-5xl font-black tracking-tight text-white">{Number(plan.price).toFixed(0)}</span>
                                                    <span className="text-slate-400">/mês</span>
                                                </div>
                                            </div>

                                            <div className="space-y-4 mb-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                                        <Wifi className="w-4 h-4 text-white" />
                                                    </div>
                                                    <div>
                                                        <span className="block font-bold text-lg">{plan.download} MB</span>
                                                        <span className="text-sm text-slate-400">Download</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                                        <ArrowRight className="w-4 h-4 text-white -rotate-45" />
                                                    </div>
                                                    <div>
                                                        <span className="block font-bold text-lg">{plan.upload} MB</span>
                                                        <span className="text-sm text-slate-400">Upload</span>
                                                    </div>
                                                </div>
                                                <div className="h-px bg-white/10 my-4" />
                                                {plan.svaList && JSON.parse(plan.svaList).map((sva: string, i: number) => (
                                                    <div key={i} className="flex items-center gap-3 text-slate-300">
                                                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                                                        <span>{sva}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <Button
                                                className={`w-full h-14 rounded-xl text-lg font-bold transition-all ${isHighlight
                                                    ? 'hover:scale-105 shadow-xl'
                                                    : 'hover:bg-white/20'
                                                    }`}
                                                style={{
                                                    backgroundColor: isHighlight ? primaryColor : 'rgba(255,255,255,0.1)',
                                                    color: 'white'
                                                }}
                                                asChild
                                            >
                                                <a href={`https://wa.me/${config.whatsapp}?text=Olá! Tenho interesse no plano ${plan.name}`}>
                                                    Assinar Agora
                                                </a>
                                            </Button>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}

                {/* TESTIMONIALS */}
                {config.showTestimonials && testimonials.length > 0 && (
                    <section className="py-24 bg-gradient-to-b from-slate-950 to-slate-900">
                        <div className="container mx-auto px-4">
                            <h2 className="text-4xl md:text-5xl font-black text-center mb-16">Histórias de Sucesso</h2>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {testimonials.map((t, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl backdrop-blur-sm"
                                    >
                                        <div className="flex gap-1 mb-6">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`w-5 h-5 ${i < t.rating ? "fill-yellow-400 text-yellow-400" : "text-slate-700"}`} />
                                            ))}
                                        </div>
                                        <p className="text-slate-300 mb-6 italic leading-relaxed">&quot;{t.content}&quot;</p>
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
                                                style={{ backgroundColor: secondaryColor }}
                                            >
                                                {t.customerName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">{t.customerName}</div>
                                                {t.customerRole && <div className="text-sm text-slate-500">{t.customerRole}</div>}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* FOOTER */}
                <footer className="py-12 border-t border-white/5 bg-slate-950 text-slate-400 text-sm">
                    <div className="container mx-auto px-4 text-center">
                        <p>&copy; {new Date().getFullYear()} {config.title || "Provedor"}. Todos os direitos reservados.</p>
                        <p className="mt-2 text-slate-600">Powered by MikroGestor</p>
                    </div>
                </footer>
            </main>
        </div>
    );
}
