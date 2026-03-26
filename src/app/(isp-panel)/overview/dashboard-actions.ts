"use server"

import { prisma } from "@/lib/prisma";
import { getCurrentTenant, withTenantDb } from "@/lib/auth-utils.server";
import { startOfMonth, endOfMonth, subMonths, subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function getDashboardStats() {
    const context = await getCurrentTenant();
    if (!context) throw new Error("Unauthorized");

    return await withTenantDb(async (db) => {
        const now = new Date();
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = endOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));

        // 1. Clientes Online (Sessões Radius Ativas filtradas por Tenant)
        const tenantPrefix = `t${context.tenantId}_%`;
        const onlineCustomersResult = await db.$queryRaw`
            SELECT COUNT(DISTINCT username)::int as count 
            FROM radacct 
            WHERE acctstoptime IS NULL AND username LIKE ${tenantPrefix}
        ` as any[];
        const onlineCustomers = onlineCustomersResult[0]?.count || 0;

        // 1.1 Clientes Ativos (Contrato)
        const activeContractsResult = await db.$queryRaw`
            SELECT COUNT(*)::int as count FROM customers WHERE status = 'ACTIVE'
        ` as any[];
        const totalActive = activeContractsResult[0]?.count || 0;

        // 1.1 Clientes Ativos (Delta)
        const newCustomersThisMonthResult = await db.$queryRaw`
            SELECT COUNT(*)::int as count FROM customers 
            WHERE "createdAt" >= ${currentMonthStart} AND "createdAt" <= ${currentMonthEnd}
        ` as any[];
        const newCustomersThisMonth = newCustomersThisMonthResult[0]?.count || 0;

        const newCustomersLastMonthResult = await db.$queryRaw`
            SELECT COUNT(*)::int as count FROM customers 
            WHERE "createdAt" >= ${lastMonthStart} AND "createdAt" <= ${lastMonthEnd}
        ` as any[];
        const newCustomersLastMonth = newCustomersLastMonthResult[0]?.count || 0;

        const customerDeltaValue = newCustomersLastMonth > 0
            ? ((newCustomersThisMonth - newCustomersLastMonth) / newCustomersLastMonth) * 100
            : newCustomersThisMonth > 0 ? 100 : 0;
        const customerDeltaFormatted = (customerDeltaValue > 0 ? "+" : "") + customerDeltaValue.toFixed(1) + "%";


        // 2. Receita Mensal
        const paidInvoices = await db.invoice.aggregate({
            where: {
                status: 'PAID',
                paidAt: { gte: currentMonthStart, lte: currentMonthEnd }
            },
            _sum: { total: true }
        });
        const monthlyRevenue = Number(paidInvoices._sum?.total || 0);

        const lastMonthInvoices = await db.invoice.aggregate({
            where: {
                status: 'PAID',
                paidAt: { gte: lastMonthStart, lte: lastMonthEnd }
            },
            _sum: { total: true }
        });
        const lastMonthRevenue = Number(lastMonthInvoices._sum?.total || 0);

        const revenueDeltaValue = lastMonthRevenue > 0
            ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
            : monthlyRevenue > 0 ? 100 : 0;
        const revenueDeltaFormatted = (revenueDeltaValue > 0 ? "+" : "") + revenueDeltaValue.toFixed(1) + "%";


        // 3. Inadimplência (Total Overdue)
        const overdueInvoices = await db.invoice.aggregate({
            where: { status: 'OVERDUE' },
            _sum: { total: true }
        });
        const overdueAmount = Number(overdueInvoices._sum?.total || 0);


        // 4. Ordens de Serviço Abertas
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const openOrders = await (db as any).serviceOrder.count({
            where: { status: { in: ['PENDING', 'ON_ROUTE', 'IN_SERVICE'] } }
        });

        // 5. Status NAS
        const nasCount = await prisma.nas.count({
            where: { tenantId: context.tenantId }
        });
        const activeNas = nasCount;

        return {
            activeCustomers: onlineCustomers.toLocaleString(),
            totalActive: totalActive.toLocaleString(),
            monthlyRevenue: monthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            overdueAmount: overdueAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            openOrders: openOrders.toString(),
            nasStatus: `${activeNas}/${nasCount}`,
            revenueDelta: revenueDeltaFormatted,
            customerDelta: customerDeltaFormatted,
            ordersDelta: "0"
        };
    });
}

export async function getRecentActivations() {
    const context = await getCurrentTenant();
    if (!context) throw new Error("Unauthorized");

    return await withTenantDb(async (db) => {
        const recentCustomers = await db.$queryRaw`
            SELECT c.*, p.name as "plan_name"
            FROM customers c
            LEFT JOIN plans p ON c.plan_id = p.id
            WHERE c.status = 'ACTIVE'
            ORDER BY c."createdAt" DESC
            LIMIT 5
        ` as any[];

        return recentCustomers.map(c => ({
            id: c.id,
            name: c.name,
            plan: c.plan_name || "Sem Plano",
            nas: "Processando...",
            time: format(new Date(c.createdAt), "dd/MM HH:mm", { locale: ptBR })
        }));
    });
}

