
const os = require('os');
const { execSync } = require('child_process');

// CLI flags
const isRaw = process.argv.includes('--raw');

function log(...args) {
    if (!isRaw) console.log(...args);
}

function warn(...args) {
    if (!isRaw) console.warn(...args);
}

function error(...args) {
    console.error(...args);
}

function getLanIp() {
    log("🔍 Detectando IP da rede local...\n");

    // Check if the user explicitly requested the Public WAN Router IP
    if (process.env.VPN_PUBLIC_ENDPOINT === 'public' || process.env.VPN_HOST === 'public') {
        log("🌍 Buscando o IP Público/Externo do Roteador (WAN)...");
        try {
            const publicIp = execSync('curl -s https://api.ipify.org --max-time 10').toString().trim();
            if (publicIp && publicIp.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
                log(`✅ IP Público do Roteador Detectado: ${publicIp}\n`);
                return publicIp;
            }
        } catch (e) {
            warn("⚠️ Falha ao buscar IP Público. Tentando fallback para IP Local...\n");
        }
    }

    const isWindows = process.platform === 'win32';
    const isLinux = process.platform === 'linux';

    try {
        if (isWindows) {
            // PowerShell command for Windows
            const cmd = 'powershell -Command "Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $(Get-NetRoute -DestinationPrefix 0.0.0.0/0 | Select-Object -First 1 -ExpandProperty InterfaceIndex) | Select-Object -ExpandProperty IPAddress"';
            const ip = execSync(cmd).toString().trim();

            if (ip && ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
                log(`✅ PowerShell Detection: ${ip} (Interface com Gateway Padrão)\n`);

                // Additional validation: ensure it's not a virtual interface IP
                if (ip.startsWith('192.168.56.')) {
                    warn(`⚠️  IP ${ip} parece ser do VirtualBox Host-Only. Tentando fallback...\n`);
                } else {
                    return ip;
                }
            }
        } else if (isLinux) {
            // Linux command using ip route (BusyBox compatible - uses awk instead of grep -oP)
            const cmd = "ip route get 1.1.1.1 | awk '{print $7; exit}'";
            const ip = execSync(cmd).toString().trim();

            if (ip && ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
                log(`✅ Linux Detection: ${ip} (Interface com Gateway Padrão)\n`);

                // Skip Docker bridge IPs - be aggressive here
                if (ip.startsWith('172.17.') || ip.startsWith('172.18.') || ip.startsWith('172.19.') || ip.startsWith('10.13.')) {
                    warn(`⚠️  IP ${ip} detectado via rota padrão parece ser uma rede interna Docker (10.13.x ou 172.x). Prosseguindo para varredura de interfaces...\n`);
                } else {
                    return ip;
                }
            }
        }
    } catch (e) {
        error(`❌ ${isWindows ? 'PowerShell' : 'Linux'} detection failed: ` + e.message);
        log("Tentando método alternativo...\n");
    }

    // Use APP_URL as a hint for the subnet
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const ipHint = appUrl.match(/(\d{1,3}\.\d{1,3}\.\d{1,3})\./)?.[1];

    log("📋 Interfaces de rede detectadas:");
    let bestIp = null;
    let bestScore = -1;

    for (const name of Object.keys(interfaces)) {
        // Check if interface name contains virtual keywords
        const isVirtual = virtualInterfaceBlacklist.some(keyword => name.includes(keyword));

        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                const isVirtualIp = virtualIpRanges.some(range => iface.address.startsWith(range));
                const isPriority = name.toLowerCase().includes('wi-fi') ||
                    name.toLowerCase().includes('ethernet') ||
                    name.toLowerCase().includes('eth0') ||
                    name.toLowerCase().includes('wlan0');

                // Check if this IP matches the subnet hint from APP_URL
                const matchesHint = ipHint && iface.address.startsWith(ipHint);

                log(`  - ${name}: ${iface.address}${isVirtual ? ' [VIRTUAL]' : ''}${isVirtualIp ? ' [IP VIRTUAL]' : ''}${isPriority ? ' [PRIORITÁRIO]' : ''}${matchesHint ? ' [HINT MATCH]' : ''}`);

                // Skip virtual interfaces UNLESS it matches our specific subnet hint (emergency override)
                if ((isVirtual || isVirtualIp) && !matchesHint) continue;

                // Score calculation: prioritize Wi-Fi/Ethernet, then private IPs
                let score = 0;
                if (isPriority) score += 10;
                if (matchesHint) score += 50; // High priority for the subnet the user actually uses
                if (iface.address.startsWith('192.168.')) score += 5;
                if (iface.address.startsWith('10.')) score += 3;

                if (score > bestScore) {
                    bestScore = score;
                    bestIp = iface.address;
                }
            }
        }
    }

    log("");
    if (bestIp) {
        log(`✅ Melhor IP detectado: ${bestIp} (Score: ${bestScore})\n`);
        return bestIp;
    }

    // Hint fallback only if no best IP found via Scoring
    if (ipHint) {
        const fullHint = appUrl.match(/https?:\/\/([^\/:]+)/)?.[1];
        if (fullHint && fullHint.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
            log(`⚠️  Nenhum IP local encontrado, usando HINT de App URL como fallback: ${fullHint}\n`);
            return fullHint;
        }
    }

    return null;
}

async function main() {
    if (isRaw) {
        const ip = getLanIp();
        if (ip) console.log(ip);
        process.exit(ip ? 0 : 1);
    }

    log("🔍 Auto-Detecting Host LAN IP...");

    const ip = getLanIp();

    if (!ip) {
        error("❌ Could not detect a valid LAN IP (192.168.x.x or 10.x.x.x).");
        process.exit(1);
    }

    log(`✅ Detected Host IP: ${ip}`);

    log("🚀 Updating Container DB...");

    // We reuse the internal update script, passing the IP as an env var or arg if we modify it.
    // For now, we'll use a direct DB update approach.
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    try {
        // Update specific server if ID provided, otherwise first active
        const serverId = process.env.VPN_SERVER_ID;
        let server;

        if (serverId) {
            log(`🎯 Target Server ID from Env: ${serverId}`);
            server = await prisma.vpnServer.findUnique({
                where: { id: serverId }
            });
        } else {
            server = await prisma.vpnServer.findFirst({
                where: { isActive: true },
                orderBy: { createdAt: 'asc' }
            });
        }

        if (!server) {
            console.error("❌ No active VPN server found in database.");
            process.exit(1);
        }

        const newEndpoint = `${ip}:51820`;

        await prisma.vpnServer.update({
            where: { id: server.id },
            data: { publicEndpoint: newEndpoint }
        });

        log(`✅ Updated VPN Server "${server.name}" endpoint to: ${newEndpoint}`);
        log("✅ IP Auto-Update Complete!");
    } catch (err) {
        error("❌ Database update failed:", err.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
