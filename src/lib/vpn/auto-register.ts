import { prisma } from '@/lib/prisma';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { networkInterfaces } from 'os';

/**
 * Serviço de Auto-Registro do Servidor VPN
 * Executa automaticamente no startup da aplicação para garantir que o servidor VPN
 * esteja sempre registrado no banco de dados com as informações corretas.
 */
export class VpnAutoRegisterService {
    private static readonly SERVER_ID = process.env.VPN_SERVER_ID || 'default-ca-sync-01';
    private static readonly SERVER_SECRET = process.env.VPN_SERVER_SECRET || 'ca-dev-secret-2025';
    private static readonly VPN_HOST = process.env.VPN_HOST || process.env.VPN_PUBLIC_ENDPOINT || 'auto';
    private static readonly VPN_PORT = process.env.VPN_PORT || '51820';
    private static readonly AUTO_REGISTER = process.env.VPN_AUTO_REGISTER === 'true';

    /**
     * Lê a chave pública do servidor WireGuard
     */
    private static readPublicKey(): string | null {
        const possiblePaths = [
            join(process.cwd(), 'docker', 'wireguard', 'public.key'),
            join(process.cwd(), 'config', 'wireguard', 'server', 'publickey-server'),
            '/etc/wireguard/publickey',
            '/config/server/publickey-server'
        ];

        for (const path of possiblePaths) {
            if (existsSync(path)) {
                try {
                    const key = readFileSync(path, 'utf-8').trim();
                    if (key && key.length > 0) {
                        return key;
                    }
                } catch (error) {
                    console.warn(`[VPN Auto-Register] Failed to read key from ${path}:`, error);
                }
            }
        }

        console.warn('[VPN Auto-Register] Public key file not found in any expected location');
        return null;
    }

    /**
     * Detecta o IP público ou IP da rede local
     */
    private static async detectPublicEndpoint(): Promise<string> {
        // 1. Prioridade Máxima: VPN_HOST configurado manualmente (não 'auto')
        if (this.VPN_HOST && this.VPN_HOST !== 'auto') {
            return this.VPN_HOST.includes(':')
                ? this.VPN_HOST
                : `${this.VPN_HOST}:${this.VPN_PORT}`;
        }

        // 2. Auto-Descoberta: Tentar extrair host do URL da aplicação (Self-Awareness)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
        if (appUrl) {
            try {
                const url = new URL(appUrl);
                const hostname = url.hostname;

                // Only use it if it's not localhost or 0.0.0.0
                const isGeneric = hostname === 'localhost' ||
                    hostname === '127.0.0.1' ||
                    hostname === '0.0.0.0' ||
                    hostname === '::1';

                if (hostname && !isGeneric) {
                    console.log(`[VPN Auto-Register] Hostness self-detected from APP_URL: ${hostname}`);
                    return `${hostname}:${this.VPN_PORT}`;
                }

                // If it IS generic but we have no better option, 
                // we should at least try to get the LAN IP from the system later,
                // but let's see if we can avoid returning 127.0.0.1 if APP_URL is set but failed parse.
            } catch (err) {
                // URL inválida, segue para o próximo método
            }
        }

        // 3. Fallback: Tentar detectar IP público via serviços externos (Redundância)
        const services: Array<{ url: string; headers: Record<string, string> }> = [
            { url: 'https://ifconfig.me', headers: { 'User-Agent': 'curl/7.81.0' } },
            { url: 'https://api.ipify.org', headers: {} }
        ];

        for (const service of services) {
            try {
                const response = await fetch(service.url, {
                    headers: service.headers,
                    signal: AbortSignal.timeout(5000)
                });

                if (response.ok) {
                    const publicIp = (await response.text()).trim();

                    // Validação robusta: IPv4 ou IPv6
                    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

                    if (publicIp && ipRegex.test(publicIp)) {
                        console.log(`[VPN Auto-Register] Public IP detected via ${service.url}: ${publicIp}`);
                        return `${publicIp}:${this.VPN_PORT}`;
                    } else {
                        console.warn(`[VPN Auto-Register] ${service.url} returned invalid format: ${publicIp.substring(0, 50)}`);
                    }
                }
            } catch (error) {
                console.warn(`[VPN Auto-Register] Service ${service.url} failed: ${error instanceof Error ? error.message : 'Timeout'}`);
            }
        }

        console.warn('[VPN Auto-Register] All external IP detection services failed, falling back to local interfaces.');

        // 4. Fallback Final: Detectar IP da rede local, filtrando interfaces internas e VPNs
        const nets = networkInterfaces();
        let localIp = '127.0.0.1';

        for (const name of Object.keys(nets)) {
            const netInfo = nets[name];
            if (!netInfo) continue;

            for (const net of netInfo) {
                // Pular endereços internos e não IPv4
                if (net.family === 'IPv4' && !net.internal) {
                    // FILTRO: Ignorar IPs do range da própria VPN (10.255.x.x) e Docker (172.x.x.x)
                    if (net.address.startsWith('10.255.') || net.address.startsWith('172.')) {
                        continue;
                    }
                    localIp = net.address;
                    break;
                }
            }
            if (localIp !== '127.0.0.1') break;
        }

        // 5. Final Fallback: Heuristic override from APP_URL if we still have loopback
        if (localIp === '127.0.0.1' || localIp.startsWith('172.')) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
            if (appUrl) {
                try {
                    const url = new URL(appUrl);
                    if (url.hostname && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1' && url.hostname !== '0.0.0.0') {
                        console.log(`[VPN Auto-Register] 🚨 Revert-Protection: Usando hostname da APP_URL como endpoint: ${url.hostname}`);
                        localIp = url.hostname;
                    }
                } catch (e) { }
            }
        }

