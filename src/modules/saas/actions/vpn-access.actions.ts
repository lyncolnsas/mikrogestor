"use server";

import { protectedAction } from "@/lib/api/action-wrapper";
import { prisma } from "@/lib/prisma";

export const getVpnDevicesAction = protectedAction(
    ["ISP_ADMIN", "TECHNICIAN", "SUPER_ADMIN"],
    async (targetTenantId: string | null = null, session) => {
        const tenantId = targetTenantId || session.tenantId;
        if (!tenantId) return [];

        return await prisma.vpnTunnel.findMany({
            where: { tenantId },
            select: {
                id: true,
                name: true,
                type: true,
                internalIp: true,
                isActive: true,
                lastHandshake: true,
                totalBytesRx: true,
                totalBytesTx: true,
                clientPrivateKey: true,
                server: {
                    select: {
                        publicEndpoint: true,
                        listenPort: true,
                        publicKey: true
                    }
                }
            },
            orderBy: { createdAt: "asc" }
        });
    }
);

export const getVpnConnectionDetailsAction = protectedAction(
    ["ISP_ADMIN", "TECHNICIAN"],
    async (tunnelId: string | null, session) => {
        if (!session.tenantId) {
            throw new Error("Usuário não associado a um provedor.");
        }

        // If ID provided, find specific. If null, find Main Router or First available.
        let tunnel = null;
        if (tunnelId) {
            tunnel = await prisma.vpnTunnel.findUnique({
                where: { id: tunnelId },
                include: { server: true }
            });
            // Security check: ensure tunnel belongs to tenant
            if (tunnel && tunnel.tenantId !== session.tenantId) tunnel = null;
        } else {
            tunnel = await prisma.vpnTunnel.findFirst({
                where: { tenantId: session.tenantId, type: "ROUTER" },
                include: { server: true }
            }) || await prisma.vpnTunnel.findFirst({
                where: { tenantId: session.tenantId },
                include: { server: true },
                orderBy: { createdAt: "asc" }
            });
        }

        if (!tunnel) return null;

        return {
            id: tunnel.id,
            name: tunnel.name,
            type: tunnel.type,
            internalIp: tunnel.internalIp,
            publicKey: tunnel.server.publicKey,
            privateKey: tunnel.clientPrivateKey,
            endpoint: `${tunnel.server.publicEndpoint}:${tunnel.server.listenPort}`,
            serverPublicKey: tunnel.server.publicKey,
            allowedIps: "10.255.0.0/16, 172.16.0.0/12, 10.0.0.0/8" // Standard internal ranges
        };
    }
);

import { verifyPassword } from "@/lib/auth/password";
import { VpnService } from "../services/vpn.service";

export const deleteVpnTunnelAction = protectedAction(
    ["SUPER_ADMIN", "ISP_ADMIN"],
    async ({ tunnelId, password }: { tunnelId: string, password?: string }, session) => {
        

        // Enforce password for deletion
        if (!password) throw new Error("Senha de administrador é obrigatória.");

        // Fetch current user from session to verify password
        const user = await prisma.user.findUnique({
            where: { id: session.userId }
        });

        if (!user) throw new Error("Usuário não encontrado.");

        // Allow bypass for specific confirmation flow (Development/Beta)
        if (password !== "CONFIRM_WITHOUT_PASSWORD_FLOW_FOR_NOW") {
            const isPasswordValid = await verifyPassword(password, user.password);
            if (!isPasswordValid) throw new Error("Senha incorreta.");
        } else {
            
        }

        const tunnel = await prisma.vpnTunnel.findUnique({
            where: { id: tunnelId }
        });

        if (!tunnel) throw new Error("Túnel não encontrado.");

        if (session.role === "ISP_ADMIN" && tunnel.tenantId !== session.tenantId) {
            throw new Error("Não autorizado.");
        }

        await VpnService.deleteTunnel(tunnelId);
        

        const { revalidatePath } = await import("next/cache");
        revalidatePath("/(isp-panel)/network/vpn");
        revalidatePath("/saas-admin/tenants");
        revalidatePath("/saas-admin/vpn-servers");
        revalidatePath("/saas-admin/mobile-vpn");

        return { success: true };
    }
);
export const updateVpnTunnelAction = protectedAction(
    ["SUPER_ADMIN", "ISP_ADMIN"],
    async ({ tunnelId, name, isActive }: { tunnelId: string, name?: string, isActive?: boolean }, session) => {
        const tunnel = await prisma.vpnTunnel.findUnique({
            where: { id: tunnelId }
        });

        if (!tunnel) throw new Error("Túnel não encontrado.");

        if (session.role === "ISP_ADMIN" && tunnel.tenantId !== session.tenantId) {
            throw new Error("Não autorizado.");
        }

        const updated = await prisma.vpnTunnel.update({
            where: { id: tunnelId },
            data: {
                ...(name !== undefined && { name }),
                ...(isActive !== undefined && { isActive })
            }
        });

        const { revalidatePath } = await import("next/cache");
        revalidatePath("/(isp-panel)/network/vpn");
        revalidatePath("/saas-admin/vpn-servers");

        return updated;
    }
);
