"use client";

import { useQuery } from "@tanstack/react-query";
import { getSaasFinancialMetrics, getSaasSubscriptions } from "@/modules/saas/actions/billing-saas.actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    TrendingUp,
    CreditCard,
    AlertTriangle,
    Download,
    Calendar,
    ArrowUpRight,
    Search,
    Filter
} from "lucide-react";

interface FinancialMetrics {
    mrr: number;
    arr: number;
    churnRate: number;
    activeTenants: number;
    overdueCount: number;
}

interface Subscription {
    id: string;
    status: string;
    currentPeriodEnd: Date | string;
    tenant: { name: string; slug: string };
    plan: { name: string; monthlyPrice: number | string };
}
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { GatewaySettingsCard } from "@/modules/saas/components/gateway-settings-card";

export default function SaasBillingPage() {
    const [searchTerm, setSearchTerm] = useState("");

    const { data: metrics } = useQuery<FinancialMetrics>({
        queryKey: ["saas-financial-metrics"],
        queryFn: async () => {
            const res = await getSaasFinancialMetrics(null);
            if (!res.data) {
                // Return default values to prevent undefined error if API fails
                // or throw to handle error state
                if (res.error) throw new Error(res.error);
                throw new Error("Failed to fetch metrics");
            }
            return res.data;
        }
    });

    const { data: subscriptions = [] } = useQuery<Subscription[]>({
        queryKey: ["saas-subscriptions"],
        queryFn: async () => {
            const res = await getSaasSubscriptions(null);
            return (res.data as any || []) as Subscription[];
        }
    });

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const filteredSubs = subscriptions.filter((s) =>
        s.tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.plan.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-indigo-600" /> Financial Intelligence
                    </h1>
                    <p className="text-muted-foreground mt-1 font-medium">Análise de receita, retenção e saúde financeira da plataforma.</p>
                </div>
                <Button
                    onClick={() => {
                        const headers = ["Tenant", "Plano", "Valor", "Status", "Renovação"];
                        const rows = subscriptions.map(s => [
                            s.tenant.name,
                            s.plan.name,
                            Number(s.plan.monthlyPrice).toFixed(2),
                            s.status,
                            new Date(s.currentPeriodEnd).toLocaleDateString()
                        ]);

                        const csvContent = "data:text/csv;charset=utf-8,"
                            + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", "relatorio_financeiro_saas.csv");
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }}
                    className="rounded-xl font-bold h-12 gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/20"
                >
                    <Download className="h-4 w-4" /> Exportar Relatório
                </Button>
            </div>

            {/* Metric Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-none shadow-xl rounded-3xl bg-white dark:bg-slate-950 p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                        <CreditCard className="h-20 w-20 text-indigo-600" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform MRR</p>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1 antialiased">
                        {formatCurrency(metrics?.mrr || 0)}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-500">
                        <ArrowUpRight className="h-3.5 w-3.5" /> +12% vs last month
                    </div>
                </Card>

                <Card className="border-none shadow-xl rounded-3xl bg-white dark:bg-slate-950 p-6 relative overflow-hidden group">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projected ARR</p>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                        {formatCurrency(metrics?.arr || 0)}
                    </h3>
                    <div className="text-xs font-bold text-slate-400 mt-2">Annual estimation</div>
                </Card>

                <Card className="border-none shadow-xl rounded-3xl bg-white dark:bg-slate-950 p-6 relative overflow-hidden group">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Churn Rate (30d)</p>
                    <h3 className="text-3xl font-black text-red-500 mt-1">
                        {metrics?.churnRate || 0}%
                    </h3>
                    <div className="text-xs font-bold text-slate-400 mt-2">Retention target: &lt; 2%</div>
                </Card>

                <Card className="border-none shadow-xl rounded-3xl bg-slate-900 p-6 text-white overflow-hidden group">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Tenants</p>
                    <h3 className="text-3xl font-black mt-1">
                        {metrics?.activeTenants || 0}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 w-[75%]" />
                        </div>
                        <span className="text-[10px] font-bold">75% cap</span>
                    </div>
                </Card>
            </div>

            {/* Gateway Configuration */}
            <GatewaySettingsCard />

            {/* Overdue Alert */}
            {metrics && metrics.overdueCount > 0 && (
                <div className="flex items-center gap-4 p-6 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-200 dark:border-amber-900/30">
                    <div className="h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-amber-500/20">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-amber-900 dark:text-amber-400">Atenção: {metrics.overdueCount} Assinaturas em Atraso</h4>
                        <p className="text-sm text-amber-800/70">Existem provedores com faturas pendentes que podem ser suspensos automaticamente em breve.</p>
                    </div>
                    <Button variant="outline" className="rounded-xl border-amber-200 bg-white hover:bg-amber-50 text-amber-900 font-bold">
                        Verificar Inadimplentes
                    </Button>
                </div>
            )}

            {/* Subscriptions Table */}
            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white dark:bg-slate-950 overflow-hidden">
                <CardHeader className="p-10 border-b border-slate-50 dark:border-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <CardTitle className="text-2xl font-black tracking-tight uppercase">Base de Assinaturas</CardTitle>
                        <CardDescription>Gestão individual de renovações e faturamento por ISP.</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Pesquisar ISP ou Plano..."
                                className="pl-10 h-12 w-64 rounded-2xl border-none bg-slate-50 dark:bg-slate-900 font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-slate-50">
                            <Filter className="h-5 w-5" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tenant / Provedor</th>
                                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plano Atual</th>
                                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor/Mês</th>
                                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Próxima Renovação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                                {filteredSubs.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                        <td className="p-4 md:p-8">
                                            <div className="flex flex-col">
                                                <span className="font-extrabold text-slate-900 dark:text-white">{sub.tenant.name}</span>
                                                <span className="text-xs font-medium text-slate-400">slug: {sub.tenant.slug}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 md:p-8">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                    <Calendar className="h-4 w-4" />
                                                </div>
                                                <span className="font-bold">{sub.plan.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 md:p-8 font-black text-slate-900 dark:text-white antialiased text-lg">
                                            {formatCurrency(Number(sub.plan.monthlyPrice))}
                                        </td>
                                        <td className="p-4 md:p-8">
                                            <Badge className={
                                                sub.status === 'ACTIVE' ? 'bg-emerald-500' :
                                                    sub.status === 'PAST_DUE' ? 'bg-amber-500' :
                                                        sub.status === 'TRIAL' ? 'bg-blue-500' : 'bg-slate-400'
                                            }>
                                                {sub.status}
                                            </Badge>
                                        </td>
                                        <td className="p-4 md:p-8">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-600">
                                                    {new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR')}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Fatura em processamento</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
