"use client"

import { NeonCard, NeonCardContent, NeonCardHeader, NeonCardTitle } from "@/components/ui/neon-card"
import { Button } from "@/components/ui/button"
import {
    TrendingUp,
    Activity,
    Server,
    Plus,
    ArrowUpRight,
    Wifi,
    SignalHigh,
    AlertTriangle
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { DashboardCharts } from "../financial/dashboard/dashboard-charts"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface KpiCardProps {
    title: string
    value: string
    delta: string
    icon: React.ReactNode
    trend: "up" | "down" | "alert"
}

interface FeedRowProps {
    name: string
    plan: string
    nas: string
    time: string
}

interface Activation {
    id: string
    name: string
    plan: string
    nas: string
    time: string
}

interface Debtor {
    id: string
    name: string
    cnpj: string
    plan: string
    debt: string
    daysLate: string
}

import * as React from "react"
import {
    getDashboardStats,
    getRecentActivations,
    getIspSubscriptionAction,
    getNetworkStatusAction,
    getDashboardChartData,
    getTopDebtors
} from "./dashboard-actions"
import { CreateCustomerModal } from "@/modules/customers/components/create-customer-modal"
import { Progress } from "@/components/ui/progress"
import { Users2, ShieldCheck, ShieldAlert } from "lucide-react"

export default function ProviderDashboard() {
    const [stats, setStats] = React.useState<{
        activeCustomers: string;
        monthlyRevenue: string;
        overdueAmount: string;
        openOrders: string;
        nasStatus: string;
        revenueDelta: string;
        customerDelta: string;
        ordersDelta: string;
    } | null>(null)
    const [subscription, setSubscription] = React.useState<{
        planName: string;
        maxCustomers: number;
        usedCustomers: number;
        percent: number;
    } | null>(null)
    const [networkStatus, setNetworkStatus] = React.useState<{
        tunnel: { name: string; ip: string; status: "online" | "offline" } | null;
        nas: { id: string; name: string; ip: string; status: "online" | "offline" }[];
    } | null>(null)
    const [activations, setActivations] = React.useState<Activation[]>([])
    const [debtors, setDebtors] = React.useState<Debtor[]>([])
    const [chartData, setChartData] = React.useState<{ name: string; realizado: number; previsto: number }[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    const loadData = React.useCallback(async () => {
        try {
            const [s, a, sub, net, chart, d] = await Promise.all([
                getDashboardStats(),
                getRecentActivations(),
                getIspSubscriptionAction(),
                getNetworkStatusAction(),
                getDashboardChartData(),
                getTopDebtors()
            ])
            setStats(s)
            setActivations(a)
            setSubscription(sub)
            setChartData(chart)
            setDebtors(d)
            setNetworkStatus({
                tunnel: net?.tunnel ? { ...net.tunnel, status: net.tunnel.status as "online" | "offline" } : null,
                nas: net?.nas?.map(n => ({ ...n, id: String(n.id), status: n.status as "online" | "offline" })) || []
            })
        } catch (error) {
            console.error("Failed to load dashboard statistics", error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        loadData()
    }, [loadData])

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-700"
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">Painel do Provedor</h1>
                    <p className="text-muted-foreground mt-1 text-pretty text-sm md:text-base">Bem-vindo, Mikrogestor. Aqui está o resumo da sua rede e financeiro.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <Button
                        variant="outline"
                        className="w-full sm:w-auto gap-2"
                        onClick={() => toast.info("Ferramenta de diagnóstico em desenvolvimento", {
                            description: "Em breve você poderá rodar testes de ping e traceroute aqui."
                        })}
                    >
                        <Activity className="h-4 w-4" /> Diagnóstico
                    </Button>
                    <CreateCustomerModal
                        onSuccess={loadData}
                        trigger={
                            <Button className="w-full sm:w-auto gap-2 bg-primary shadow-lg shadow-primary/20">
                                <Plus className="h-4 w-4" /> Novo Assinante
                            </Button>
                        }
                    />
                </div>
            </div>

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    title="Assinantes Online"
                    value={stats?.activeCustomers || (isLoading ? "..." : "0")}
                    delta={stats?.customerDelta || "+0%"}
                    icon={<SignalHigh className="text-emerald-500" />}
                    trend="up"
                />
                <KpiCard
                    title="Faturamento (Mês)"
                    value={stats?.monthlyRevenue || (isLoading ? "..." : "R$ 0,00")}
                    delta={stats?.revenueDelta || "+0%"}
                    icon={<TrendingUp className="text-blue-500" />}
                    trend="up"
                />

                {/* Plan Usage Card */}
                {/* <NeonCard variant="primary" className="relative overflow-hidden group">
                    <NeonCardContent className="p-6"> ... </NeonCardContent>
                </NeonCard> */}

                {/* Insolvency Card */}
                <NeonCard variant="destructive" className="relative overflow-hidden group hover:scale-[1.02] transition-transform">
                    <NeonCardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="h-10 w-10 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                                <AlertTriangle className="h-5 w-5 text-rose-500" />
                            </div>
                            <Badge className="text-[10px] font-bold bg-rose-500/10 text-rose-500 border-none">
                                Risco Financeiro
                            </Badge>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground">INADIMPLÊNCIA TOTAL</p>
                        <NeonCardTitle className="text-2xl font-black mt-1 tracking-tight text-foreground">
                            {stats?.overdueAmount || (isLoading ? "..." : "R$ 0,00")}
                        </NeonCardTitle>
                        <div className="mt-4">
                            <Button variant="ghost" size="sm" className="w-full text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" onClick={() => document.getElementById('debtors-section')?.scrollIntoView({ behavior: 'smooth' })}>
                                Ver Relatório de Perdas
                            </Button>
                        </div>
                    </NeonCardContent>
                </NeonCard>


                <KpiCard
                    title="NAS Ativos"
                    value={stats?.nasStatus || (isLoading ? "..." : "0/0")}
                    delta="Monitorado"
                    icon={<Server className="text-rose-500" />}
                    trend="alert"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Growth Chart */}
                <NeonCard className="lg:col-span-8 overflow-hidden" glow={false}>
                    <NeonCardHeader className="flex flex-row items-center justify-between bg-muted/20 border-b border-border">
                        <div>
                            <NeonCardTitle className="text-lg">Fluxo de Caixa: Previsto vs Realizado</NeonCardTitle>
                            <p className="text-xs text-muted-foreground">Histórico financeiro nos últimos 6 meses.</p>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </NeonCardHeader>
                    <NeonCardContent className="h-[400px] p-6 text-foreground">
                        <DashboardCharts data={chartData} />
                    </NeonCardContent>
                </NeonCard>

                {/* Network Status Sidebar */}
                <NeonCard className="lg:col-span-4" glow={false}>
                    <NeonCardHeader className="bg-muted/20 border-b border-border flex flex-row items-center justify-between">
                        <NeonCardTitle className="text-lg">Status da Infraestrutura</NeonCardTitle>
                        {networkStatus?.tunnel && (
                            <Badge variant="outline" className={cn(
                                "text-[10px] uppercase font-black px-2",
                                networkStatus.tunnel.status === "online" ? "border-emerald-500 text-emerald-600 bg-emerald-500/10" : "border-rose-500 text-rose-600 bg-rose-500/10"
                            )}>
                                VPN: {networkStatus.tunnel.status}
                            </Badge>
                        )}
                    </NeonCardHeader>
                    <NeonCardContent className="p-0">
                        <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                            {/* VPN Tunnel Row */}
                            {networkStatus?.tunnel && (
                                <div className="p-4 flex items-center justify-between bg-muted/10">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center",
                                            networkStatus.tunnel.status === "online" ? "bg-emerald-500/10" : "bg-rose-500/10"
                                        )}>
                                            {networkStatus.tunnel.status === "online" ?
                                                <ShieldCheck className="h-5 w-5 text-emerald-600" /> :
                                                <ShieldAlert className="h-5 w-5 text-rose-600" />
                                            }
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{networkStatus.tunnel.name}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-black">Link de Gerência • {networkStatus.tunnel.ip}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* NAS Rows */}
                            {networkStatus?.nas && networkStatus.nas.length > 0 ? (
                                networkStatus.nas.map((nas) => (
                                    <div key={nas.id} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "h-10 w-10 rounded-xl flex items-center justify-center",
                                                nas.status === "online" ? "bg-indigo-500/10" : "bg-rose-500/10"
                                            )}>
                                                <Wifi className={cn(
                                                    "h-5 w-5",
                                                    nas.status === "online" ? "text-indigo-600" : "text-rose-600"
                                                )} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">{nas.name}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase font-black">{nas.ip}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="outline" className={cn(
                                                "h-4 text-[8px] px-1",
                                                nas.status === "online" ? "border-emerald-500 text-emerald-600" : "border-rose-500 text-rose-600"
                                            )}>
                                                {nas.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-muted-foreground italic text-xs">
                                    Nenhum concentrador configurado.
                                </div>
                            )}
                        </div>
                        <div className="p-4 pt-6">
                            <Link href="/mk-integration">
                                <Button variant="outline" size="sm" className="w-full text-xs gap-2">
                                    Ver Gerência de Rede <ArrowUpRight className="h-3 w-3" />
                                </Button>
                            </Link>
                        </div>
                    </NeonCardContent>
                </NeonCard>
            </div>

            {/* Top Debtors Section */}
            <NeonCard className="overflow-hidden" glow={false} id="debtors-section">
                <NeonCardHeader className="flex flex-row items-center justify-between bg-muted/20 border-b border-border">
                    <div>
                        <NeonCardTitle className="text-lg">Top 10 Inadimplentes (Maiores Débitos)</NeonCardTitle>
                        <p className="text-xs text-muted-foreground">Clientes com maiores valores em aberto.</p>
                    </div>
                </NeonCardHeader>
                <NeonCardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-[10px] uppercase font-bold text-muted-foreground bg-muted/30 font-mono">
                                <tr>
                                    <th className="px-6 py-3">Assinante / Empresa</th>
                                    <th className="px-6 py-3">Plano</th>
                                    <th className="px-6 py-3">Valor Devido</th>
                                    <th className="px-6 py-3">Atraso</th>
                                    <th className="px-6 py-3 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {debtors.length > 0 ? (
                                    debtors.map((debtor) => (
                                        <tr key={debtor.id} className="hover:bg-muted/10 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-foreground">{debtor.name}</div>
                                                <div className="text-[10px] text-muted-foreground">CNPJ: {debtor.cnpj}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="secondary" className="text-[10px] font-bold">{debtor.plan}</Badge>
                                            </td>
                                            <td className="px-6 py-4 font-black text-rose-500">
                                                {debtor.debt}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className="border-rose-500/50 text-rose-500 bg-rose-500/10">
                                                    {debtor.daysLate}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button size="sm" variant="ghost" className="text-xs text-primary hover:text-primary hover:bg-primary/10">
                                                    ABRIR COBRANÇA
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground italic text-xs">
                                            {isLoading ? "Carregando inadimplentes..." : "Nenhum cliente inadimplente encontrado (Parabéns!)."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </NeonCardContent>
            </NeonCard>

            {/* Activation Feed */}
            <NeonCard className="bg-card" glow={false}>
                <NeonCardHeader className="flex flex-row items-center justify-between bg-muted/20 border-b border-border">
                    <NeonCardTitle className="text-lg">Ativações Recentes</NeonCardTitle>
                    <Badge variant="outline">Tempo Real</Badge>
                </NeonCardHeader>
                <NeonCardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-[10px] uppercase font-bold text-muted-foreground bg-muted/30 font-mono">
                                <tr>
                                    <th className="px-6 py-3">Assinante</th>
                                    <th className="px-6 py-3">Plano</th>
                                    <th className="px-6 py-3">Concentrador</th>
                                    <th className="px-6 py-3 text-right">Horário</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {activations.length > 0 ? (
                                    activations.map((act) => (
                                        <FeedRow
                                            key={act.id}
                                            name={act.name}
                                            plan={act.plan}
                                            nas={act.nas}
                                            time={act.time}
                                        />
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground italic text-xs">
                                            {isLoading ? "Carregando ativações..." : "Nenhuma ativação recente encontrada."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </NeonCardContent>
            </NeonCard>
        </motion.div>
    )
}

function KpiCard({ title, value, delta, icon, trend }: KpiCardProps) {
    const variantMap = {
        up: "success" as const,
        down: "primary" as const,
        alert: "destructive" as const
    }

    return (
        <NeonCard variant={variantMap[trend]} className="hover:scale-[1.02] transition-transform">
            <NeonCardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="h-10 w-10 rounded-2xl bg-muted/30 flex items-center justify-center border border-border">
                        {icon}
                    </div>
                    <Badge className={cn(
                        "text-[10px] font-bold",
                        trend === "up" ? "bg-emerald-500/10 text-emerald-500 border-none" :
                            trend === "down" ? "bg-blue-500/10 text-blue-500 border-none" :
                                "bg-rose-500/10 text-rose-500 border-none"
                    )}>
                        {delta}
                    </Badge>
                </div>
                <p className="text-xs font-medium text-muted-foreground">{title}</p>
                <NeonCardTitle className="text-2xl font-black mt-1 tracking-tight text-foreground">{value}</NeonCardTitle>
            </NeonCardContent>
        </NeonCard>
    )
}

function FeedRow({ name, plan, nas, time }: FeedRowProps) {
    return (
        <tr className="hover:bg-muted/10 transition-colors">
            <td className="px-6 py-4 font-medium text-foreground">{name}</td>
            <td className="px-6 py-4">
                <Badge variant="secondary" className="text-[10px] font-bold">{plan}</Badge>
            </td>
            <td className="px-6 py-4 text-xs font-medium text-muted-foreground">{nas}</td>
            <td className="px-6 py-4 text-right text-[10px] font-bold text-muted-foreground">{time}</td>
        </tr>
    )
}