export async function getTopDebtors() {
    const context = await getCurrentTenant();
    if (!context) throw new Error("Unauthorized");

    return await withTenantDb(async (db) => {
        // Group overdue invoices by customer
        const overdueInvoices = await db.invoice.findMany({
            where: { status: 'OVERDUE' },
            include: {
                customer: {
                    include: { plan: true }
                }
            }
        });

        // Aggregate manually (Prisma groupBy doesn't support relations well in all versions/Client types easily)
        const debtorMap = new Map<string, {
            id: string;
            name: string;
            cnpj: string;
            planName: string;
            totalDebt: number;
            oldestDue: Date;
        }>();

        for (const invoice of overdueInvoices) {
            const current = debtorMap.get(invoice.customerId) || {
                id: invoice.customer.id,
                name: invoice.customer.name,
                cnpj: invoice.customer.cpfCnpj,
                planName: invoice.customer.plan?.name || "Sem Plano",
                totalDebt: 0,
                oldestDue: invoice.dueDate
            };

            current.totalDebt += Number(invoice.total);
            if (new Date(invoice.dueDate) < new Date(current.oldestDue)) {
                current.oldestDue = invoice.dueDate;
            }
            debtorMap.set(invoice.customerId, current);
        }

        const sortedDebtors = Array.from(debtorMap.values())
            .sort((a, b) => b.totalDebt - a.totalDebt)
            .slice(0, 10);

        const now = new Date();

        return sortedDebtors.map(d => {
            const diffTime = Math.abs(now.getTime() - new Date(d.oldestDue).getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return {
                id: d.id,
                name: d.name,
                cnpj: d.cnpj,
                plan: d.planName,
                debt: d.totalDebt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                daysLate: `${diffDays} Dias`
            };
        });
    });
}


export async function getDashboardChartData() {
    const context = await getCurrentTenant();
    if (!context) throw new Error("Unauthorized");

    return await withTenantDb(async (db) => {
        // Last 6 months chart (to match screenshot "últimos 6 meses")
        // Screenshot shows Jan, Feb, Mar, Apr (Forecast?)
        // Let's do current month + 5 past months
        const chartData = [];
        const now = new Date();
        const startOfPeriod = startOfMonth(subMonths(now, 5));

        for (let i = 5; i >= 0; i--) {
            const date = subMonths(now, i);
            const monthStart = startOfMonth(date);
            const monthEnd = endOfMonth(date);
            const monthName = format(date, "MMM", { locale: ptBR }); // jan, fev...

            // Realized Revenue (Paid this month)
            const realized = await db.invoice.aggregate({
                where: {
                    status: 'PAID',
                    paidAt: { gte: monthStart, lte: monthEnd }
                },
                _sum: { total: true }
            });

            // Predicted Revenue (Due this month - All statuses)
            const predicted = await db.invoice.aggregate({
                where: {
                    dueDate: { gte: monthStart, lte: monthEnd }
                },
                _sum: { total: true }
            });

            chartData.push({
                name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
                realizado: Number(realized._sum?.total || 0),
                previsto: Number(predicted._sum?.total || 0)
            });
        }

        return chartData;
    });
}

export async function getIspSubscriptionAction() {
    const context = await getCurrentTenant();
    if (!context) throw new Error("Unauthorized");

    // 1. Get Tenant with Subscription and Plan from Global Schema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tenant = await (prisma as any).tenant.findUnique({
        where: { id: context.tenantId },
        include: {
            subscription: {
                include: { plan: true }
            }
        }
    });

    if (!tenant || !tenant.subscription) {
        return {
            planName: "Nenhum",
            maxCustomers: 0,
            usedCustomers: 0,
            percent: 0,
        };
    }

    const { plan } = tenant.subscription;

    // 2. Get Count of Customers from Tenant Schema
    return await withTenantDb(async (db) => {
        const usedCustomers = await db.customer.count();

        return {
            planId: plan.id,
            planName: plan.name,
            maxCustomers: plan.maxCustomers,
            usedCustomers: usedCustomers,
            percent: Math.min(100, Math.round((usedCustomers / plan.maxCustomers) * 100)),
        };
    });
}

export async function getNetworkStatusAction() {
    const context = await getCurrentTenant();
    if (!context) throw new Error("Unauthorized");

    // 1. Fetch VPN Tunnel (Management Schema)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tunnel = await (prisma as any).vpnTunnel.findFirst({
        where: { tenantId: context.tenantId },
        include: { server: true }
    });

    // 2. Fetch NAS List (Radius Schema/Management)
    const nasList = await prisma.nas.findMany({
        where: { tenantId: context.tenantId }
    });

    // Determine Tunnel Status
    const isTunnelOnline = tunnel?.lastHandshake ?
        (new Date().getTime() - new Date(tunnel.lastHandshake).getTime() < 5 * 60 * 1000) :
        false;

    return {
        tunnel: tunnel ? {
            id: tunnel.id,
            name: tunnel.routerIdentity || "Túnel VPN Principal",
            status: isTunnelOnline ? "online" : "offline",
            lastHandshake: tunnel.lastHandshake,
            server: tunnel.server.name,
            ip: tunnel.internalIp
        } : null,
        nas: nasList.map((n: any) => ({
            id: n.id,
            name: n.shortname || n.nasname,
            status: isTunnelOnline ? "online" : "offline", // Since NAS is behind the tunnel for now
            type: n.type,
            ip: n.nasname
        }))
    };
}
