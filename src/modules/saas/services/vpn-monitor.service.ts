
import si from 'systeminformation';
import { prisma } from '@/lib/prisma';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { VpnService } from './vpn.service';

const execAsync = promisify(exec);

export class VpnMonitorService {

    /**
     * Coleta métricas de saúde do servidor (CPU, RAM, Disco) e armazena no Banco de Dados.
     * Assume que este código roda no próprio servidor VPN ou tem acesso a ele.
     */
    static async collectServerStats() {
        try {
            // Busca todos os servidores ativos (conceitualmente este app pode gerenciar muitos,
            // mas se rodar no próprio servidor, identificamos o "self" ou atualizamos todos se centralizado)
            // Nesta implementação, assumimos que estamos monitorando o servidor "local" ou um mapeado.
            // Em um setup distribuído, isso seria um agente em cada servidor VPN.
            // Aqui apenas buscamos o primeiro servidor ativo para anexar estatísticas, ou buscar por identidade.

            // NOTE: In a single-server SaaS MVP, we map 'localhost' to the defined VpnServer in DB.
            const server = await prisma.vpnServer.findFirst({
                where: { isActive: true }
            });

            if (!server) {
                console.warn('[VpnMonitor] Nenhum servidor VPN ativo encontrado no BD para anexar estatísticas.');
                return;
            }

            const [cpu, mem, fs] = await Promise.all([
                si.currentLoad(),
                si.mem(),
                si.fsSize()
            ]);

            // Uso de Disco (agregado de todos os drives montados ou root específico)
            // Pegamos apenas o volume root '/' geralmente
            const rootDisk = fs.find(d => d.mount === '/') || fs[0];

            await prisma.vpnServerStats.create({
                data: {
                    serverId: server.id,
                    cpuUsage: cpu.currentLoad,
                    memoryTotal: BigInt(mem.total),
                    memoryUsed: BigInt(mem.active),
                    diskTotal: rootDisk ? BigInt(rootDisk.size) : BigInt(0),
                    diskUsed: rootDisk ? BigInt(rootDisk.used) : BigInt(0),
                }
            });

            // 3. Update server heartbeat
            await prisma.vpnServer.update({
                where: { id: server.id },
                data: { updatedAt: new Date() }
            });



        } catch (error) {
            console.error('[VpnMonitor] Erro ao coletar estatísticas do servidor:', error);
        }
    }

    /**
     * Coleta dados de tráfego da interface WireGuard e atualiza registros VpnTunnel.
     */
    static async collectTunnelTraffic() {
        try {
            // Comando: wg show <interface> transfer
            // Formato de saída: <public_key> <rx_bytes> <tx_bytes>

            // FIX: Check for Windows/Dev environment to avoid crash if 'wg' is missing
            if (process.platform === 'win32') {
                console.warn('[VpnMonitor] Running on Windows. Skipping WireGuard traffic collection.');
                return;
            }

            const { stdout } = await execAsync('wg show wg0 transfer');

            const lines = stdout.trim().split('\n');
            const trafficMap = new Map<string, { rx: bigint, tx: bigint }>();

            for (const line of lines) {
                const [pubKey, rx, tx] = line.split('\t');
                if (pubKey && rx && tx) {
                    trafficMap.set(pubKey, { rx: BigInt(rx), tx: BigInt(tx) });
                }
            }

            // Atualiza Túneis
            const tunnels = await prisma.vpnTunnel.findMany({
                where: { isActive: true }
            });

            for (const tunnel of tunnels) {
                // Skip tunnels without public key (L2TP/SSTP doesn't report to WireGuard stats)
                if (!tunnel.clientPublicKey) continue;

                const stats = trafficMap.get(tunnel.clientPublicKey);

                if (stats) {
                    // Calculate increment from last known total
                    // Note: WireGuard 'transfer' command returns TOTAL counters since interface up.
                    // If interface resets, counters go to 0. We need to handle that or trust 'set' update.

                    // Simple approach: Verify if new value >= current DB value to assume it's cumulative.
                    // If new value < DB value, interface likely restarted, so we add the new value as delta.
                    // However, robust accounting usually requires an Agent or persistent state.
                    // For this MVP, we will update the TOTAL in DB to match WireGuard (if logic allows) 
                    // OR we calculate Delta if we want historical logs.

                    // Let's implement: Update DB Total to match WireGuard + Store History Log of the *Delta*

                    // But wait, if we only see "Total", we can't easily get Delta without previous state in memory or querying DB.
                    // Let's query DB is fine for batch job.

                    const prevRx = tunnel.totalBytesRx;
                    const prevTx = tunnel.totalBytesTx;

                    let deltaRx = stats.rx - prevRx;
                    let deltaTx = stats.tx - prevTx;

                    // Lidar com reset de interface (contadores resetam para 0)
                    if (deltaRx < 0) deltaRx = stats.rx;
                    if (deltaTx < 0) deltaTx = stats.tx;

                    if (deltaRx > 0 || deltaTx > 0) {
                        // 1. Registrar Histórico de Tráfego
                        await prisma.vpnTrafficLog.create({
                            data: {
                                tunnelId: tunnel.id,
                                bytesRx: deltaRx,
                                bytesTx: deltaTx
                            }
                        });

                        // 2. Atualizar Totais do Túnel
                        await prisma.vpnTunnel.update({
                            where: { id: tunnel.id },
                            data: {
                                totalBytesRx: stats.rx, // wireguard reporta RX (recebido pelo servidor) que é UP pelo cliente?
                                // Na verdade:
                                // Servidor RX = Bytes enviados PELO Peer (Upload do Cliente)
                                // Servidor TX = Bytes enviados PARA O Peer (Download do Cliente)
                                // Devemos clarificar esse mapeamento manualmente.
                                // Geralmente: "Download" para cliente = Servidor TX.
                                totalBytesTx: stats.tx
                            }
                        });

                        // 3. Verificar Cota
                        if (tunnel.quotaBytes && (stats.tx + stats.rx) > tunnel.quotaBytes) {
                            if (tunnel.tenantId) {
                                await VpnService.blockTunnel(tunnel.tenantId);
                            } else {
                                // For administrative tunnels, we just deactivate the tunnel itself
                                await prisma.vpnTunnel.update({
                                    where: { id: tunnel.id },
                                    data: { isActive: false }
                                });
                            }
                        }
                    }
                }
            }

        } catch (error) {
            console.error('[VpnMonitor] Error collecting traffic:', error);
        }
    }
}