        return `${localIp}:${this.VPN_PORT}`;
    }

    /**
     * Registra ou atualiza o servidor VPN no banco de dados
     */
    static async register(): Promise<void> {
        if (!this.AUTO_REGISTER) {
            return;
        }

        try {
            // Ler chave pública
            const publicKey = this.readPublicKey();
            if (!publicKey) {
                console.warn('[VPN Auto-Register] Skipping registration - public key not found');
                return;
            }

            // Detectar endpoint público
            const fullEndpoint = await this.detectPublicEndpoint();
            const publicEndpoint = fullEndpoint.split(":")[0]; // Strip port

            // Verificar se servidor já existe
            const existing = await prisma.vpnServer.findUnique({
                where: { id: this.SERVER_ID }
            });

            if (existing) {
                // Atualizar servidor existente
                await prisma.vpnServer.update({
                    where: { id: this.SERVER_ID },
                    data: {
                        publicKey,
                        publicEndpoint,
                        isActive: true
                    }
                });
            } else {
                // Criar novo servidor
                await prisma.vpnServer.create({
                    data: {
                        id: this.SERVER_ID,
                        secret: this.SERVER_SECRET,
                        name: 'Servidor VPN Principal',
                        publicKey,
                        publicEndpoint,
                        listenPort: 51820,
                        capacityLimit: 1000,
                        isActive: true
                    }
                });
            }
        } catch (error) {
            console.error('[VPN Auto-Register] ❌ Registration failed:', error);
        }
    }

    /**
     * Verifica o status do registro VPN
     */
    static async checkStatus(): Promise<{
        registered: boolean;
        server?: any;
        error?: string;
    }> {
        try {
            const server = await prisma.vpnServer.findUnique({
                where: { id: this.SERVER_ID }
            });

            if (server) {
                return {
                    registered: true,
                    server: {
                        id: server.id,
                        name: server.name,
                        endpoint: server.publicEndpoint,
                        isActive: server.isActive
                    }
                };
            }

            return {
                registered: false,
                error: 'Server not found in database'
            };

        } catch (error) {
            return {
                registered: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
