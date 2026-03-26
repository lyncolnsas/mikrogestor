"use server"

import { protectedAction } from "@/lib/api/action-wrapper";
import { prisma } from "@/lib/prisma";
import { VpnKeyService } from "../vpn-key.service";

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
        
        // Fetch NAS for radius secret, matching the tunnel internal IP
        const nas = await prisma.nas.findFirst({
            where: { tenantId, nasname: tunnel.internalIp }
        }) || await prisma.nas.findFirst({
            where: { tenantId } // fallback to first for legacy support
        });
        const radiusSecret = nas ? nas.secret : "mikrogestor";

        // Logic for different protocols
        if (tunnel.protocol === "L2TP" || tunnel.protocol === "SSTP") {
            // Decrypt VPN Password
            let vpnPass = tunnel.vpnPassword;
            if (vpnPass) {
                try {
                    vpnPass = VpnKeyService.decrypt(vpnPass);
                } catch (e) { }
            }

            const psk = server.ipsecPsk || "mikrogestor-psk";
            const interfaceName = tunnel.protocol === "L2TP" ? "l2tp-mikrogestor" : "sstp-mikrogestor";

            const part1 = `{
    # [PART 1] ${tunnel.protocol} INTERFACE CONFIGURATION (LEGACY)
    # --------------------------------------------------------
    :put "Starting Part 1 (${tunnel.protocol})...";
 
    # 1. Interface
    :if ([/interface ${tunnel.protocol.toLowerCase()}-client find name="${interfaceName}"] = "") do={
        :put "Creating interface ${interfaceName}...";
        /interface ${tunnel.protocol.toLowerCase()}-client add \\
            name="${interfaceName}" \\
            connect-to="${resolvedEndpoint}" \\
            user="${tunnel.vpnUsername}" \\
            password="${vpnPass}" \\
            use-ipsec=yes \\
            ipsec-secret="${psk}" \\
            disabled=no \\
            comment="MikroGestor VPN";
    } else={
        :put "Interface exists. Updating credentials...";
        /interface ${tunnel.protocol.toLowerCase()}-client set [find name="${interfaceName}"] \\
            connect-to="${resolvedEndpoint}" \\
            user="${tunnel.vpnUsername}" \\
            password="${vpnPass}" \\
            use-ipsec=yes \\
            ipsec-secret="${psk}";
    }

    # 2. IP Address
    /ip address remove [find interface="${interfaceName}"];
    /ip address add address="${tunnel.internalIp}/24" interface="${interfaceName}" network="10.255.0.0";
    
    :put "Part 1 Completed Successfully.";
}`;

            const part2 = `{
    # [PART 2] ROUTING CONFIGURATION
    # --------------------------------------------------------
    :put "Starting Part 2...";

    # 1. Routing
    :if ([/ip route find dst-address="10.255.0.0/16" gateway="${interfaceName}"] = "") do={
        :put "Adding route to 10.255.0.0/16...";
        /ip route add dst-address="10.255.0.0/16" gateway="${interfaceName}" comment="MikroGestor VPN Route";
    } else={
        :put "Route already exists.";
    }
    
    :put "------------------------------------------------";
    :put "CONFIGURATION APPLIED.";
    :put "[SUCCESS] Tunnel ${tunnel.protocol} is ready.";
}`;

            // Part 3 and 4 are generic for the management network
            const part3 = `{
    # [PART 3] RADIUS & PPPOE SERVER CONFIGURATION
    # --------------------------------------------------------
    :put "Starting Part 3 (Radius & PPPoE)...";

    # 1. Radius Client
    :if ([/radius find address="10.255.0.1"] = "") do={
        :put "Adding Radius Client...";
        /radius add address=10.255.0.1 secret="${radiusSecret}" service=ppp,hotspot timeout=3000ms authentication-port=1812 accounting-port=1813 comment="Mikrogestor SaaS";
    } else={
        :put "Updating Radius Client...";
        /radius set [find address="10.255.0.1"] secret="${radiusSecret}" service=ppp,hotspot;
    }

    # 2. Enable Incoming (CoA)
    :put "Enabling Radius Incoming (CoA port 3799)...";
    /radius incoming set accept=yes port=3799;

    # 3. Create PPPoE Profile
    :if ([/ppp profile find name="mikrogestor-profile"] = "") do={
        /ppp profile add name="mikrogestor-profile" use-radius=yes local-address=10.255.0.1 comment="Mikrogestor Profile";
    }

    # 4. Create PPPoE Server
    :if ([/interface pppoe-server server find interface="${pppoeInt}"] = "") do={
        :put "Creating PPPoE Server on ${pppoeInt}...";
        /interface pppoe-server server add interface="${pppoeInt}" service-name="mikrogestor-service" default-profile="mikrogestor-profile" authentication=pap,chap,mschap1,mschap2 disabled=no;
    }

    :put "Part 3 Completed.";
}`;

            const part4 = `{
    # [PART 4] HOTSPOT CONFIGURATION
    # --------------------------------------------------------
    :put "Starting Part 4 (Hotspot)...";

    # 1. Walled Garden
    /ip hotspot walled-garden add dst-host="${resolvedEndpoint}" comment="Mikrogestor API Access";
    /ip hotspot walled-garden add dst-host="*.mikrogestor.com" comment="Mikrogestor Domains";

    # 2. Hotspot Profile
    :if ([/ip hotspot profile find name="mikrogestor-hsprote"] = "") do={
        /ip hotspot profile add name="mikrogestor-hsprote" hotspot-address=10.255.0.1 dns-name="${hsDns}" login-by=http-chap,http-pap use-radius=yes radius-interim-update=5m;
    }

    # 3. Hotspot Server
    :if ([/ip hotspot find interface="${hsInt}"] = "") do={
        /ip hotspot add interface="${hsInt}" name="mikrogestor-hotspot" profile="mikrogestor-hsprote" disabled=no;
    }

    :put "Part 4 Completed Successfully.";
}`;

            return {
                part1,
                part2,
                part3,
                part4,
                fullScript: `${part1}\n\n${part2}\n\n${part3}\n\n${part4}`
            };
        }

        // --- WIRE GUARD LOGIC (Original) ---
        // Ensure private key is decrypted for the script
        if (privateKey) {
            try {
                privateKey = VpnKeyService.decrypt(privateKey);
            } catch (e) {
                console.warn(`[VPN Export] Private key for tunnel ${tunnel.id} seems already decrypted or has invalid format.`);
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

        const part3 = `{
    # [PART 3] RADIUS & PPPOE SERVER CONFIGURATION
    # --------------------------------------------------------
    :put "Starting Part 3 (Radius & PPPoE)...";

    # 1. Radius Client
    :if ([/radius find address="10.255.0.1"] = "") do={
        :put "Adding Radius Client...";
        /radius add address=10.255.0.1 secret="${radiusSecret}" service=ppp,hotspot timeout=3000ms authentication-port=1812 accounting-port=1813 comment="Mikrogestor SaaS";
    } else={
        :put "Updating Radius Client...";
        /radius set [find address="10.255.0.1"] secret="${radiusSecret}" service=ppp,hotspot;
    }

    # 2. Enable Incoming (CoA)
    :put "Enabling Radius Incoming (CoA port 3799)...";
    /radius incoming set accept=yes port=3799;

    # 3. Create PPPoE Profile
    :if ([/ppp profile find name="mikrogestor-profile"] = "") do={
        :put "Creating PPPoE Profile...";
        /ppp profile add name="mikrogestor-profile" use-radius=yes local-address=10.0.0.1 dns-server=8.8.8.8,1.1.1.1 comment="Mikrogestor Auto-Config";
    }

    # 4. PPPoE Server
    :if ([/interface pppoe-server server find service-name="pppoe-mikrogestor"] = "") do={
        :put "Adding PPPoE Server on ${pppoeInt}...";
        /interface pppoe-server server add service-name="pppoe-mikrogestor" interface="${pppoeInt}" default-profile=mikrogestor-profile authentication=pap,chap,mschap2 disabled=no;
    }

    # 5. Blocking Address-List / Firewall Rules
    :put "Configuring blocked users redirection...";
    :if ([/ip firewall nat find comment="SaaS: Redirecionamento Web Bloqueio"] = "") do={
        /ip firewall nat add chain=dstnat src-address-list="BLOCKED_USERS" protocol=tcp dst-port=80 action=redirect to-ports=8080 comment="SaaS: Redirecionamento Web Bloqueio";
    }
    :if ([/ip firewall nat find comment="SaaS: Redirecionamento SSL Bloqueio"] = "") do={
        /ip firewall nat add chain=dstnat src-address-list="BLOCKED_USERS" protocol=tcp dst-port=443 action=redirect to-ports=8443 comment="SaaS: Redirecionamento SSL Bloqueio";
    }

    :put "Part 3 Completed Successfully.";
}`;

        const part4 = `{
    # [PART 4] HOTSPOT CONFIGURATION
    # --------------------------------------------------------
    :put "Starting Part 4 (Hotspot)...";
    
    :local hsInt "${hsInt}";
    :local hsDns "${hsDns}";
    :local appUrl "${process.env.NEXT_PUBLIC_APP_URL || "http://mikrogestor.com"}";
    
    # 1. Walled Garden for Portal
    :local portalHost [:pick $appUrl ([:find $appUrl "://" 0] + 3) [:len $appUrl]];
    :if ([:find $portalHost "/" 0] > 0) do={ :set portalHost [:pick $portalHost 0 [:find $portalHost "/" 0]] };
    
    :if ([/ip hotspot walled-garden find dst-host=$portalHost] = "") do={
        /ip hotspot walled-garden add dst-host=$portalHost action=allow comment="Mikrogestor Portal";
    }

    # 2. Hotspot Profile
    :if ([/ip hotspot profile find name="hsp_mikrogestor"] = "") do={
        /ip hotspot profile add name="hsp_mikrogestor" dns-name=$hsDns login-by=http-chap,https,http-pap,mac-cookie use-radius=yes radius-interim-update=00:05:00 split-user-domain=yes;
    }

    # 3. Hotspot Server
    :if ([/ip hotspot find name="hs_mikrogestor"] = "") do={
        :put "Adding Hotspot on $hsInt...";
        /ip hotspot add name="hs_mikrogestor" interface=$hsInt profile="hsp_mikrogestor" disabled=no address-pool=none;
    }

    :put "Part 4 Completed Successfully.";
}`;

        const fullScript = `# ==============================================================================
# MIKROGESTOR UNIFIED CONFIGURATION (ROUTEROS V7)
# ==============================================================================
# DEVICE: ${tunnel.name}
# VPN IP: ${tunnel.internalIp}
# DATE: ${new Date().toLocaleString('pt-BR')}
# ==============================================================================

# PART 1: VPN INTERFACE
${part1}

# PART 2: VPN PEER & ROUTING
${part2}

# PART 3: RADIUS & PPPOE
${part3}

# PART 4: HOTSPOT
${part4}

:put "========================================================";
:put "ALL CONFIGURATIONS APPLIED. YOUR MIKROTIK IS NOW LINKED!";
:put "========================================================";
`;

        return {
            part1,
            part2,
            part3,
            part4,
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
