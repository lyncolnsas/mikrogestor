import { getSaasPlansAction } from "@/modules/saas/actions/plan.actions";
import { type SaasPlan } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
import { Button } from "@/components/ui/button";
import { Check, Edit3, Plus, Tags, CreditCard, Zap, Crown, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import { PlanFormDialog } from "@/modules/saas/components/plan-form-dialog";
import { PlanActions } from "@/modules/saas/components/plan-actions";

export default async function SaasPlansPage() {
    const { data: plans, error } = await getSaasPlansAction();

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-6 animate-in fade-in duration-700">
                <div className="p-6 bg-red-50 dark:bg-red-950/20 rounded-[2rem] shadow-xl shadow-red-500/10">
                    <AlertCircle className="h-12 w-12 text-red-500" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Ops! Algo deu errado.</h2>
                    <p className="text-slate-500 max-w-sm font-medium">{error}</p>
                </div>
                <Button variant="outline" className="rounded-2xl font-bold h-12 px-8 border-slate-200 hover:bg-slate-50 transition-all cursor-pointer">
                    Tentar Novamente
                </Button>
            </div>
        );
    }

    if (!plans || plans.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-6 animate-in fade-in duration-700">
                <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-[2rem] shadow-xl">
                    <Tags className="h-12 w-12 text-slate-400" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Nenhum plano ativo.</h2>
                    <p className="text-slate-500 max-w-sm font-medium">Comece criando o primeiro plano estratégico para o Mikrogestor.</p>
                </div>
                <PlanFormDialog>
                    <Button className="rounded-2xl font-black h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl shadow-indigo-500/40 gap-3 transition-all">
                        <Plus className="h-5 w-5" /> Criar Primeiro Plano
                    </Button>
                </PlanFormDialog>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 selection:bg-indigo-100 selection:text-indigo-900">
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-2xl shadow-indigo-500/40 transform -rotate-3 group hover:rotate-0 transition-transform duration-500">
                                <CreditCard className="h-7 w-7 text-white" />
                            </div>
                            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
                                Modelos de Negócio
                            </h1>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-2xl text-lg md:text-xl leading-relaxed">
                            Gerencie a precificação e limitações operacionais dos planos do <span className="text-indigo-600 font-bold italic underline decoration-indigo-200 underline-offset-4">Mikrogestor</span>.
                        </p>
                    </div>
                    <PlanFormDialog>
                        <Button className="rounded-[1.5rem] font-black px-10 h-16 bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_20px_40px_rgba(79,70,229,0.3)] gap-3 transition-all hover:scale-105 active:scale-95 group">
                            <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-500" />
                            Novo Plano
                        </Button>
                    </PlanFormDialog>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {plans.map((plan: SaasPlan, index: number) => (
                        <Card
                            key={plan.id}
                            className={`relative border-none shadow-[0_30px_60px_rgba(0,0,0,0.05)] rounded-[3.5rem] overflow-hidden bg-white dark:bg-slate-900 flex flex-col group/card hover:-translate-y-6 transition-all duration-700 border-2 ${index === 1 ? 'border-indigo-500/30 ring-8 ring-indigo-500/5' : 'border-transparent'}`}
                        >
                            {index === 1 && (
                                <div className="absolute top-8 right-8 z-20">
                                    <div className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-bounce-slow">
                                        <Crown className="h-3 w-3" /> Best Value
                                    </div>
                                </div>
                            )}

                            <CardHeader className="p-14 pb-8 text-center relative">
                                <div className="absolute top-10 right-10 flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-2">
                                        {!plan.isActive && (
                                            <div className="bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase px-3 py-1 rounded-full border border-rose-500/20">
                                                Inativo
                                            </div>
                                        )}
                                        {(plan as SaasPlan & { showOnLanding?: boolean }).showOnLanding ? (
                                            <div className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                                                <Eye className="h-3 w-3" /> Landing Page
                                            </div>
                                        ) : (
                                            <div className="bg-slate-500/10 text-slate-500 text-[10px] font-black uppercase px-3 py-1 rounded-full border border-slate-500/20 flex items-center gap-1">
                                                <EyeOff className="h-3 w-3" /> Oculto
                                            </div>
                                        )}
                                    </div>
                                    <PlanActions
                                        planId={plan.id}
                                        isActive={plan.isActive}
                                        showOnLanding={(plan as SaasPlan & { showOnLanding?: boolean }).showOnLanding ?? true}
                                    />
                                </div>

                                <CardTitle className="text-xs font-black tracking-[0.3em] text-slate-400 group-hover/card:text-indigo-600 transition-colors uppercase pt-4">
                                    {plan.name}
                                </CardTitle>
                                <div className="mt-10 flex flex-col items-center">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-bold text-slate-300 mr-1">R$</span>
                                        <span className="text-7xl font-black tracking-tighter text-slate-900 dark:text-white">
                                            {Number(plan.monthlyPrice).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                                        </span>
                                        <span className="text-3xl font-black text-slate-200">,00</span>
                                    </div>
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mt-4 flex items-center gap-2">
                                        Faturamento mensal <ArrowRight className="h-3 w-3 text-indigo-500" /> Unitário
                                    </span>
                                </div>
                            </CardHeader>

                            <CardContent className="p-14 pt-0 flex-1 flex flex-col">
                                <div className="space-y-6 flex-1 py-10">
                                    <div className="flex items-center gap-5 text-slate-900 dark:text-slate-100 font-black text-xl bg-slate-50/80 dark:bg-slate-800/50 p-6 rounded-[2rem] mb-6 border border-slate-100 dark:border-slate-700/50 group-hover/card:bg-indigo-50/50 transition-colors">
                                        <div className="h-4 w-4 rounded-full bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.6)] animate-pulse" />
                                        <span>{plan.maxCustomers.toLocaleString()} Clientes</span>
                                    </div>

                                    {plan.features && typeof plan.features === 'object' && Object.entries(plan.features as Record<string, unknown>).map(([key, value]) => (
                                        <div key={key} className="flex items-center gap-5 text-slate-500 dark:text-slate-400 text-sm font-bold group/feat">
                                            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover/feat:bg-emerald-500/20 group-hover/feat:rotate-12 transition-all">
                                                <Check className="h-4 w-4 text-emerald-500" />
                                            </div>
                                            <span className="capitalize">{key.replace(/_/g, ' ')}: <span className="text-slate-900 dark:text-slate-200 font-black">{value === true ? 'Ilimitado' : String(value)}</span></span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-12 pt-10 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-4">
                                    <Button className="w-full rounded-[2rem] font-black h-16 bg-slate-900 dark:bg-white dark:text-slate-900 hover:scale-[1.03] transition-all hover:shadow-2xl active:scale-95 text-lg">
                                        Ativar Plano
                                    </Button>
                                    <PlanFormDialog plan={plan}>
                                        <Button variant="ghost" className="w-full rounded-[2rem] font-bold h-14 text-slate-400 hover:text-indigo-600 transition-colors hover:bg-indigo-50/30">
                                            <Edit3 className="h-5 w-5 mr-3" /> Editar Estrutura
                                        </Button>
                                    </PlanFormDialog>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Analytics Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10">
                    <Card className="border-none shadow-[0_40px_80px_rgba(0,0,0,0.08)] rounded-[3rem] bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-800 p-12 border border-indigo-400/20 group relative overflow-hidden">
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-8">
                            <div className="space-y-6">
                                <h3 className="font-black text-indigo-200 uppercase text-xs tracking-[0.4em]">Visão Geral da Receita</h3>
                                <p className="text-5xl font-black text-white tracking-tighter leading-tight">Maximização<br />de Receita Bruta</p>
                                <p className="text-indigo-100/70 font-medium text-xl leading-relaxed max-w-sm">
                                    Sua conversão de planos intermediários aumentou <span className="text-white font-black underline decoration-indigo-300 decoration-4">22%</span> este mês.
                                </p>
                            </div>
                            <div className="p-6 bg-white/10 rounded-[2.5rem] backdrop-blur-2xl border border-white/20 self-start shadow-2xl group-hover:rotate-6 transition-transform">
                                <Tags className="h-10 w-10 text-white" />
                            </div>
                        </div>
                        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-white/5 rounded-full blur-[100px] group-hover:bg-white/10 transition-colors duration-1000" />
                    </Card>

                    <Card className="border-none shadow-[0_40px_80px_rgba(0,0,0,0.08)] rounded-[3rem] bg-white dark:bg-slate-900 p-12 border border-slate-100 dark:border-slate-800 group overflow-hidden relative">
                        <div className="flex justify-between items-start relative z-10 gap-6">
                            <div className="space-y-6">
                                <h3 className="font-black text-slate-400 uppercase text-xs tracking-[0.4em]">Market Penetration</h3>
                                <div className="flex items-baseline gap-4">
                                    <p className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter">14.2%</p>
                                    <div className="px-4 py-2 bg-emerald-500/10 text-emerald-500 text-xs font-black rounded-2xl border border-emerald-500/20">
                                        +2.5% YoY
                                    </div>
                                </div>
                                <p className="text-slate-500 font-medium text-lg">Taxa média de ativação de planos pagos por ISP.</p>
                            </div>
                            <div className="p-6 bg-indigo-50 dark:bg-indigo-500/10 rounded-[2.5rem] group-hover:scale-110 transition-transform duration-500 shadow-xl shadow-indigo-500/5">
                                <Zap className="h-10 w-10 text-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.2)]" />
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full -mr-24 -mt-24 blur-3xl" />
                    </Card>
                </div>
            </div>
        </div>
    );
}
