export type VpnProtocol = "WIREGUARD" | "L2TP" | "SSTP";

interface ScriptOptions {
    tunnelIp: string;
    protocol: VpnProtocol;
    serverEndpoint: string;
    serverPublicKey?: string;
    serverListenPort?: number;
    clientPrivateKey?: string;
    radiusSecret: string;
    pppoeInterface: string;
    hotspotInterface: string;
    hotspotDns: string;
    mikrotikVersion: string;
    vpnUsername?: string;
    vpnPassword?: string;
    ipsecPsk?: string;
    tenantSlug?: string;
    walledGarden?: string[];
}

export class MikrotikScriptGenerator {
    static generate(options: ScriptOptions) {
        if (options.protocol === "WIREGUARD") {
            return this.generateWireGuard(options);
        } else {
            return this.generateLegacy(options);
        }
    }

    private static generateWireGuard(opt: ScriptOptions) {
        const nasVersion = opt.mikrotikVersion || "v7";
        
        const part1 = `{
    # [PART 1] INTERFACE CONFIGURATION (WIREGUARD - ${nasVersion})
    :put "Starting Part 1...";
    :if ([/interface wireguard find name="wg-mikrogestor"] = "") do={
        /interface wireguard add name="wg-mikrogestor" private-key="${opt.clientPrivateKey}" listen-port=13231 comment="MikroGestor VPN";
    } else={
        /interface wireguard set [find name="wg-mikrogestor"] private-key="${opt.clientPrivateKey}";
    }
    /ip address remove [find interface="wg-mikrogestor"];
    /ip address add address="${opt.tunnelIp}/24" interface="wg-mikrogestor" network="10.255.0.0";
    :put "Part 1 Completed Successfully.";
}`;

        const part2 = `{
    # [PART 2] PEER & ROUTING
    :put "Starting Part 2...";
    /interface wireguard peers remove [find interface="wg-mikrogestor"];
    /interface wireguard peers add \\
        interface="wg-mikrogestor" \\
        public-key="${opt.serverPublicKey}" \\
        endpoint-address="${opt.serverEndpoint}" \\
        endpoint-port=${opt.serverListenPort} \\
        allowed-address=0.0.0.0/0 \\
        persistent-keepalive=25s \\
        comment="MikroGestor Server";

    :if ([/ip route find dst-address="10.255.0.0/16" gateway="wg-mikrogestor"] = "") do={
        /ip route add dst-address="10.255.0.0/16" gateway="wg-mikrogestor" comment="MikroGestor VPN Route";
    }
    :put "CONFIGURATION APPLIED. Waiting for handshake...";
}`;

        const part3 = this.generateRadiusPppoe(opt);
        const part4 = this.generateHotspot(opt);

        return {
            part1, part2, part3, part4,
            fullScript: `${part1}\n\n${part2}\n\n${part3}\n\n${part4}`
        };
    }

    private static generateLegacy(opt: ScriptOptions) {
        const interfaceName = opt.protocol.toLowerCase() + "-mikrogestor";
        
        const part1 = `{
    # [PART 1] ${opt.protocol} INTERFACE
    :put "Starting Part 1 (${opt.protocol})...";
    :if ([/interface ${opt.protocol.toLowerCase()}-client find name="${interfaceName}"] = "") do={
        /interface ${opt.protocol.toLowerCase()}-client add \\
            name="${interfaceName}" \\
            connect-to="${opt.serverEndpoint}" \\
            user="${opt.vpnUsername}" \\
            password="${opt.vpnPassword}" \\
            use-ipsec=yes \\
            ipsec-secret="${opt.ipsecPsk}" \\
            disabled=no \\
            comment="MikroGestor VPN";
    } else={
        /interface ${opt.protocol.toLowerCase()}-client set [find name="${interfaceName}"] \\
            connect-to="${opt.serverEndpoint}" \\
            user="${opt.vpnUsername}" \\
            password="${opt.vpnPassword}" \\
            use-ipsec=yes \\
            ipsec-secret="${opt.ipsecPsk}";
    }
    /ip address remove [find interface="${interfaceName}"];
    /ip address add address="${opt.tunnelIp}/24" interface="${interfaceName}" network="10.255.0.0";
}`;

        const part2 = `{
    # [PART 2] ROUTING
    :if ([/ip route find dst-address="10.255.0.0/16" gateway="${interfaceName}"] = "") do={
        /ip route add dst-address="10.255.0.0/16" gateway="${interfaceName}" comment="MikroGestor VPN Route";
    }
}`;

        const part3 = this.generateRadiusPppoe(opt);
        const part4 = this.generateHotspot(opt);

        return {
            part1, part2, part3, part4,
            fullScript: `${part1}\n\n${part2}\n\n${part3}\n\n${part4}`
        };
    }

