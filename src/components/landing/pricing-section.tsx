"use client";

import { SaasPlan } from "@prisma/client";
import { Check, Crown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { landingContent } from "@/config/landing-page-content";

interface PricingSectionProps {
    plans: SaasPlan[];
}

export function PricingSection({ plans }: PricingSectionProps) {
    return (
        <section id="pricing" className="py-24 px-6 bg-slate-50 dark:bg-slate-950">
            <div className="max-w-7xl mx-auto space-y-16">

                <div className="text-center space-y-4">
                    <Badge variant="outline" className="px-4 py-1.5 rounded-full border-indigo-200 text-indigo-600 bg-indigo-50/50 font-bold text-xs uppercase tracking-widest">
                        {landingContent.pricing.badge}
                    </Badge>
                    <h2
                        className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white"
                        dangerouslySetInnerHTML={{ __html: landingContent.pricing.headline }}
                    />
                    <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">
                        {landingContent.pricing.subheadline}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    {plans.map((plan, index) => {
                        const isPopular = index === 1; // Highlight the middle plan or explicitly mark one

                        return (
                            <Card
                                key={plan.id}
                                className={`
                                    relative border-none rounded-[2.5rem] overflow-hidden flex flex-col transition-all duration-300
                                    ${isPopular
                                        ? 'bg-slate-900 text-white shadow-2xl shadow-indigo-500/20 scale-105 z-10'
                                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl hover:-translate-y-2'
                                    }
                                `}
                            >
                                {isPopular && (
                                    <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
                                )}

                                <CardHeader className="p-8 pb-0 text-center space-y-6">
                                    {isPopular && (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest mx-auto">
                                            <Crown size={12} /> Mais Popular
                                        </div>
                                    )}

                                    <h3 className={`font-black tracking-[0.2em] text-sm uppercase ${isPopular ? 'text-indigo-200' : 'text-slate-400'}`}>
                                        {plan.name}
                                    </h3>

                                    <div className="flex items-baseline justify-center gap-1">
                                        <span className={`text-lg font-bold ${isPopular ? 'text-indigo-200/50' : 'text-slate-300'}`}>R$</span>
                                        <span className={`text-6xl font-black tracking-tighter ${isPopular ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                            {Number(plan.monthlyPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-lg font-bold text-slate-400">/mês</span>
                                    </div>

                                    <p className={`text-sm font-medium ${isPopular ? 'text-indigo-100/70' : 'text-slate-500'}`}>
                                        Para provedores com até <span className={`font-black ${isPopular ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{plan.maxCustomers} clientes</span>
                                    </p>
                                </CardHeader>

                                <CardContent className="p-8 flex-1 flex flex-col">
                                    <div className={`my-8 h-px w-full ${isPopular ? 'bg-white/10' : 'bg-slate-100 dark:bg-slate-800'}`} />

                                    <ul className="space-y-4 mb-8 flex-1">
                                        {[
                                            "Gestão completa de clientes",
                                            "Controle financeiro",
                                            "Suporte técnico",
                                            "Integração com Mikrotik",
                                            "Área do cliente",
                                            "Relatórios",
                                            "Integração com bancos",
                                            "Personalizações",
                                            "Treinamento incluído"
                                        ].map((feature) => (
                                            <li key={feature} className="flex items-start gap-3">
                                                <div className={`mt-0.5 rounded-full p-1 ${isPopular ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                                    <Check size={12} strokeWidth={4} />
                                                </div>
                                                <span className={`text-sm font-medium ${isPopular ? 'text-indigo-50' : 'text-slate-600 dark:text-slate-300'}`}>
                                                    {feature}
                                                </span>
                                            </li>
                                        ))}

                                        {/* Optional: Add custom feature if defined in DB for specific plan differentiation */}
                                        {plan.features && typeof plan.features === 'object' && (plan.features as any).max_vpn_nodes && (
                                            <li className="flex items-start gap-3">
                                                <div className={`mt-0.5 rounded-full p-1 ${isPopular ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                                    <Check size={12} strokeWidth={4} />
                                                </div>
                                                <span className={`text-sm font-medium ${isPopular ? 'text-indigo-50' : 'text-slate-600 dark:text-slate-300'}`}>
                                                    Até <strong className={isPopular ? 'text-white' : 'text-slate-900 dark:text-white'}>{(plan.features as any).max_vpn_nodes} Concentradores</strong> VPN
                                                </span>
                                            </li>
                                        )}
                                    </ul>

                                    <Button
                                        asChild
                                        className={`w-full h-14 rounded-2xl font-bold text-base transition-all hover:scale-[1.02] active:scale-95 ${isPopular
                                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 border-0'
                                            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 border-0'
                                            }`}
                                    >
                                        <Link href={`/auth/register?plan=${plan.id}`}>
                                            Começar Agora
                                        </Link>
                                    </Button>

                                    <p className="mt-4 text-center text-[10px] uppercase tracking-widest font-bold opacity-40">
                                        7 dias de teste grátis
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
