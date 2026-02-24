import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { withTenantDb } from "@/lib/auth-utils.server";

export const dynamic = "force-dynamic";
import { DashboardCharts } from "./dashboard-charts"
import { Button } from "@/components/ui/button"
import { Banknote, TrendingUp, Users, AlertCircle } from "lucide-react"
import { GenerateInvoicesButton } from "@/modules/financial/components/generate-invoices-button"

async function getDashboardData() {
    return await withTenantDb(async (db) => {
        // 1. Fetch real revenue data (simplified aggregation)
        const invoices = await db.invoice.findMany({
            where: { status: 'PAID' },
            select: { total: true, createdAt: true },
            take: 100
        });

        // 2. Fetch basic stats
        const totalCustomers = await db.customer.count();
        const overdueInvoices = await db.invoice.count({
            where: { status: 'OVERDUE' }
        });

        const totalRevenue = invoices.reduce((acc: number, inv: { total: unknown }) => acc + Number(inv.total), 0);

        // 3. Fetch Financial Config
        const config = await db.financialConfig.findFirst();

        // Dynamic chart data (Mocking months if DB is empty, but trying to use real if present)
        const chartData = [
            { name: 'Jan', realizado: 0, previsto: 0 },
            { name: 'Feb', realizado: 0, previsto: 0 },
            { name: 'Mar', realizado: 0, previsto: 0 },
            { name: 'Apr', realizado: 0, previsto: 0 },
            { name: 'May', realizado: 0, previsto: 0 },
            { name: 'Jun', realizado: 0, previsto: 0 },
        ];

        // Simple month mapping
        invoices.forEach((inv: { createdAt: Date, total: unknown }) => {
            const month = inv.createdAt.getMonth(); // 0-11
            if (month >= 0 && month < 6) {
                chartData[month].realizado += Number(inv.total);
            }
        });

        return {
            stats: {
                revenue: totalRevenue,
                customers: totalCustomers,
                overdue: overdueInvoices
            },
            config: {
                interestRate: Number(config?.interestRate || 0),
                penaltyAmount: Number(config?.penaltyAmount || 0)
            },
            chartData
        };
    });
}

import { MassBlockButton } from "@/modules/financial/components/mass-block-button";
import Link from "next/link";

export default async function FinancialDashboard() {
    const data = await getDashboardData();

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard Financeiro</h1>
                    <p className="text-muted-foreground">Visão geral do seu provedor em tempo real.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" size="sm" className="flex-1 md:flex-none">Exportar Relatório</Button>
                    <div className="flex-1 md:flex-none">
                        <GenerateInvoicesButton />
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Receita Total"
                    value={`R$ ${data.stats.revenue.toLocaleString()}`}
                    icon={<Banknote className="h-5 w-5 text-emerald-500" />}
                    description="+12.5% em relação ao mês anterior"
                />
                <StatCard
                    title="Assinantes Ativos"
                    value={data.stats.customers.toString()}
                    icon={<Users className="h-5 w-5 text-blue-500" />}
                    description="Crescimento constante"
                />
                <StatCard
                    title="Inadimplência"
                    value={data.stats.overdue.toString()}
                    icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
                    description="Requer atenção imediata"
                    isAlert={data.stats.overdue > 0}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 shadow-sm border-border bg-card">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Receita Mensal (BRL)</CardTitle>
                            <p className="text-xs text-muted-foreground pt-1">Faturamento bruto nos últimos 6 meses</p>
                        </div>
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent className="h-[350px] pt-4">
                        <DashboardCharts data={data.chartData} />
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-border bg-card">
                    <CardHeader>
                        <CardTitle>Ações Rápidas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 rounded-lg bg-muted/10 border border-border space-y-3">
                            <p className="text-sm font-medium text-foreground">Bloqueio Automático</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Existem {data.stats.overdue} faturas atrasadas aguardando bloqueio de rede.
                            </p>
                            <MassBlockButton disabled={data.stats.overdue === 0} />
                        </div>

                        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-3">
                            <p className="text-sm font-medium text-blue-400">Configuração de Juros</p>
                            <p className="text-xs text-blue-300 leading-relaxed">
                                Sua taxa atual é de {data.config.interestRate}% ao mês + R$ {data.config.penaltyAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de multa.
                            </p>
                            <Link href="/settings/financial" className="block w-full">
                                <Button variant="outline" className="w-full text-xs h-8 border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                                    Ajustar Regras Financeiras
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    description: string;
    isAlert?: boolean;
}

function StatCard({ title, value, icon, description, isAlert }: StatCardProps) {
    return (
        <Card className={`shadow-sm transition-all border-border bg-card ${isAlert ? 'ring-1 ring-amber-500/50 bg-amber-950/20' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <div className="p-2 rounded-full bg-muted/20">
                    {icon}
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-foreground">{value}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    {description}
                </p>
            </CardContent>
        </Card>
    )
}
