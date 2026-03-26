"use server"

import { protectedAction } from "@/lib/api/action-wrapper";
import { prisma } from "@/lib/prisma";
import { VpnKeyService } from "../vpn-key.service";
import { MikrotikScriptGenerator } from "../mikrotik-script-generator";

/**
 * Generates the MikroTik ROS7 commands to configure the WireGuard interface.
 */
export const getMikrotikVpnConfigAction = protectedAction(
    ["ISP_ADMIN", "SUPER_ADMIN"],
    async (options: { tunnelId?: string | null, pppoeInterface?: string, hotspotInterface?: string, hotspotDnsName?: string } | null, session) => {
        const tenantId = session.tenantId;

        if (!tenantId || tenantId === "system") {
            throw new Error("ID do Provedor não identificado.");
        }

        const tunnelId = typeof options === 'string' ? options : options?.tunnelId;
        const pppoeInt = options?.pppoeInterface || "ether2";
        const hsInt = options?.hotspotInterface || "ether3";
        const hsDns = options?.hotspotDnsName || "wifi.mikrogestor.com";

        let tunnel;
        if (tunnelId) {
            tunnel = await prisma.vpnTunnel.findUnique({
                where: { id: tunnelId, tenantId },
                include: { server: true }
            }) as any;
        } else {
            // Prioritize ROUTER type, fall back to first created
            tunnel = await prisma.vpnTunnel.findFirst({
                where: { tenantId, type: "ROUTER" },
                include: { server: true },
                orderBy: { createdAt: "asc" }
            }) as any || await prisma.vpnTunnel.findFirst({
                where: { tenantId },
                include: { server: true },
                orderBy: { createdAt: "asc" }
            }) as any;
        }



        if (!tunnel) throw new Error("Túnel VPN não encontrado para este provedor.");

        // Fallback: If server relation is missing, fetch manually
        let server = tunnel.server;
        if (!server || !server.publicKey) {

            const fullServer = await prisma.vpnServer.findUnique({
                where: { id: tunnel.serverId }
            });
            if (fullServer) {
                server = fullServer as any;
            }
        }

        if (!server) throw new Error("CRÍTICO: Servidor VPN vinculado não encontrado.");
        if (!server.publicKey) throw new Error("CRÍTICO: Servidor VPN sem Chave Pública configurada.");

        // Mark tunnel as synced when config is downloaded
        if (tunnel.needsSync) {
            await prisma.vpnTunnel.update({
                where: { id: tunnel.id },
                data: {
                    needsSync: false,
                    lastSyncedAt: new Date()
                }
            });

        }



        let privateKey = tunnel.clientPrivateKey;
        // Decryption moved to protocol-specific blocks below to avoid null errors

        // Safety Net: If the endpoint is loopback, try to resolve from APP_URL
        let resolvedEndpoint = server.publicEndpoint;
        const genericEndpoints = ["auto", "127.0.0.1", "localhost", "::1", "0.0.0.0"];
        if (genericEndpoints.includes(resolvedEndpoint)) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
            if (appUrl) {
                try {
                    const url = new URL(appUrl);
                    if (url.hostname && !genericEndpoints.includes(url.hostname)) {
                        resolvedEndpoint = url.hostname;
                    }
                } catch (e) { }
            }
        }
        
        const nas = (await prisma.nas.findFirst({
            where: { tenantId, nasname: tunnel.internalIp }
        }) || await prisma.nas.findFirst({
            where: { tenantId } 
        })) as any;
        
        const radiusSecret = nas ? nas.secret : "mikrogestor";
        const nasVersion = nas?.mikrotikVersion || "v7";
        // --- NEW UNIFIED LOGIC USING GENERATOR ---
        const nasProtocol = nas?.vpnProtocol || tunnel.protocol || "WIREGUARD";

        // Decrypt VPN Password if necessary
        let vpnPass = tunnel.vpnPassword;
        if (vpnPass) {
            try { vpnPass = VpnKeyService.decrypt(vpnPass); } catch (e) { }
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { slug: true }
        });

        const generatorResult = MikrotikScriptGenerator.generate({
            tunnelIp: tunnel.internalIp,
            protocol: nasProtocol as any,
            serverEndpoint: resolvedEndpoint,
            serverPublicKey: server.publicKey,
            serverListenPort: server.listenPort,
            clientPrivateKey: privateKey || undefined,
            radiusSecret: radiusSecret,
            pppoeInterface: pppoeInt,
            hotspotInterface: hsInt,
            hotspotDns: hsDns,
            mikrotikVersion: nasVersion,
            vpnUsername: tunnel.vpnUsername || undefined,
            vpnPassword: vpnPass || undefined,
            ipsecPsk: server.ipsecPsk || undefined,
            tenantSlug: tenant?.slug
        });

        const fullScript = `# ==============================================================================
# MIKROGESTOR UNIFIED CONFIGURATION (${nasVersion})
# PROTOCOL: ${nasProtocol}
# ==============================================================================
# DEVICE: ${tunnel.name}
# VPN IP: ${tunnel.internalIp}
# DATE: ${new Date().toLocaleString('pt-BR')}
# ==============================================================================

${generatorResult.fullScript}

:put "========================================================";
:put "ALL CONFIGURATIONS APPLIED. YOUR MIKROTIK IS NOW LINKED!";
:put "========================================================";
`;

        return {
            part1: generatorResult.part1,
            part2: generatorResult.part2,
            part3: generatorResult.part3,
            part4: generatorResult.part4,
            fullScript,
            nasVersion,
            nasProtocol
        };
    }
);

