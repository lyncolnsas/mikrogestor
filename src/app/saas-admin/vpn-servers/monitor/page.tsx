
import { prisma } from "@/lib/prisma";
import { VpnServerStatsCard } from "@/components/vpn/vpn-server-stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = 'force-dynamic'; // Garante dados em tempo real

async function getVpnStats() {
    // Obtém estatísticas mais recentes do servidor
    const serverStats = await prisma.vpnServerStats.findFirst({
        orderBy: { measuredAt: 'desc' },
        include: { server: true }
    });

    // Obtém maiores consumidores (Túneis)
    const topTunnels = await prisma.vpnTunnel.findMany({
        orderBy: { totalBytesTx: 'desc' }, // Assumindo TX como download/consumo na perspectiva do cliente
        take: 10,
        include: { tenant: true }
    });

    return { serverStats, topTunnels };
}

export default async function VpnMonitorPage() {
    const { serverStats, topTunnels } = await getVpnStats();

    if (!serverStats) {
        return <div className="p-6">Aguardando coleta de dados...</div>;
    }

    const formatBytes = (bytes: bigint | number) => {
        const b = Number(bytes);
        if (b === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(b) / Math.log(k));
        return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6 p-6">
            <h1 className="text-3xl font-bold tracking-tight">Monitoramento VPN</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <VpnServerStatsCard
                    serverName={serverStats.server.name}
                    cpu={serverStats.cpuUsage}
                    memory={{
                        used: Number(serverStats.memoryUsed),
                        total: Number(serverStats.memoryTotal)
                    }}
                    disk={{
                        used: Number(serverStats.diskUsed),
                        total: Number(serverStats.diskTotal)
                    }}
                />

                {/* Traffic Summary Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tráfego Total da Rede</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatBytes(topTunnels.reduce((acc, t) => acc + t.totalBytesTx + t.totalBytesRx, BigInt(0)))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Soma de Upload + Download de todos os túneis ativos
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Top Consumo por Tenant</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tenant</TableHead>
                                <TableHead>IP Interno</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Download</TableHead>
                                <TableHead>Upload</TableHead>
                                <TableHead>Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topTunnels.map((tunnel) => (
                                <TableRow key={tunnel.id}>
                                    <TableCell className="font-medium">{tunnel.tenant?.name || "ADMINISTRATIVO"}</TableCell>
                                    <TableCell>{tunnel.internalIp}</TableCell>
                                    <TableCell>
                                        <Badge variant={tunnel.isActive ? "default" : "destructive"}>
                                            {tunnel.isActive ? "Ativo" : "Bloqueado"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{formatBytes(tunnel.totalBytesTx)}</TableCell>
                                    <TableCell>{formatBytes(tunnel.totalBytesRx)}</TableCell>
                                    <TableCell className="font-bold">
                                        {formatBytes(tunnel.totalBytesTx + tunnel.totalBytesRx)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
