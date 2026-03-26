"use server";

import { getCurrentTenant, withTenantDb } from "@/lib/auth-utils.server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const nasSchema = z.object({
    id: z.number().optional(),
    name: z.string().min(2),
    connectionType: z.enum(["DIRECT", "VPN_TUNNEL"]),
    ipAddress: z.string().min(1),
    secret: z.string().min(4),
    apiUser: z.string().default("admin"),
    apiPassword: z.string().optional(),
    apiPort: z.number().default(8728),
    vpnProtocol: z.enum(["L2TP", "WIREGUARD"]).default("L2TP"),
    mikrotikVersion: z.enum(["v4", "v6", "v7"]).default("v6"),
});

export async function saveNas(formData: z.infer<typeof nasSchema>) {
    // Note: withTenantDb already handles context resolution
    return await withTenantDb(async (db) => {
        const context = await getCurrentTenant();
        if (!context) throw new Error("Unauthorized");

            const { 
                id, name, connectionType, ipAddress, secret, 
                apiUser, apiPassword, apiPort, vpnProtocol, mikrotikVersion 
            } = nasSchema.parse(formData);

            if (ipAddress === "Indisponível") {
                return { error: "Não foi possível identificar o IP do seu Túnel VPN. Verifique se sua cota está ativa." };
            }

            try {
                if (id) {
                    // 1. UPDATE LOGIC
                    // Check if new IP is taken by someone else
                    const taken = await db.nas.findFirst({
                        where: { 
                            nasname: ipAddress,
                            NOT: { id: id }
                        }
                    });

                    if (taken) {
                        return { error: "Este endereço IP já está sendo usado por outro concentrador." };
                    }

                    // Update existing
                    await db.nas.update({
                        where: { id, tenantId: context.tenantId },
                        data: {
                            shortname: name,
                            nasname: ipAddress,
                            secret: secret,
                            description: `Connection Type: ${connectionType}`,
                            apiUser,
                            apiPassword,
                            apiPort,
                            vpnProtocol,
                            mikrotikVersion,
                        }
                    });
                } else {
                    // 2. CREATE LOGIC
                    
                    // A. Check SaaS Plan Limits
                    const tenantWithPlan = await (db as any).tenant.findUnique({
                        where: { id: context.tenantId },
                        include: {
                            subscription: {
                                include: { plan: true }
                            }
                        }
                    });

                    const vpnLimit = tenantWithPlan?.subscription?.plan?.vpnLimit || 1;
                    const extraVpns = tenantWithPlan?.extraVpns || 0;
                    const maxNas = vpnLimit + extraVpns;

                    const currentNasCount = await db.nas.count({
                        where: { tenantId: context.tenantId }
                    });

                    if (currentNasCount >= maxNas) {
                        return { 
                            error: `Limite de concentradores do seu plano (${maxNas}) atingido. Remova um antigo ou faça um upgrade para continuar.` 
                        };
                    }

                    // B. Check if this IP is already registered (ANY tenant due to @unique constraint)
                    const existingNas = await db.nas.findUnique({
                        where: { nasname: ipAddress }
                    });

                    if (existingNas) {
                        return { error: "Este IP já está registrado por outro concentrador. Se este IP for seu, verifique se já não o cadastrou." };
                    }

                    // C. Create new with Automatic Pool
                    await db.$transaction(async (tx) => {
                        const newNas = await tx.nas.create({
                            data: {
                                shortname: name,
                                nasname: ipAddress,
                                secret: secret,
                                type: "mikrotik",
                                tenantId: context.tenantId,
                                description: `Connection Type: ${connectionType}`,
                                apiUser,
                                apiPassword,
                                apiPort,
                                vpnProtocol,
                                mikrotikVersion,
                            }
                        });

                        // AUTOMATIC POOL GENERATION
                        // We use 172.31.X.X range where X is the NAS ID (Modulo 255) to avoid local collisions
                        const poolOctet = (newNas.id % 254) + 1;
                        await (tx as any).ipPool.create({
                            data: {
                                name: `POOL_${newNas.id}_DEFAULT`,
                                rangeStart: `172.31.${poolOctet}.10`,
                                rangeEnd: `172.31.${poolOctet}.250`,
                                nasId: newNas.id,
                                description: `Pool Automática para ${newNas.shortname}`
                            }
                        });
                    });
                }

            revalidatePath("/network");
            revalidatePath("/mk-integration");
            return { success: true };
        } catch (error: any) {
            console.error("[NAS Action] Error saving NAS:", error);
            // Handle Prisma unique constraint violation
            if (error?.code === 'P2002') {
                return { error: "Este endereço IP já está em uso por outro concentrador. Escolha um IP único." };
            }
            return { error: error.message || "Erro interno ao salvar no banco de dados." };
        }
    });
}

export async function getTenantNasList() {
    return await withTenantDb(async (db) => {
        const context = await getCurrentTenant();
        if (!context) return [];

        const nasList = await db.nas.findMany({
            where: { tenantId: context.tenantId },
            orderBy: { id: 'desc' }
        });

        // Correlate with VPN Tunnels for real status
        const vpnTunnels = await db.vpnTunnel.findMany({
            where: { tenantId: context.tenantId },
            select: {
                internalIp: true,
                lastHandshake: true,
                isActive: true
            }
        });

        return nasList.map(nas => {
            const tunnel = vpnTunnels.find(t => t.internalIp === nas.nasname);
            return {
                ...nas,
                status: tunnel ? (tunnel.isActive ? "ONLINE" : "DISABLED") : "UNKNOWN",
                lastHandshake: tunnel?.lastHandshake || null,
            };
        });
    });
}
export async function deleteNasAction(nasId: number) {
    return await withTenantDb(async (db) => {
        const context = await getCurrentTenant();
        if (!context) throw new Error("Unauthorized");

        try {
            await db.nas.delete({
                where: { id: nasId, tenantId: context.tenantId }
            });

            revalidatePath("/network");
            revalidatePath("/mk-integration");
            return { success: true };
        } catch (error: any) {
            console.error("[NAS Action] Error deleting NAS:", error);
            
            // Prisma Foreign Key Constraint (P2003)
            if (error?.code === 'P2003') {
                return { error: "Não é possível excluir: existem clientes ou pools de IP vinculados a este concentrador." };
            }
            
            return { error: error.message || "Erro interno ao excluir concentrador" };
        }
    });
}

export async function getNasByIdAction(nasId: number) {
    return await withTenantDb(async (db) => {
        const context = await getCurrentTenant();
        if (!context) return null;

        return await db.nas.findUnique({
            where: { id: nasId, tenantId: context.tenantId }
        });
    });
}
