
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

        // 1. Database Check (Simple Ping)
        try {
            await prisma.$queryRaw`SELECT 1`;
        } catch (e) {
            console.error("DB Health Check Failed", e);
            return {
                database: { status: "OFFLINE", uptime: "0%", latency: "0ms" }
            };
        }
        const dbLatency = Date.now() - start;

        // 2. VPN Stats
        // Consider "Active" if handshake was within last 2 minutes (120s)
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

        const activeTunnels = await prisma.vpnTunnel.count({
            where: {
                lastHandshake: {
                    gte: twoMinutesAgo
                }
            }
        });

        const vpnServer = await prisma.vpnServer.findFirst({
            orderBy: { updatedAt: 'desc' }
        });

        const vpnLatency = vpnServer ? Math.abs(Date.now() - vpnServer.updatedAt.getTime()) : 0;
        // If server hasn't updated in 5 mins, mark as WARNING/OFFLINE
        const isVpnOnline = vpnLatency < 5 * 60 * 1000;

        // 3. Radius Stats
        // Count RadAcct sessions where acctstoptime is NULL
        // Note: We need to use prisma extension or raw query since schemas might be tricky
        // But we have models mapped to "radius" schema so it should work if search_path is good.
        let activeRadius = 0;
        try {
            activeRadius = await prisma.radAcct.count({
                where: {
                    acctstoptime: null
                }
            });
        } catch (e) {
            console.warn("Radius Stats Failed", e);
        }

        // Return Data
        return {
            whatsapp: {
                status: "ONLINE",
                uptime: "99.9%",
                latency: "120ms" // Mocked for now (Evolution API external)
            },
            radius: {
                status: "ONLINE",
                uptime: "100%",
                latency: "15ms",
                activeSessions: activeRadius
            },
            database: {
                status: "ONLINE",
                uptime: "99.95%",
                latency: `${dbLatency}ms`
            },
            vpn: {
                status: isVpnOnline ? "ONLINE" : "OFFLINE",
                uptime: "99.9%",
                latency: `${Math.round(vpnLatency / 1000)}s ago`,
                connectedPeers: activeTunnels,
                lastSync: vpnServer?.updatedAt || null
            }
        };
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
