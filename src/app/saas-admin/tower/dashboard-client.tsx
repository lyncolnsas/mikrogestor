"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link";
import {
    Building2,
    TrendingUp,
    Globe,
    ArrowUpRight,
    ChevronRight,
    Activity,
    Zap,
    DollarSign
} from "lucide-react"
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { Badge } from "@/components/ui/badge"

import { useQuery } from "@tanstack/react-query";
import { getGlobalMetricsAction, getTenantsAction } from "@/modules/saas/actions/saas-actions";
import { CreateTenantModal } from "@/modules/saas/components/create-tenant-modal";
import { HealthStatusCard } from "@/modules/saas/components/health-status-card";
import { SystemHealth } from "@/modules/saas/services/health.service";

interface SaasPlan {
    id: string;
    name: string;
    monthlyPrice: number;
}

interface VpnServer {
    id: string;
    name: string;
    capacityLimit: number;
    _count: { tunnels: number };
}

interface GlobalMetrics {
    mrr: number | string;
    tenants: number;
    endpoints: number;
    infraLoad: string;
    chart: Array<{ name: string; revenue: number; tenants: number }>;
    health: SystemHealth;
}

interface TenantBrief {
    id: string;
    name: string;
    _count: { vpnTunnels: number };
}

export function SaasAdminDashboardClient({ servers, plans }: { servers: VpnServer[], plans: SaasPlan[] }) {
    const { data: metrics } = useQuery<GlobalMetrics>({
        queryKey: ["saas-metrics"],
        queryFn: async () => {
            const res = await getGlobalMetricsAction();
            if (!res.data) throw new Error("Could not fetch global metrics");
            return res.data as GlobalMetrics;
        }
    });

    const { data: tenants = [] } = useQuery<TenantBrief[]>({
        queryKey: ["saas-tenants"],
        queryFn: async () => {
            const res = await getTenantsAction(null);
            return (res.data || []) as TenantBrief[];
        }
    });

    const globalChartData = metrics?.chart || [
        { name: 'Jan', revenue: 0, tenants: 0 },
    ];

    return (
        <div className="min-h-screen bg-slate-950 space-y-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800/50 pb-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/80">Plataforma de Gestão SaaS</span>
                    </div>
                    <h1 className="text-2xl md:text-5xl font-black tracking-tighter text-white">Torre de Controle</h1>
                    <p className="text-slate-400 mt-2 font-medium text-sm md:text-base">Controle global e métricas agregadas da plataforma SaaS.</p>
                </div>
                <div className="flex gap-4">
                    <Link href="/saas-admin/billing">
                        <Button variant="outline" className="rounded-2xl font-bold border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-white gap-2 transition-all active:scale-95 px-6">
                            <Zap className="h-4 w-4 text-amber-500" /> Relatório
                        </Button>
                    </Link>
                    <CreateTenantModal plans={plans || []} servers={servers} />
                </div>
            </div>

            {/* Global KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <GlobalKpiCard
                    title="RMR Global"
                    value={metrics ? `R$ ${Number(metrics.mrr).toLocaleString()}` : "---"}
                    delta="+14.2%"
                    icon={<DollarSign className="h-6 w-6 text-emerald-400" />}
                    description="Receita recorrente mensal acumulada"
                    color="emerald"
                    href="/saas-admin/billing"
                />
                <GlobalKpiCard
                    title="Provedores Ativos"
                    value={metrics?.tenants.toString() || "0"}
                    delta="+novo"
                    icon={<Building2 className="h-6 w-6 text-blue-400" />}
                    description="Provedores utilizando a plataforma"
                    color="blue"
                    href="/saas-admin/tenants"
                />
                <GlobalKpiCard
                    title="Túneis VPN"
                    value={metrics?.endpoints.toString() || "0"}
                    delta="Ativo"
                    icon={<Globe className="h-6 w-6 text-indigo-400" />}
                    description="Túneis MikroTik ativos e saudáveis"
                    color="indigo"
                    href="/saas-admin/vpn-servers"
                />
                <GlobalKpiCard
                    title="Carga de Infra"
                    value={metrics?.infraLoad || "0%"}
                    delta="Estável"
                    icon={<Activity className="h-6 w-6 text-slate-400" />}
                    description="Uso médio dos servidores WireGuard"
                    color="slate"
                    href="/saas-admin/vpn-servers"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Revenue & Growth Chart */}
                <Card className="lg:col-span-8 bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-3xl rounded-[32px] overflow-hidden border">
                    <CardHeader className="flex flex-row items-center justify-between p-8 border-b border-slate-800/50">
                        <div>
                            <CardTitle className="text-2xl font-black text-white tracking-tight">Crescimento de Receita (Global)</CardTitle>
                            <p className="text-sm text-slate-400 mt-1 font-medium">Evolução do faturamento e aquisição de novos tenants.</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <TrendingUp className="h-5 w-5 text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="h-[450px] p-8 pt-12">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={globalChartData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorTenants" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" opacity={0.5} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fontWeight: 700, fill: '#64748B' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fontWeight: 700, fill: '#64748B' }}
                                    tickFormatter={(value) => `R$ ${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
                                />
                                <Tooltip
                                    cursor={{ stroke: '#334155', strokeWidth: 2 }}
                                    contentStyle={{
                                        backgroundColor: '#0F172A',
                                        borderRadius: '20px',
                                        border: '1px solid #1E293B',
                                        boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)',
                                        padding: '12px 16px'
                                    }}
                                    itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                                    labelStyle={{ fontWeight: 900, fontSize: '10px', color: '#64748B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#3B82F6"
                                    strokeWidth={4}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                    animationDuration={2000}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="tenants"
                                    stroke="#10B981"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    fillOpacity={1}
                                    fill="url(#colorTenants)"
                                    animationDuration={2500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* System Health */}
                <div className="lg:col-span-4 h-full">
                    <HealthStatusCard health={metrics?.health} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <Card className="lg:col-span-4 bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-3xl rounded-[32px] overflow-hidden border">
                    <CardHeader className="p-8 border-b border-slate-800/50">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-2xl font-black text-white tracking-tight">Tenants Recentes</CardTitle>
                            <Badge className="bg-slate-800 text-slate-300 border-slate-700">Recentes</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-800/50">
                            {tenants.map((tenant) => (
                                <div key={tenant.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-all group cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-500/10 group-hover:border-blue-500/50 group-hover:text-blue-400 transition-all">
                                            {tenant.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-lg group-hover:translate-x-1 transition-transform">{tenant.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{tenant._count.vpnTunnels} Endpoints Ativos</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-10 w-10 rounded-full border border-slate-800 flex items-center justify-center text-slate-600 group-hover:text-white group-hover:border-slate-700 group-hover:translate-x-1 transition-all">
                                        <ChevronRight className="h-5 w-5" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-8">
                            <Link href="/saas-admin/tenants">
                                <Button variant="ghost" className="w-full h-14 font-black rounded-2xl gap-3 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 bg-blue-500/5 border border-blue-500/10 transition-all">
                                    Ver Todos os Tenants <ArrowUpRight className="h-5 w-5" />
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

interface GlobalKpiCardProps {
    title: string;
    value: string;
    delta: string;
    icon: React.ReactNode;
    description: string;
    color: 'emerald' | 'blue' | 'indigo' | 'slate';
    href?: string;
}

function GlobalKpiCard({ title, value, delta, icon, description, color, href }: GlobalKpiCardProps) {
    const colorMap = {
        emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
        blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
        indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
        slate: "bg-slate-500/10 border-slate-500/20 text-slate-400",
    }

    const CardContentWrapper = (
        <CardContent className="p-5 md:p-8">
            <div className="flex justify-between items-start mb-4 md:mb-8">
                <div className={`h-12 w-12 md:h-16 md:w-16 rounded-[16px] md:rounded-[22px] flex items-center justify-center border transition-all duration-500 group-hover:scale-110 ${colorMap[color]}`}>
                    {/* Clone element to adjust icon size via prop if needed, or rely on parent sizing */}
                    <div className="scale-75 md:scale-100 transform transition-transform">
                        {icon}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <Badge className={`${color === 'blue' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800/50 text-slate-400'} border-none font-black text-[10px] px-3 py-1.5 rounded-full uppercase tracking-widest`}>
                        {delta}
                    </Badge>
                    <div className="flex gap-0.5 mt-2">
                        {[1, 2, 3].map(i => <div key={i} className={`h-1 w-2 rounded-full ${i === 1 ? colorMap[color].split(' ')[2] : 'bg-slate-800'}`} />)}
                    </div>
                </div>
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1 md:mb-2 group-hover:text-slate-400 transition-colors">{title}</p>
                <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter group-hover:scale-105 origin-left transition-transform duration-500">{value}</h3>
                <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-slate-800/50">
                    <p className="text-[11px] md:text-[12px] text-slate-400 font-medium leading-relaxed group-hover:text-slate-300 transition-colors">
                        {description}
                    </p>
                </div>
            </div>
        </CardContent>
    );

    const cardClassName = "bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-2xl rounded-[24px] md:rounded-[32px] overflow-hidden hover:translate-y-[-8px] hover:border-slate-700/80 transition-all duration-500 group border cursor-pointer";

    if (href) {
        return (
            <Link href={href} className="block h-full">
                <Card className={cardClassName}>
                    {CardContentWrapper}
                </Card>
            </Link>
        );
    }

    return (
        <Card className={cardClassName.replace("cursor-pointer", "")}>
            {CardContentWrapper}
        </Card>
    )
}
