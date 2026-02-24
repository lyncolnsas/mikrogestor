import { Badge } from "@/components/ui/badge";
import { TenantActions } from "./tenant-actions";
import { CreateTenantModal } from "@/modules/saas/components/create-tenant-modal";
import { ShieldCheck, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { serializeDecimal } from "@/lib/utils";

export default async function TenantManagement() {
    const [rawPlans, rawTenants, rawServers] = await Promise.all([
        prisma.saasPlan.findMany({ where: { isActive: true } }),
        prisma.tenant.findMany({
            include: {
                subscription: { include: { plan: true } },
                _count: {
                    select: {
                        users: true,
                        vpnTunnels: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.vpnServer.findMany({
            where: { isActive: true },
            include: {
                _count: { select: { tunnels: true } }
            },
            orderBy: { name: 'asc' }
        })
    ]);

    // Explicitly serialize Decimal and Date objects for Client Components
    const plans = serializeDecimal(rawPlans);
    const tenants = serializeDecimal(rawTenants);
    const servers = serializeDecimal(rawServers);

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <ShieldCheck className="h-8 w-8 text-blue-600" /> Gestão de Assinantes (ISPs)
                    </h1>
                    <p className="text-muted-foreground mt-1 font-medium italic">Provisionamento e monitoramento de instâncias isoladas.</p>
                </div>
                <CreateTenantModal plans={plans} servers={servers} />
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-950">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">ISP / Empresa</th>
                            <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Plano & Status</th>
                            <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Infraestrutura</th>
                            <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Criado em</th>
                            <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(tenants as any[]).map((tenant) => (
                            <tr key={tenant.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                                            {tenant.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-white">{tenant.name}</div>
                                            <div className="text-xs font-mono text-slate-500">{tenant.slug}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="space-y-1">
                                        <Badge variant={tenant.status === 'ACTIVE' ? 'default' : tenant.status === 'BLOCKED' ? 'destructive' : 'secondary'} className="uppercase text-[10px] font-bold">
                                            {tenant.status === 'ACTIVE' ? 'Ativo' :
                                                tenant.status === 'BLOCKED' ? 'Bloqueado' :
                                                    tenant.status === 'CANCELLED' ? 'Cancelado' :
                                                        tenant.status === 'PROVISIONING' ? 'Provisionando' : tenant.status}
                                        </Badge>
                                        <div className="text-xs font-medium text-slate-500">
                                            {tenant.subscription?.plan?.name || "Sem Plano"}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-3 text-xs text-slate-500 font-medium">
                                        <div className="flex items-center gap-1.5" title="Usuários Ativos">
                                            <Users className="h-3.5 w-3.5" />
                                            {tenant._count?.users || 0}
                                        </div>
                                        <div className="flex items-center gap-1.5" title="Túneis VPN">
                                            <ShieldCheck className="h-3.5 w-3.5" />
                                            {tenant._count?.vpnTunnels || 0}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-slate-500 text-sm font-medium">
                                    {new Date(tenant.createdAt).toLocaleDateString()}
                                </td>
                                <td className="p-4 text-right">
                                    <TenantActions
                                        tenantId={tenant.id}
                                        status={tenant.status}
                                        name={tenant.name}
                                        plans={plans}
                                    />
                                </td>
                            </tr>
                        ))}
                        {tenants.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-12 text-center text-slate-500 italic">
                                    Nenhum provedor cadastrado no sistema.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
