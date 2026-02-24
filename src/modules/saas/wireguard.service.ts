import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { prisma } from '@/lib/prisma';
import { VpnKeyService } from '@/modules/saas/vpn-key.service';

const execAsync = promisify(exec);

/**
 * Serviço responsável por gerenciar a interface WireGuard do servidor.
 * Realiza o provisionamento dinâmico de peers (clientes VPN) no Linux.
 */
export class WireGuardService {
    private interfaceName = process.env.WG_INTERFACE || 'wg0';

    /**
     * Adiciona um novo peer (cliente) à interface WireGuard.
     */
    async addPeer(publicKey: string, allowedIps: string[]): Promise<void> {
        try {
            // Comando: wg set <interface> peer <key> allowed-ips <ips>
            const command = `wg set ${this.interfaceName} peer ${publicKey} allowed-ips ${allowedIps.join(',')}`;

            if (process.platform === 'win32') {

                return;
            }

            await execAsync(command);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[WireGuard] Erro ao adicionar peer: ${message}`);
            // Erro não crítico se a interface ainda não existir (pode estar em setup), mas deve ser logado.
        }
    }

    /**
     * Remove um peer da interface WireGuard.
     */
    async removePeer(publicKey: string): Promise<void> {

        try {
            const command = `wg set ${this.interfaceName} peer ${publicKey} remove`;

            if (process.platform === 'win32') {

                return;
            }

            await execAsync(command);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[WireGuard] Erro ao remover peer: ${message}`);
        }
    }

    /**
     * Sincroniza todos os peers do banco de dados com a interface WireGuard ativa.
     * Evita desvios de estado (state drift) após reinicializações do servidor.
     */
    async syncInterface(): Promise<void> {


        const tunnels = await prisma.vpnTunnel.findMany();

        for (const tunnel of tunnels) {
            // O servidor precisa apenas da Chave Pública do cliente para fechar o túnel.
            await this.addPeer(tunnel.clientPublicKey, [tunnel.internalIp + '/32']);
        }
    }

    /**
     * Gera o conteúdo do arquivo de configuração para o lado do cliente (MikroTik/Peer).
     */
    generateClientConfig(
        serverPublicKey: string,
        serverEndpoint: string,
        clientIp: string,
        clientPrivateKeyEncrypted: string
    ): string {
        let privateKey = clientPrivateKeyEncrypted;
        try {
            // Descriptografa a chave privada para exibição/geração do config
            privateKey = VpnKeyService.decrypt(clientPrivateKeyEncrypted);
        } catch (e) {
            console.error('[WireGuard] Falha ao descriptografar chave para geração do config', e);
        }

        return `[Interface]
PrivateKey = ${privateKey}
Address = ${clientIp}/32
DNS = 8.8.8.8

[Peer]
PublicKey = ${serverPublicKey}
Endpoint = ${serverEndpoint}
AllowedIPs = 0.0.0.0/0, ::/0

PersistentKeepalive = 25`;
    }
}
