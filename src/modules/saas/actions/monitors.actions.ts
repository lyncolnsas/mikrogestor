
"use server";

import { prisma } from "@/lib/prisma";
import { protectedAction } from "@/lib/api/action-wrapper";

export type ServiceStatusData = {
    whatsapp: { status: "ONLINE" | "OFFLINE"; uptime: string; latency: string };
    radius: { status: "ONLINE" | "OFFLINE"; uptime: string; latency: string; activeSessions: number };
    database: { status: "ONLINE" | "OFFLINE"; uptime: string; latency: string };
    vpn: { status: "ONLINE" | "OFFLINE"; uptime: string; latency: string; connectedPeers: number; lastSync: Date | null };
};

export const getServiceStatus = protectedAction(
    ["SUPER_ADMIN", "ISP_ADMIN"],
    async () => {
        const start = Date.now();
        
        // Default structure to ensure no undefined property access in frontend
        const result: ServiceStatusData = {
            whatsapp: { status: "ONLINE", uptime: "99.9%", latency: "120ms" },
            radius: { status: "ONLINE", uptime: "100%", latency: "15ms", activeSessions: 0 },
            database: { status: "ONLINE", uptime: "99.95%", latency: "0ms" },
            vpn: { status: "ONLINE", uptime: "99.9%", latency: "0s ago", connectedPeers: 0, lastSync: null }
        };

        // 1. Database Check (Simple Ping)
        let dbLatency = 0;
        try {
            await prisma.$queryRaw`SELECT 1`;
            dbLatency = Date.now() - start;
            result.database.latency = `${dbLatency}ms`;
        } catch (e) {
            console.error("DB Health Check Failed", e);
            result.database.status = "OFFLINE";
            result.database.latency = "ERR";
            // If DB is offline, we can't reliably fetch other stats, return early with defaults
            return result;
        }

        // 2. VPN Stats
        try {
            const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
            const activeTunnels = await prisma.vpnTunnel.count({
                where: { lastHandshake: { gte: twoMinutesAgo } }
            });

            const vpnServer = await prisma.vpnServer.findFirst({
                orderBy: { updatedAt: 'desc' }
            });

            const vpnLatency = vpnServer ? Math.abs(Date.now() - vpnServer.updatedAt.getTime()) : 0;
            const isVpnOnline = vpnLatency < 5 * 60 * 1000;

            result.vpn = {
                status: isVpnOnline ? "ONLINE" : "OFFLINE",
                uptime: "99.9%",
                latency: `${Math.round(vpnLatency / 1000)}s ago`,
                connectedPeers: activeTunnels,
                lastSync: vpnServer?.updatedAt || null
            };
        } catch (e) {
            console.warn("VPN Stats Failed", e);
            result.vpn.status = "OFFLINE";
        }

        // 3. Radius Stats
        try {
            const activeRadius = await prisma.radAcct.count({
                where: { acctstoptime: null }
            });
            result.radius.activeSessions = activeRadius;
        } catch (e) {
            console.warn("Radius Stats Failed", e);
            result.radius.status = "OFFLINE";
        }

        return result;
    }
);

export const getConnectedVpnPeers = protectedAction(
    ["SUPER_ADMIN"],
    async () => {
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        return await prisma.vpnTunnel.findMany({
            where: {
                lastHandshake: { gte: twoMinutesAgo }
            },
            include: {
                tenant: { select: { slug: true, name: true } }
            },
            orderBy: { lastHandshake: 'desc' },
            take: 50
        });
    }
);
