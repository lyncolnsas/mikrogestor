"use client"

import { NeonCard, NeonCardContent, NeonCardHeader, NeonCardTitle } from "@/components/ui/neon-card"
import { 
    BarChart3, 
    PieChart, 
    TrendingUp, 
    ArrowUpRight, 
    ArrowDownRight,
    DollarSign,
    Users,
    CreditCard
} from "lucide-react"
import { DashboardCharts } from "@/app/(isp-panel)/financial/dashboard/dashboard-charts" // Reusing initial chart logic
import { useState, useEffect } from "react"
import { getRevenueAction } from "@/modules/financial/actions/invoice-actions"
import { Badge } from "@/components/ui/badge"

/**
 * Página de Relatórios Financeiros Avançados (BI)
 */
export default function FinancialReportsPage() {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getRevenueAction().then(res => {
            setData(res.data);
            setIsLoading(false);
        });
    }, []);

    if (isLoading) return <div className="p-8 text-center">Carregando inteligência financeira...</div>;

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">Relatórios & BI</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Análise profunda da saúde financeira do seu provedor.</p>
                </div>
                <Badge variant="outline" className="h-6 border-indigo-500/20 text-indigo-500 font-bold bg-indigo-500/5">
                    Atualizado em Tempo Real
                </Badge>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Receita Bruta" 
                    value={`R$ ${data?.totalRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    delta="+12.5%"
                    icon={<DollarSign className="text-blue-500" />}
                    positive
                />
                <StatCard 
                    title="Liquidado (Pago)" 
                    value={`R$ ${data?.paidRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    delta="+8.2%"
                    icon={<CreditCard className="text-emerald-500" />}
                    positive
                />
                <StatCard 
                    title="Em Atraso" 
                    value={`R$ ${data?.overdueRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    delta="+2.1%"
                    icon={<ArrowDownRight className="text-rose-500" />}
                    positive={false}
                />
                <StatCard 
                    title="Churn Estimado" 
                    value="1.2%"
                    delta="-0.4%"
                    icon={<Users className="text-indigo-500" />}
                    positive
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Evolution Chart */}
                <NeonCard className="lg:col-span-2" glow={false}>
                    <NeonCardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/20">
                        <NeonCardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-indigo-500" /> Evolution Mensal (Faturamento)
                        </NeonCardTitle>
                    </NeonCardHeader>
                    <NeonCardContent className="h-[400px] p-6">
                         <DashboardCharts data={data?.chart || []} />
                    </NeonCardContent>
                </NeonCard>

                {/* Method Distribution (Placeholder / Mock) */}
                <NeonCard glow={false}>
                    <NeonCardHeader className="border-b border-border bg-muted/20">
                        <NeonCardTitle className="text-lg flex items-center gap-2">
                            <PieChart className="h-5 w-5 text-indigo-500" /> Distribuição de Receita
                        </NeonCardTitle>
                    </NeonCardHeader>
                    <NeonCardContent className="p-6 space-y-6">
                        <DistributionItem label="Pix (EFI/Iugu)" value={65} color="bg-emerald-500" />
                        <DistributionItem label="Boleto Direto (CNAB)" value={25} color="bg-blue-500" />
                        <DistributionItem label="Cartão de Crédito" value={10} color="bg-indigo-500" />
                        
                        <div className="pt-8 border-t border-border">
                            <h4 className="text-xs font-black text-muted-foreground uppercase mb-4 tracking-widest">Resumo de Gateway</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Eficiência de Cobrança</span>
                                    <span className="font-bold text-emerald-500">92%</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Taxa Média Gateways</span>
                                    <span className="font-bold">R$ 0,85 / trans</span>
                                </div>
                            </div>
                        </div>
                    </NeonCardContent>
                </NeonCard>
            </div>
        </div>
    )
}

function StatCard({ title, value, delta, icon, positive }: any) {
    return (
        <NeonCard className="relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                {icon}
            </div>
            <NeonCardContent className="p-6">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
                <div className="flex items-center gap-3 mt-2">
                    <h3 className="text-2xl font-black text-foreground">{value}</h3>
                    <Badge className={positive ? "bg-emerald-500/10 text-emerald-500 border-none" : "bg-rose-500/10 text-rose-500 border-none"}>
                        {delta}
                    </Badge>
                </div>
            </NeonCardContent>
        </NeonCard>
    )
}

function DistributionItem({ label, value, color }: any) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm font-bold">
                <span className="text-foreground">{label}</span>
                <span className="text-muted-foreground">{value}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
            </div>
        </div>
    )
}
