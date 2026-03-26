"use client"

import { NeonCard, NeonCardContent, NeonCardHeader, NeonCardTitle } from "@/components/ui/neon-card"
import {
    TrendingUp,
    Wallet,
    AlertTriangle,
    Filter,
    Download,
    ArrowUpRight,
    ArrowDownRight,
    Users,
    Activity,
    CreditCard,
    QrCode,
    FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { getRevenueAction, getTopDebtorsAction } from "@/modules/financial/actions/invoice-actions"
import { DashboardCharts } from "@/app/(isp-panel)/financial/dashboard/dashboard-charts"

export default function RevenueReportPage() {
    const [revenueData, setRevenueData] = useState<any>(null);
    const [topDebtors, setTopDebtors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [revenueRes, debtorsRes] = await Promise.all([
                    getRevenueAction(),
                    getTopDebtorsAction()
                ]);

                if (revenueRes.data) setRevenueData(revenueRes.data);
                if (debtorsRes.data) setTopDebtors(debtorsRes.data);
            } catch (e) {
                console.error("Erro ao carregar dados financeiros:", e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const kpis = [
        { 
            title: "Faturamento Bruto", 
            value: revenueData ? `R$ ${revenueData.totalRevenue.toLocaleString()}` : "...", 
            trend: "+12.5%", 
            positive: true,
            icon: Wallet 
        },
        { 
            title: "Líquido Recebido", 
            value: revenueData ? `R$ ${revenueData.paidRevenue.toLocaleString()}` : "...", 
            trend: "+8.2%", 
            positive: true,
            icon: TrendingUp 
        },
        { 
            title: "Inadimplência Atual", 
            value: revenueData ? `R$ ${revenueData.overdueRevenue.toLocaleString()}` : "...", 
            trend: "-2.4%", 
            positive: false,
            icon: AlertTriangle 
        },
        { 
            title: "Churn Estimado", 
            value: "2.4%", 
            trend: "Meta: < 3%", 
            positive: true,
            icon: Users 
        },
    ];

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700 bg-background/50">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase italic flex items-center gap-3">
                        <Activity className="h-8 w-8 text-primary animate-pulse" />
                        Business Intelligence
                    </h1>
                    <p className="text-muted-foreground font-medium">Monitoramento estratégico e saúde financeira do provedor.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="rounded-xl border-primary/20 bg-primary/5 font-bold gap-2">
                        <Filter className="h-4 w-4" /> Filtros
                    </Button>
                    <Button className="bg-primary text-white gap-2 italic uppercase font-black hover:scale-105 transition-transform">
                        <Download className="h-4 w-4" /> Gerar DRE
                    </Button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, i) => (
                    <NeonCard key={i} className="p-6 relative group overflow-hidden border-primary/10">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <kpi.icon className="h-12 w-12" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{kpi.title}</p>
                        <h3 className="text-2xl font-black mt-1 tracking-tighter">{kpi.value}</h3>
                        <div className="mt-4 flex items-center gap-2">
                            {kpi.positive ? (
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[10px] font-black">
                                    <ArrowUpRight className="h-3 w-3 mr-1" /> {kpi.trend}
                                </Badge>
                            ) : (
                                <Badge className="bg-destructive/10 text-destructive border-none text-[10px] font-black">
                                    <ArrowDownRight className="h-3 w-3 mr-1" /> {kpi.trend}
                                </Badge>
                            )}
                            <span className="text-[9px] text-muted-foreground font-bold uppercase">vs mês anterior</span>
                        </div>
                    </NeonCard>
                ))}
            </div>

            {/* Main Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <NeonCard className="lg:col-span-2">
                    <NeonCardHeader className="flex flex-row items-center justify-between border-b border-white/5 bg-white/5">
                        <NeonCardTitle className="text-sm font-black uppercase tracking-widest italic">Evolução de Receita</NeonCardTitle>
                        <Badge variant="outline" className="border-primary/30 text-primary uppercase text-[9px] font-black">Tempo Real</Badge>
                    </NeonCardHeader>
                    <NeonCardContent className="p-6 h-[400px]">
                        <DashboardCharts data={revenueData?.chart || []} />
                    </NeonCardContent>
                </NeonCard>

                {/* Métodos de Pagamento & Eficiência */}
                <div className="space-y-6">
                    <NeonCard className="flex-1">
                        <NeonCardHeader className="bg-muted/5 border-b border-white/5">
                            <NeonCardTitle className="text-sm font-black uppercase tracking-widest italic text-primary">Mix de Pagamentos</NeonCardTitle>
                        </NeonCardHeader>
                        <NeonCardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg"><QrCode className="h-4 w-4 text-emerald-500" /></div>
                                    <span className="text-xs font-bold uppercase tracking-tight">PIX Dinâmico</span>
                                </div>
                                <span className="font-black text-emerald-500">{revenueData?.mix?.pix || 0}%</span>
                            </div>
                            <div className="w-full bg-muted/20 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full" style={{ width: `${revenueData?.mix?.pix || 0}%` }} />
                            </div>

                            <div className="flex items-center justify-between mt-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg"><FileText className="h-4 w-4 text-blue-500" /></div>
                                    <span className="text-xs font-bold uppercase tracking-tight">Boleto Bancário</span>
                                </div>
                                <span className="font-black text-blue-500">{revenueData?.mix?.boleto || 0}%</span>
                            </div>
                            <div className="w-full bg-muted/20 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-blue-500 h-full" style={{ width: `${revenueData?.mix?.boleto || 0}%` }} />
                            </div>

                            <div className="flex items-center justify-between mt-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/10 rounded-lg"><CreditCard className="h-4 w-4 text-purple-500" /></div>
                                    <span className="text-xs font-bold uppercase tracking-tight">Cartão de Crédito</span>
                                </div>
                                <span className="font-black text-purple-500">{revenueData?.mix?.card || 0}%</span>
                            </div>
                            <div className="w-full bg-muted/20 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-purple-500 h-full" style={{ width: `${revenueData?.mix?.card || 0}%` }} />
                            </div>
                        </NeonCardContent>
                    </NeonCard>

                    <NeonCard className="bg-primary/5 border-primary/20 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Activity className="h-5 w-5 text-primary" />
                            <span className="text-xs font-black uppercase tracking-widest">Performance Gateways</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-[10px] font-bold opacity-70">
                                <span>Mercado Pago</span>
                                <span>R$ 0,89/trans</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold opacity-70">
                                <span>Asaas</span>
                                <span>R$ 1,95/trans</span>
                            </div>
                        </div>
                    </NeonCard>
                </div>
            </div>

            {/* Inadimplentes Table */}
            <NeonCard className="overflow-hidden border-destructive/10">
                <NeonCardHeader className="bg-destructive/5 border-b border-destructive/10 flex flex-row items-center justify-between px-8 py-6">
                    <div>
                        <NeonCardTitle className="text-sm font-black uppercase tracking-widest italic text-destructive">Top 10 Inadimplentes</NeonCardTitle>
                        <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Clientes com maior volume de débito acumulado.</p>
                    </div>
                </NeonCardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-muted/30 text-[9px] font-black uppercase tracking-widest font-mono text-muted-foreground">
                            <tr>
                                <th className="px-8 py-4">Assinante</th>
                                <th className="px-8 py-4">Valor Total</th>
                                <th className="px-8 py-4">Atraso</th>
                                <th className="px-8 py-4 text-right">Controle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {topDebtors.map((debtor, i) => (
                                <tr key={i} className="hover:bg-muted/10 transition-colors group">
                                    <td className="px-8 py-5">
                                        <p className="font-bold text-sm tracking-tight">{debtor.name}</p>
                                        <p className="text-[9px] text-muted-foreground uppercase font-black">Doc: {debtor.cpfCnpj}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="font-black text-destructive/80 italic tracking-tighter">
                                            R$ {debtor.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <Badge className="bg-amber-500/10 text-amber-500 border-none font-black text-[9px] italic">
                                            {debtor.days} DIAS EM ATRASO
                                        </Badge>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <Button variant="ghost" size="sm" className="font-black text-[10px] uppercase text-primary hover:bg-primary/10">
                                            Notificar via WhatsApp
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </NeonCard>
        </div>
    )
}
