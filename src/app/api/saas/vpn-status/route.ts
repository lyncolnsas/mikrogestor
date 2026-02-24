
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { serverId, secret, peers, system } = body;

        // 1. Validation
        if (!serverId || !secret || !Array.isArray(peers)) {
            return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
        }

        const server = await prisma.vpnServer.findUnique({
            where: { id: serverId }
        });

        if (!server || (server as any).secret !== secret) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        // 2. Save System Stats (if provided)
        if (system) {
            await prisma.vpnServerStats.create({
                data: {
                    serverId,
                    cpuUsage: system.cpu || 0,
                    memoryTotal: system.memory?.total || 0,
                    memoryUsed: system.memory?.used || 0,
                    diskTotal: system.disk?.total || 0,
                    diskUsed: system.disk?.used || 0
                }
            });

            // Cleanup old stats (keep last 24h)
            // Ideally a cron job, but doing a quick cleanup here occasionally or relying on data retention policy is fine.
        }

        // 3. Bulk Update Logic
        // Prisma doesn't support bulk update with different values easily, so we loop (it's okay dynamically for < 1000 peers)
        // Or we could use a raw query for performance if needed, but VpnTunnel updates are fine.

        const updatePromises = peers.map(async (peer: any) => {
            const { publicKey, handshake, rx, tx } = peer;

            // Format handshake timestamp (seconds epoch to Date)
            // handshake is 0 if never
            const lastHandshake = handshake > 0 ? new Date(handshake * 1000) : null;

            // Find tunnel by public key
            // Note: clientPublicKey is unique per server ideally, but schema allows duplicates across tenants?
            // VpnTunnel is unique on [serverId, internalIp], but we identifying by PublicKey from WireGuard

            try {
                // Update the tunnel identified by this public key belonging to this server
                // We find first because public key *should* be unique for active tunnels
                const tunnel = await prisma.vpnTunnel.findFirst({
                    where: {
                        serverId,
                        clientPublicKey: publicKey
                    }
                });

                if (tunnel) {
                    await prisma.vpnTunnel.update({
                        where: { id: tunnel.id },
                        data: {
                            lastHandshake,
                            totalBytesRx: BigInt(rx),
                            totalBytesTx: BigInt(tx)
                        }
                    });
                }
            } catch (e) {
                console.error(`Failed to update tunnel stats for key ${publicKey}`, e);
            }
        });

        await Promise.all(updatePromises);

        // 3. Update Server Heartbeat (optional, utilizing updatedAt)
        await prisma.vpnServer.update({
            where: { id: serverId },
            data: { updatedAt: new Date() }
        });

        return NextResponse.json({ success: true, updated: peers.length });

    } catch (e) {
        console.error("[VPN Status API] Error:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
