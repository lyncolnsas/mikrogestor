"use server"

import { prisma } from "@/lib/prisma";
import { protectedAction } from "@/lib/api/action-wrapper";
import { revalidatePath } from "next/cache";
import * as z from "zod";

const vpnServerSchema = z.object({
    name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
    publicEndpoint: z.string().optional(),
    listenPort: z.coerce.number().int().min(1).max(65535).default(51820),
    publicKey: z.string().optional(),
    capacityLimit: z.coerce.number().int().min(1, "Capacidade mínima é 1"),
    ipsecPsk: z.string().optional(),
});

export type VpnServerInput = z.infer<typeof vpnServerSchema>;

/**
 * Provisions a new VPN Server node in the platform.
 */
export const createVpnServerAction = protectedAction(
    ["SUPER_ADMIN"],
    async (input: VpnServerInput) => {
        const data = vpnServerSchema.parse(input);

        const { VpnService } = await import("../services/vpn.service");
        const keys = VpnService.generateKeypair();

        const server = await prisma.vpnServer.create({
            data: {
                name: data.name,
                publicEndpoint: data.publicEndpoint || "", // Inicia vazio para auto-registro
                listenPort: data.listenPort,
                publicKey: data.publicKey || keys.publicKey, // Usa chave gerada se não fornecida
                capacityLimit: data.capacityLimit,
                ipsecPsk: data.ipsecPsk || "mikrogestor-psk", // Default PSK for L2TP
                isActive: true
            } as any
        });

        revalidatePath("/saas-admin/vpn-servers");
        return server;
    }
);

/**
 * Toggles a VPN server active status.
 */
export const toggleVpnServerAction = protectedAction(
    ["SUPER_ADMIN"],
    async (id: string) => {
        const server = await prisma.vpnServer.findUnique({ where: { id } });
        if (!server) throw new Error("Servidor não encontrado");

        const updated = await prisma.vpnServer.update({
            where: { id },
            data: { isActive: !server.isActive }
        });

        revalidatePath("/saas-admin/vpn-servers");
        return updated;
    }
);

/**
 * Regenerates the VPN tunnel for a specific tenant.
 */
export const regenerateVpnTunnelAction = protectedAction(
    ["SUPER_ADMIN"],
    async (tenantId: string) => {
        const { VpnService } = await import("../services/vpn.service");
        const tunnel = await VpnService.regenerateForTenant(tenantId);

        revalidatePath("/saas-admin/tenants");
        revalidatePath("/saas-admin/tower");

    }
);

/**
 * Regenerates the KeyPair for a specific VPN Server.
 * WARNING: This breaks all existing connections.
 */
export const regenerateVpnServerKeysAction = protectedAction(
    ["SUPER_ADMIN"],
    async (id: string) => {
        const { VpnService } = await import("../services/vpn.service");
        const fs = await import("fs/promises");
        const { exec } = await import("child_process");
        const util = await import("util");
        const execAsync = util.promisify(exec);

        const keys = VpnService.generateKeypair();

        // 1. Update Database
        await prisma.vpnServer.update({
            where: { id },
            data: {
                publicKey: keys.publicKey,
                serverPrivateKey: keys.privateKey,
            } as any
        });


        // 2. Write to Filesystem (Docker Volume)
        try {
            await fs.writeFile("/etc/wireguard/private.key", keys.privateKey, { mode: 0o600 });
            await fs.writeFile("/etc/wireguard/public.key", keys.publicKey, { mode: 0o644 });
            

            // 2.1 Update wg0.conf if it exists (Critical for LinuxServer/WireGuard)
            // The linuxserver image uses /config/wg_confs/wg0.conf which maps to /etc/wireguard/wg_confs/wg0.conf in our app container
            // OR checks /config which is mapped to /etc/wireguard.
            // Let's check both or standard location.
            const wgConfPath = "/etc/wireguard/wg_confs/wg0.conf";
            try {
                let wgConf = await fs.readFile(wgConfPath, "utf-8").catch(() => null);

                if (wgConf) {
                    
                    // Replace PrivateKey
                    if (wgConf.includes("PrivateKey =")) {
                        wgConf = wgConf.replace(/PrivateKey = .*/, `PrivateKey = ${keys.privateKey}`);
                    } else {
                        // Insert after [Interface]
                        wgConf = wgConf.replace("[Interface]", `[Interface]\nPrivateKey = ${keys.privateKey}`);
                    }

                    // Enforce ListenPort
                    if (wgConf.includes("ListenPort =")) {
                        wgConf = wgConf.replace(/ListenPort = .*/, "ListenPort = 51820");
                    } else {
                        wgConf = wgConf.replace("[Interface]", `[Interface]\nListenPort = 51820`);
                    }

                    await fs.writeFile(wgConfPath, wgConf, "utf-8");
                    
                } else {
                    console.warn("[VPN keys] wg0.conf not found at expected path. Skipping direct config update.");
                }
            } catch (err) {
                console.error("[VPN keys] Failed to update wg0.conf:", err);
            }

            // 3. Attempt to Reload WireGuard (if NET_ADMIN is active on this container)
            try {
                // Determine interface name (usually wg0 or wg-mikrogestor)
                // We'll try to sync or restart. wg-quick strip usage is safer.
                await execAsync("wg syncconf wg0 <(wg-quick strip wg0)");

                // Ensure IP address is set (critical fix for traffic flow)
                try {
                    await execAsync("ip addr add 10.255.0.1/16 dev wg0");
                } catch (e) {
                    // Ignore "File exists" error if IP is already assigned
                }

                await execAsync("ip link set up dev wg0");

                
            } catch (execError) {
                console.warn("[VPN keys] Could not auto-reload WireGuard. It might require container restart.", execError);
            }

        } catch (fsError) {
            console.error("[VPN keys] Failed to write keys to filesystem:", fsError);
            return { error: "Erro ao escrever chaves no disco. Verifique as permissões do Docker." };
        }

        revalidatePath("/saas-admin/vpn-servers");
        // Return success message with private key for UI display
        return {
            success: true,
            message: "Chaves regeneradas e aplicadas no servidor local.",
            privateKey: keys.privateKey
        };
    }
);

/**
 * Updates an existing VPN Server node.
 */
export const updateVpnServerAction = protectedAction(
    ["SUPER_ADMIN"],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (input: { id: string } & Partial<VpnServerInput>) => {
        const { id, ...data } = input;

        // Get current server to compare endpoint
        const currentServer = await prisma.vpnServer.findUnique({
            where: { id },
            select: { publicEndpoint: true }
        });

        if (!currentServer) {
            throw new Error("Servidor VPN não encontrado");
        }

        // Update server
        const server = await prisma.vpnServer.update({
            where: { id },
            data: {
                name: data.name,
                publicEndpoint: data.publicEndpoint,
                listenPort: data.listenPort,
                capacityLimit: data.capacityLimit,
                ipsecPsk: data.ipsecPsk,
                // publicKey: data.publicKey <-- Don't update keys here to avoid accidental breakage
            } as any
        });

        revalidatePath("/saas-admin/vpn-servers");
        return server;
    }
);

export const deleteVpnServerAction = protectedAction(
    ["SUPER_ADMIN"],
    async (input: { id: string }) => {
        await prisma.vpnServer.delete({
            where: { id: input.id }
        });
        revalidatePath("/saas-admin/vpn-servers");
        return { success: true };
    }
);
