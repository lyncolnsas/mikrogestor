"use server";

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface PingResult {
    target: string;
    success: boolean;
    latency?: number;
    error?: string;
}

export interface TracerouteHop {
    hop: number;
    ip: string;
    latency?: string;
}

export interface NetworkInfo {
    internalIp: string;
    externalIp?: string;
    gateway: string;
    dnsServers: string[];
    networkMode: string;
    routes: string[];
}

export interface NetworkDiagnostics {
    timestamp: string;
    containerName: string;
    networkInfo: NetworkInfo;
    pingResults: PingResult[];
    traceroute?: TracerouteHop[];
}

/**
 * Executa diagnóstico completo de rede (roda dentro do container)
 */
export async function runVpnNetworkDiagnosticsAction(): Promise<{
    data?: NetworkDiagnostics;
    error?: string;
}> {
    try {
        // 1. Obter informações de rede
        const networkInfo = await getContainerNetworkInfo();

        // 2. Testes de ping
        const targets = [
            { name: "Google DNS", ip: "8.8.8.8" },
            { name: "Cloudflare DNS", ip: "1.1.1.1" },
            { name: "Gateway", ip: networkInfo.gateway },
            { name: "OpenDNS", ip: "208.67.222.222" },
        ];

        const pingResults: PingResult[] = [];

        for (const target of targets) {
            try {
                const { stdout } = await execAsync(
                    `ping -c 3 -W 2 ${target.ip}`
                );

                const latencyMatch = stdout.match(/time=([\d.]+)\s*ms/);
                const latency = latencyMatch ? parseFloat(latencyMatch[1]) : undefined;

                pingResults.push({
                    target: `${target.name} (${target.ip})`,
                    success: true,
                    latency,
                });
            } catch (error: any) {
                pingResults.push({
                    target: `${target.name} (${target.ip})`,
                    success: false,
                    error: "Timeout ou host inacessível",
                });
            }
        }

        // 3. Traceroute para 8.8.8.8
        const traceroute = await getTraceroute("8.8.8.8");

        return {
            data: {
                timestamp: new Date().toISOString(),
                containerName: "mikrogestor-app",
                networkInfo,
                pingResults,
                traceroute,
            },
        };
    } catch (error: any) {
        console.error("[runVpnNetworkDiagnosticsAction] Error:", error);
        return {
            error: error.message || "Erro ao executar diagnóstico de rede",
        };
    }
}

/**
 * Obtém informações de rede (executa comandos localmente)
 */
async function getContainerNetworkInfo(): Promise<NetworkInfo> {
    try {
        // IP interno
        const { stdout: ipOutput } = await execAsync("hostname -i");
        const internalIp = ipOutput.trim().split(" ")[0];

        // Gateway e rotas
        const { stdout: routeOutput } = await execAsync("ip route show");
        const gatewayMatch = routeOutput.match(/default via ([\d.]+)/);
        const gateway = gatewayMatch ? gatewayMatch[1] : "N/A";

        const routes = routeOutput
            .split("\n")
            .filter((line) => line.trim())
            .slice(0, 5);

        // DNS
        const { stdout: dnsOutput } = await execAsync("cat /etc/resolv.conf")
            .catch(() => ({ stdout: "" }));

        const dnsServers = dnsOutput
            .split("\n")
            .filter((line) => line.startsWith("nameserver"))
            .map((line) => line.replace("nameserver", "").trim());

        // IP externo
        const { stdout: externalIpOutput } = await execAsync(
            'sh -c "curl -s --max-time 3 ifconfig.me || echo N/A"'
        ).catch(() => ({ stdout: "N/A" }));
        const externalIp = externalIpOutput.trim();

        // Modo de rede (bridge/host)
        const networkMode = internalIp.startsWith("172.") ? "bridge" : "host";

        return {
            internalIp,
            externalIp: externalIp !== "N/A" ? externalIp : undefined,
            gateway,
            dnsServers,
            networkMode,
            routes,
        };
    } catch (error: any) {
        console.error("[getContainerNetworkInfo] Error:", error);
        return {
            internalIp: "N/A",
            gateway: "N/A",
            dnsServers: [],
            networkMode: "unknown",
            routes: [],
        };
    }
}

/**
 * Executa traceroute (localmente)
 */
async function getTraceroute(destination: string): Promise<TracerouteHop[]> {
    try {
        const { stdout } = await execAsync(
            `traceroute -m 10 -w 2 ${destination}`,
            { timeout: 15000 }
        );

        const hops: TracerouteHop[] = [];
        const lines = stdout.split("\n").slice(1);

        for (const line of lines) {
            if (!line.trim()) continue;

            const match = line.match(/^\s*(\d+)\s+([\d.]+|\*)\s+([\d.]+\s*ms)?/);
            if (match) {
                hops.push({
                    hop: parseInt(match[1]),
                    ip: match[2] === "*" ? "* * *" : match[2],
                    latency: match[3]?.trim(),
                });
            }
        }

        return hops.slice(0, 10);
    } catch (error: any) {
        console.error("[getTraceroute] Error:", error);
        return [];
    }
}