    private static generateRadiusPppoe(opt: ScriptOptions) {
        return `{
    # [PART 3] RADIUS & PPPOE
    :put "Configuring Radius Client...";
    /radius add address=10.255.0.1 secret="${opt.radiusSecret}" service=ppp,hotspot timeout=2s comment="Mikrogestor SaaS";
    /radius incoming set accept=yes port=3799;
    
    :put "Creating PPPoE Profiles...";
    :if ([/ppp profile find name="mikrogestor-profile"] = "") do={
        /ppp profile add name="mikrogestor-profile" use-radius=yes local-address=10.255.0.1 dns-server=8.8.8.8,1.1.1.1;
    }

    :put "Enabling PPPoE Server on ${opt.pppoeInterface}...";
    :if ([/interface pppoe-server server find interface="${opt.pppoeInterface}"] = "") do={
        /interface pppoe-server server add interface="${opt.pppoeInterface}" service-name="pppoe-mikrogestor" default-profile="mikrogestor-profile" authentication=pap,chap,mschap2 disabled=no;
    }

    # Advanced: Blocked Users Redirection
    :put "Configuring Blocking Firewall Rules...";
    :if ([/ip firewall nat find comment="SaaS: Redirecionamento Web Bloqueio"] = "") do={
        /ip firewall nat add chain=dstnat src-address-list="BLOCKED_USERS" protocol=tcp dst-port=80 action=redirect to-ports=8080 comment="SaaS: Redirecionamento Web Bloqueio";
    }
    :if ([/ip firewall nat find comment="SaaS: Redirecionamento SSL Bloqueio"] = "") do={
        /ip firewall nat add chain=dstnat src-address-list="BLOCKED_USERS" protocol=tcp dst-port=443 action=redirect to-ports=8443 comment="SaaS: Redirecionamento SSL Bloqueio";
    }
}`;
    }

    private static generateHotspot(opt: ScriptOptions) {
        const portalUrl = `http://${opt.tenantSlug}.wifi.mikrogestor.com/hotspot`; 
        
        return `{
    # [PART 4] ADVANCED HOTSPOT & WALLED GARDEN
    :put "Configuring Hotspot Profile with Radius...";
    /ip hotspot profile add name="hsp_mikrogestor" \\
        dns-name="${opt.hotspotDns}" \\
        use-radius=yes \\
        radius-interim-update=5m \\
        login-by=http-pap,http-chap,cookie;

    :put "Adding Walled Garden Rules (SaaS Access)...";
    /ip hotspot walled-garden add dst-host="*mikrogestor.com" comment="SaaS Main Access";
    /ip hotspot walled-garden add dst-host="*.gstatic.com" comment="Google Assets";
    /ip hotspot walled-garden add dst-host="*.googleapis.com" comment="Google APIs";
    /ip hotspot walled-garden add dst-host="*.google.com" comment="Google Main";
    /ip hotspot walled-garden add dst-host="*.cloudflare.com" comment="Cloudflare CDN";
    /ip hotspot walled-garden add dst-host="*.unpkg.com" comment="UNPKG Assets";
    /ip hotspot walled-garden add dst-host="*.bootstrapcdn.com" comment="Bootstrap CDN";
    /ip hotspot walled-garden add dst-host="*.fbcdn.net" comment="Facebook Images (for share buttons)";

    ${opt.walledGarden?.map(host => `:do { /ip hotspot walled-garden add dst-host="${host}" comment="Custom Rule" } on-error={ :put "Error adding ${host}" };`).join('\n    ') || ""}

    :put "Creating Hotspot Server on ${opt.hotspotInterface}...";
    /ip hotspot add interface="${opt.hotspotInterface}" name="hs_mikrogestor" profile="hsp_mikrogestor" disabled=no;

    :put "Configuring Automated Captive Portal Redirect...";
    # This creates a login.html that redirects to our external SaaS portal
    :if ([/file find name="flash"] != "") do={
        /file make-directory name=flash/hotspot;
        /file print file=flash/hotspot/login.html;
        /file set flash/hotspot/login.html contents="<html><head><meta http-equiv=\\"refresh\\" content=\\"0;url=${portalUrl}?mac=\$(mac)&ip=\$(ip)\\" /></head><body>Redirecionando...</body></html>";
        /ip hotspot profile set [find name="hspot_mikrogestor"] html-directory=flash/hotspot;
    } else={
        :if ([/file find name="hotspot"] = "") do={ /file make-directory name=hotspot; }
        /file print file=hotspot/login.html;
        /file set hotspot/login.html contents="<html><head><meta http-equiv=\\"refresh\\" content=\\"0;url=${portalUrl}?mac=\$(mac)&ip=\$(ip)\\" /></head><body>Redirecionando...</body></html>";
        /ip hotspot profile set [find name="hspot_mikrogestor"] html-directory=hotspot;
    }
}`;
    }
}
