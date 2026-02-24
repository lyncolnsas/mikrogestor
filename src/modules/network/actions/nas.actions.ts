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
});

export async function saveNas(formData: z.infer<typeof nasSchema>) {
    // Note: withTenantDb already handles context resolution
    return await withTenantDb(async (db) => {
        const context = await getCurrentTenant();
        if (!context) throw new Error("Unauthorized");

        const { id, name, connectionType, ipAddress, secret, apiUser, apiPassword, apiPort } = nasSchema.parse(formData);

        try {
            if (id) {
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
                    }
                });
            } else {
                // Create new (Upsert logic to prevent duplicate IP per tenant if needed, but schema uses unique nasname globally or per tenant?)
                // The fast way: try create, if fails handle error? Or upsert on nasname?
                // nasname is unique in schema.
                await db.nas.upsert({
                    where: { nasname: ipAddress },
                    update: {
                        shortname: name,
                        secret: secret,
                        type: "mikrotik",
                        tenantId: context.tenantId,
                        description: `Connection Type: ${connectionType}`,
                        apiUser,
                        apiPassword,
                        apiPort,
                    },
                    create: {
                        shortname: name,
                        nasname: ipAddress,
                        secret: secret,
                        type: "mikrotik",
                        tenantId: context.tenantId,
                        description: `Connection Type: ${connectionType}`,
                        apiUser,
                        apiPassword,
                        apiPort,
                    }
                });
            }

            revalidatePath("/network");
            revalidatePath("/mk-integration");
            return { success: true };
        } catch (error: unknown) {
            const err = error as Error;
            console.error("[NAS Action] Error saving NAS:", err);
            return { error: err.message || "Erro ao salvar concentrador" };
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
        } catch (error: unknown) {
            const err = error as Error;
            console.error("[NAS Action] Error deleting NAS:", err);
            return { error: err.message || "Erro ao excluir concentrador" };
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
