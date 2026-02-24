import { CreateTenantModal } from "@/modules/saas/components/create-tenant-modal";
import { prisma } from "@/lib/prisma";
import { serializeDecimal } from "@/lib/utils";
import { SaasAdminDashboardClient } from "./dashboard-client";

export default async function SaasAdminDashboard() {
    // Fetch VPN servers and plans from database (Server Component)
    const [rawServers, rawPlans] = await Promise.all([
        prisma.vpnServer.findMany({
            where: { isActive: true },
            include: {
                _count: { select: { tunnels: true } }
            },
            orderBy: { name: 'asc' }
        }),
        prisma.saasPlan.findMany({
            where: { isActive: true },
            orderBy: { monthlyPrice: 'asc' }
        })
    ]);

    // Serialize for client component
    const servers = serializeDecimal(rawServers);
    const plans = serializeDecimal(rawPlans);

    return <SaasAdminDashboardClient servers={servers} plans={plans} />;
}