/**
 * Generates standard WireGuard configuration (.conf format) for PC/Mobile clients.
 */
export const getPcWireGuardConfigAction = protectedAction(
    ["ISP_ADMIN", "SUPER_ADMIN"],
    async (inputTunnelId: string | null, session) => {
        if (!inputTunnelId) {
            throw new Error("ID do Túnel é obrigatório.");
        }

        const tunnel = await prisma.vpnTunnel.findUnique({
            where: { id: inputTunnelId },
            include: { server: true }
        });

        if (!tunnel) {
            throw new Error("Túnel VPN não encontrado.");
        }

        // Security: Ensure the user belongs to the tenant or is SUPER_ADMIN
        if (session.role !== "SUPER_ADMIN" && tunnel.tenantId !== session.tenantId) {
            throw new Error("Acesso negado.");
        }

        let privateKey = tunnel.clientPrivateKey;
        if (privateKey) {
            try {
                privateKey = VpnKeyService.decrypt(privateKey);
            } catch (e) {
                console.warn(`[VPN Export PC: ${tunnel.id}] Private key decryption skipped or failed. Using as-is.`);
            }
        }



        // Safety Net: Fallback from loopback
        let resolvedEndpoint = tunnel.server.publicEndpoint;
        const genericEndpoints = ["auto", "127.0.0.1", "localhost", "::1", "0.0.0.0"];
        if (genericEndpoints.includes(resolvedEndpoint)) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
            if (appUrl) {
                try {
                    const url = new URL(appUrl);
                    if (url.hostname && !genericEndpoints.includes(url.hostname)) {
                        resolvedEndpoint = url.hostname;
                    }
                } catch (e) { }
            }
        }

        const config = `[Interface]
PrivateKey = ${privateKey}
Address = ${tunnel.internalIp}/32
DNS = 1.1.1.1
MTU = 1280

[Peer]
PublicKey = ${tunnel.server.publicKey}
Endpoint = ${resolvedEndpoint}:${tunnel.server.listenPort}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
`;

        return {
            config,
            filename: `${tunnel.name.replace(/\s+/g, "_")}.conf`
        };
    }
);

/**
 * Gets the VPN tunnel status for the current ISP, including sync status.
 */
export const getVpnTunnelStatusAction = protectedAction(
    ["ISP_ADMIN", "SUPER_ADMIN"],
    async (inputTunnelId: string | null, session) => {
        const tenantId = session.tenantId;

        if (!tenantId || tenantId === "system") {
            throw new Error("ID do Provedor não identificado.");
        }

        if (inputTunnelId && inputTunnelId.length > 10) {
            return await prisma.vpnTunnel.findUnique({
                where: { id: inputTunnelId, tenantId },
                select: {
                    id: true,
                    needsSync: true,
                    lastSyncedAt: true,
                    internalIp: true,
                    isActive: true,
                    lastHandshake: true,
                    totalBytesRx: true,
                    totalBytesTx: true,
                    server: {
                        select: {
                            publicEndpoint: true,
                            name: true
                        }
                    }
                }
            });
        }

        const tunnel = await prisma.vpnTunnel.findFirst({
            where: { tenantId, type: "ROUTER" },
            select: {
                id: true,
                needsSync: true,
                lastSyncedAt: true,
                internalIp: true,
                isActive: true,
                lastHandshake: true,
                totalBytesRx: true,
                totalBytesTx: true,
                server: {
                    select: {
                        publicEndpoint: true,
                        name: true
                    }
                }
            },
            orderBy: { createdAt: "asc" }
        }) || await prisma.vpnTunnel.findFirst({
            where: { tenantId },
            select: {
                id: true,
                needsSync: true,
                lastSyncedAt: true,
                internalIp: true,
                isActive: true,
                lastHandshake: true,
                totalBytesRx: true,
                totalBytesTx: true,
                server: {
                    select: {
                        publicEndpoint: true,
                        name: true
                    }
                }
            },
            orderBy: { createdAt: "asc" }
        });

        return tunnel;
    }
);
