"use client"

import { NeonCard, NeonCardContent, NeonCardHeader, NeonCardTitle } from "@/components/ui/neon-card"
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import {
    TrendingUp,
    Wallet,
    AlertTriangle,
    Filter,
    Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
// import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getRevenueAction, getTopDebtorsAction } from "@/modules/financial/actions/invoice-actions";

export default function RevenueReportPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [revenueData, setRevenueData] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [topDebtors, setTopDebtors] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [revenueRes, debtorsRes] = await Promise.all([
                    getRevenueAction(),
                    getTopDebtorsAction()
                ]);

                if (revenueRes.data) {
                    setRevenueData(revenueRes.data);
                }
                if (debtorsRes.data) {
                    setTopDebtors(debtorsRes.data);
                }
            } catch (e) {
                console.error("Erro ao carregar dados financeiros:", e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const chartData = revenueData?.chart || [];

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">Auditoria Financeira</h1>
                    <p className="text-muted-foreground mt-1 font-medium">Análise profunda de faturamento, inadimplência e projeções.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="rounded-xl border font-bold gap-2">
                        <Filter className="h-4 w-4" /> Filtros Avançados
                    </Button>
                    <Button variant="neon" className="gap-2 italic uppercase">
                        <Download className="h-4 w-4" /> Exportar DRE
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <NeonCard className="lg:col-span-2 overflow-hidden">
                    <NeonCardHeader className="p-8 border-b border-border bg-muted/5 flex flex-row items-center justify-between">
                        <div>
                            <NeonCardTitle className="text-xl font-black uppercase tracking-tight">Fluxo de Caixa: Previsto vs Realizado</NeonCardTitle>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">Histórico de eficiência de cobrança nos últimos 6 meses.</p>
                        </div>
                        <TrendingUp className="h-5 w-5 text-primary" />
                    </NeonCardHeader>
                    <NeonCardContent className="h-[400px] p-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.05} />
                                        <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorRealized" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fontWeight: 700, fill: '#64748B' }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fontWeight: 700, fill: '#64748B' }}
                                    tickFormatter={(val) => `R$${val / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#0f172a',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)'
                                    }}
                                    itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                                    labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="total" stroke="#475569" strokeWidth={1} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorProjected)" name="Total Gerado" />
                                <Area type="monotone" dataKey="paid" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorRealized)" name="Pago" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </NeonCardContent>
                </NeonCard>

                <div className="space-y-6">
                    <NeonCard className="bg-primary shadow-2xl shadow-primary/10 p-8 text-primary-foreground border-none relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between items-start">
                                <Wallet className="h-8 w-8 opacity-40 text-white" />
                                <Badge className="bg-white/20 border-none font-black text-[9px] tracking-widest text-white uppercase italic">Métricas em Tempo Real</Badge>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Soma Total Paga</p>
                                <h2 className="text-4xl font-black tracking-tighter mt-1 italic">
                                    {revenueData ? `R$ ${revenueData.paidRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "..."}
                                </h2>
                            </div>
                            <p className="text-[11px] font-bold opacity-80 leading-relaxed border-t border-white/10 pt-4">
                                Potencial total gerado: <span className="font-black">R$ {revenueData?.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0,00"}</span>
                            </p>
                        </div>
                    </NeonCard>

                    <NeonCard className="p-8 space-y-6 bg-muted/5 border-border">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-foreground uppercase tracking-wider leading-none">Inadimplência</h3>
                                <p className="text-[9px] text-amber-500/80 font-black tracking-widest uppercase mt-1.5">Risco Financeiro Reduzido</p>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                            Há um total de <strong className="text-foreground">R$ {revenueData?.overdueRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0,00"}</strong> em faturas vencidas que necessitam de cobrança.
                        </p>
                        <Button variant="outline" className="w-full text-xs font-bold rounded-xl h-10 border transition-all hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/30">
                            Ver Relatório de Perdas
                        </Button>
                    </NeonCard>
                </div>
            </div>

            <NeonCard className="overflow-hidden">
                <NeonCardHeader className="p-8 border-b border-border bg-muted/5">
                    <NeonCardTitle className="text-xl font-black uppercase tracking-tight">Top 10 Inadimplentes (Maiores Débitos)</NeonCardTitle>
                </NeonCardHeader>
                <NeonCardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted/10 text-[10px] uppercase font-black text-muted-foreground font-mono tracking-widest">
                                <tr>
                                    <th className="px-8 py-4">Assinante / Empresa</th>
                                    <th className="px-8 py-4">Plano</th>
                                    <th className="px-8 py-4">Valor Devido</th>
                                    <th className="px-8 py-4">Atraso</th>
                                    <th className="px-8 py-4 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {topDebtors.map((debtor) => (
                                    <tr key={debtor.cpfCnpj} className="hover:bg-muted/10 transition-colors group">
                                        <td className="px-8 py-5">
                                            <p className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{debtor.name}</p>
                                            <p className="text-[10px] text-muted-foreground/60 uppercase font-black">CPF/CNPJ: {debtor.cpfCnpj}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <Badge variant="outline" className="text-[10px] font-bold border-border bg-muted/5 capitalize">{debtor.plan.toLowerCase()}</Badge>
                                        </td>
                                        <td className="px-8 py-5 font-black text-destructive/80 text-sm tracking-tighter">
                                            R$ {debtor.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-8 py-5">
                                            <Badge className={cn(
                                                "rounded-lg font-black text-[9px] px-2.5 py-1 tracking-widest uppercase italic",
                                                debtor.days > 30 ? "bg-destructive/10 text-destructive border-none" : "bg-amber-500/10 text-amber-500 border-none"
                                            )}>
                                                {debtor.days} DIAS
                                            </Badge>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <Button variant="ghost" size="sm" className="rounded-xl font-black text-[10px] uppercase tracking-wider text-primary hover:bg-primary/10 italic">
                                                Abrir Cobrança
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {topDebtors.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-10 text-center text-muted-foreground italic">
                                            Nenhum inadimplente encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 text-center border-t border-border bg-muted/5">
                        <Button variant="link" className="font-black text-muted-foreground/40 text-[10px] uppercase tracking-widest hover:text-primary transition-colors">VER TODOS OS INADIMPLENTES (42)</Button>
                    </div>
                </NeonCardContent>
            </NeonCard>
        </div>
    )
}
