"use server"

import { protectedAction } from "@/lib/api/action-wrapper";
import { prisma } from "@/lib/prisma";
import { VpnKeyService } from "../vpn-key.service";

/**
 * Generates the MikroTik ROS7 commands to configure the WireGuard interface.
 */
export const getMikrotikVpnConfigAction = protectedAction(
    ["ISP_ADMIN", "SUPER_ADMIN"],
    async (inputTenantId: string | null, session) => {
        // Se for ISP_ADMIN ou se o input for nulo, usa o ID da sessão
        const tenantId = inputTenantId || session.tenantId;

        if (!tenantId || tenantId === "system") {
            throw new Error("ID do Provedor não identificado.");
        }

        // Prioritize ROUTER type, fall back to first created
        const tunnel = await prisma.vpnTunnel.findFirst({
            where: { tenantId, type: "ROUTER" },
            include: { server: true },
            orderBy: { createdAt: "asc" }
        }) || await prisma.vpnTunnel.findFirst({
            where: { tenantId },
            include: { server: true },
            orderBy: { createdAt: "asc" }
        });



        if (tunnel) {
        }

        if (!tunnel) throw new Error("Túnel VPN não encontrado para este provedor.");

        // Fallback: If server relation is missing, fetch manually
        let server = tunnel.server;
        if (!server || !server.publicKey) {

            const fullServer = await prisma.vpnServer.findUnique({
                where: { id: tunnel.serverId }
            });
            if (fullServer) {
                server = fullServer;
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



        // Ensure private key is decrypted for the script
        let privateKey = tunnel.clientPrivateKey;
        try {
            privateKey = VpnKeyService.decrypt(privateKey);
        } catch (e) {
            console.warn(`[VPN Export] Private key for tunnel ${tunnel.id} seems already decrypted or has invalid format.`);
        }

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

        const part1 = `{
    # [PART 1] INTERFACE CONFIGURATION
    # --------------------------------------------------------
    :put "Starting Part 1...";
 
    # 1. Interface
    :if ([/interface wireguard find name="wg-mikrogestor"] = "") do={
        :put "Creating interface wg-mikrogestor...";
        /interface wireguard add name="wg-mikrogestor" private-key="${privateKey}" listen-port=13231 comment="MikroGestor VPN";
    } else={
        :put "Interface exists. Updating key...";
        /interface wireguard set [find name="wg-mikrogestor"] private-key="${privateKey}";
    }

    # 2. IP Address
    /ip address remove [find interface="wg-mikrogestor"];
    /ip address add address="${tunnel.internalIp}/24" interface="wg-mikrogestor" network="10.255.0.0";
    
    :put "Part 1 Completed Successfully.";
}`;

        const part2 = `{
    # [PART 2] PEER & ROUTING CONFIGURATION
    # --------------------------------------------------------
    :put "Starting Part 2...";

    # 1. Validations
    :if ([/interface wireguard find name="wg-mikrogestor"] = "") do={
        :put "[ERROR] Interface wg-mikrogestor NOT FOUND. Run Part 1 first.";
    } else={
        # 2. Add Peer (Server)
        :put "Removing old peers...";
        /interface wireguard peers remove [find interface="wg-mikrogestor"];
        
        :put "Adding VPN Server Peer...";
        :put "  - Endpoint: ${resolvedEndpoint}:${server.listenPort}";
        :put "  - PublicKey: ${server.publicKey}";
        
        /interface wireguard peers add \\
            interface="wg-mikrogestor" \\
            public-key="${server.publicKey}" \\
            endpoint-address="${resolvedEndpoint}" \\
            endpoint-port=${server.listenPort} \\
            allowed-address=0.0.0.0/0 \\
            persistent-keepalive=25s \\
            comment="MikroGestor Server";

        # 3. Routing
        :if ([/ip route find dst-address="10.255.0.0/16" gateway="wg-mikrogestor"] = "") do={
            :put "Adding route to 10.255.0.0/16...";
            /ip route add dst-address="10.255.0.0/16" gateway="wg-mikrogestor" comment="MikroGestor VPN Route";
        } else={
            :put "Route already exists.";
        }
        
        # 4. Diagnostics
        :put "------------------------------------------------";
        :put "CONFIGURATION APPLIED.";
        :put "Waiting 5s for handshake...";
        :delay 5s;
        
        :local pId [/interface wireguard peers find interface="wg-mikrogestor"];
        :if ($pId != "") do={
            :local lastHs [/interface wireguard peers get $pId last-handshake];
            :put "Last Handshake: $lastHs";
            :if ($lastHs = 0s) do={
                :put "[WARNING] Handshake failed (0s). Check Firewall/Endpoint.";
            } else={
                :put "[SUCCESS] Tunnel is UP!";
            }
        }
    }
}`;

        const fullScript = `# ==============================================================================
# MIKROGESTOR VPN CONFIGURATION (ROUTEROS V7)
# ==============================================================================
# VALUES ARE HARDCODED FOR SAFETY.
# ==============================================================================

# PART 1: INTERFACE
${part1}

# PART 2: PEER & ROUTING
${part2}
`;

        return {
            part1,
            part2,
            fullScript
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
        try {
            privateKey = VpnKeyService.decrypt(privateKey);
        } catch (e) {
            console.warn(`[VPN Export PC: ${tunnel.id}] Private key decryption skipped or failed. Using as-is.`);
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
    async (inputTenantId: string | null, session) => {
        const tenantId = inputTenantId || session.tenantId;

        if (!tenantId || tenantId === "system") {
            throw new Error("ID do Provedor não identificado.");
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
