import { RouterOSAPI } from 'node-routeros';
import { prisma } from '@/lib/prisma';

/**
 * Serviço responsável pela integração com roteadores MikroTik via API.
 * Gerencia o provisionamento de serviços PPPoE, Radius, segredos e controle de acesso.
 */
export class MikrotikService {
    /**
     * Cria uma conexão com o MikroTik via API.
     */
    private static async getConnection(nasDetails: { nasname: string; apiUser?: string | null; apiPassword?: string | null; apiPort?: number | null }) {
        const conn = new RouterOSAPI({
            host: nasDetails.nasname,
            user: nasDetails.apiUser || "admin",
            password: nasDetails.apiPassword || "",
            port: nasDetails.apiPort || 8728,
            timeout: 10
        });

        try {
            await conn.connect();
            return conn;
        } catch (error) {
            console.error(`[MikrotikService] Connection failed to ${nasDetails.nasname}:`, error);
            throw new Error(`Não foi possível conectar ao MikroTik em ${nasDetails.nasname}`);
        }
    }

    /**
     * Sincroniza um cliente localmente no MikroTik (Redundância OOB).
     */
    static async upsertSecret(nasId: number, customer: { username: string; password: string; planName: string; remoteIpPool?: string; disabled?: boolean }) {
        const nas = await prisma.nas.findUnique({ where: { id: nasId } });
        if (!nas) throw new Error("NAS não encontrado");

        const conn = await this.getConnection(nas);
        try {
            // Verifica se o segredo já existe
            const exists = await conn.write("/ppp/secret/print", [
                "?.name=" + customer.username
            ]);

            const command = (exists as any[]).length > 0 ? "/ppp/secret/set" : "/ppp/secret/add";
            const params: any = {
                name: customer.username,
                password: customer.password,
                profile: customer.planName,
                service: "pppoe",
                comment: "Sincronizado via MikroGestor SaaS",
                disabled: customer.disabled ? "yes" : "no"
            };

            if (customer.remoteIpPool) {
                params["remote-address"] = customer.remoteIpPool;
            }

            if ((exists as any[]).length > 0) {
                params[".id"] = (exists as any[])[0][".id"];
            }

            await conn.write(command, params);
            // 
        } finally {
            conn.close();
        }
    }

    /**
     * Habilita ou desabilita um segredo local no MikroTik (Redundância OOB).
     */
    static async toggleSecret(nasId: number, username: string, disabled: boolean) {
        const nas = await prisma.nas.findUnique({ where: { id: nasId } });
        if (!nas) throw new Error("NAS não encontrado");

        const conn = await this.getConnection(nas);
        try {
            const exists = await conn.write("/ppp/secret/print", [
                "?.name=" + username
            ]);

            if ((exists as any[]).length > 0) {
                const id = (exists as any[])[0][".id"];
                await conn.write("/ppp/secret/set", { ".id": id, disabled: disabled ? "yes" : "no" } as any);
            }
        } finally {
            conn.close();
        }
    }

    /**
     * Remove um cliente localmente no MikroTik (Redundância OOB).
     */
    static async removeSecret(nasId: number, username: string) {
        const nas = await prisma.nas.findUnique({ where: { id: nasId } });
        if (!nas) throw new Error("NAS não encontrado");

        const conn = await this.getConnection(nas);
        try {
            const exists = await conn.write("/ppp/secret/print", [
                "?.name=" + username
            ]);

            if ((exists as any[]).length > 0) {
                const id = (exists as any[])[0][".id"];
                await conn.write("/ppp/secret/remove", ["=.id=" + id]);
                // 
            }
        } finally {
            conn.close();
        }
    }

    /**
     * Aplica as regras de firewall necessárias para o redirecionamento de bloqueio.
     */
    static async setupBlockingInfrastructure(nasId: number) {
        const nas = await prisma.nas.findUnique({ where: { id: nasId } });
        if (!nas) return;

        const conn = await this.getConnection(nas);
        try {
            await conn.write("/ip/firewall/nat/add", {
                chain: "dstnat",
                "src-address-list": "BLOCKED_USERS",
                protocol: "tcp",
                "dst-port": "80",
                "action": "redirect",
                "to-ports": "8080",
                comment: "SaaS: Redirecionamento Web Bloqueio"
            } as any).catch(() => null);

            await conn.write("/ip/firewall/nat/add", {
                chain: "dstnat",
                "src-address-list": "BLOCKED_USERS",
                protocol: "tcp",
                "dst-port": "443",
                "action": "redirect",
                "to-ports": "8443",
                comment: "SaaS: Redirecionamento SSL Bloqueio"
            } as any).catch(() => null);
        } finally {
            conn.close();
        }
    }

    /**
     * Envia e importa certificados SSL para o MikroTik.
     */
    static async propagateSsl(nasId: number, certData: string, keyData: string) {
        const nas = await prisma.nas.findUnique({ where: { id: nasId } });
        if (!nas) return;

        const conn = await this.getConnection(nas);
        try {
            await conn.write("/file/add", {
                name: "saas-fullchain.pem",
                contents: certData
            } as any).catch(() => null);

            await conn.write("/file/add", {
                name: "saas-privkey.pem",
                contents: keyData
            } as any).catch(() => null);

            await conn.write("/certificate/import", {
                "file-name": "saas-fullchain.pem",
                "passphrase": ""
            } as any);

            await conn.write("/certificate/import", {
                "file-name": "saas-privkey.pem",
                "passphrase": ""
            } as any);

            await conn.write("/ip/service/set", {
                numbers: "www-ssl",
                certificate: "saas-fullchain.pem_0",
                disabled: "no"
            } as any);
        } finally {
            conn.close();
        }
    }

    /**
     * Executa um comando genérico.
     */
    static async executeCommand(nasId: number, command: string, params: string[] = []): Promise<unknown> {
        const nas = await prisma.nas.findUnique({ where: { id: nasId } });
        if (!nas) throw new Error("NAS não encontrado");

        const conn = await this.getConnection(nas);
        try {
            return await conn.write(command, params);
        } finally {
            conn.close();
        }
    }

    /**
     * Auxiliar para desbloquear um cliente removendo da Address List.
     */
    static async unblockCustomer(nasId: number, remoteAddress: string) {
        const nas = await prisma.nas.findUnique({ where: { id: nasId } });
        if (!nas) throw new Error("NAS não encontrado");

        const conn = await this.getConnection(nas);
        try {
            const findResult = await conn.write('/ip/firewall/address-list/print', [
                `?address=${remoteAddress}`,
                `?list=BLOCKED_CLIENTS`
            ]);

            if (Array.isArray(findResult) && findResult.length > 0) {
                const id = findResult[0]['.id'];
                await conn.write('/ip/firewall/address-list/remove', [
                    `=.id=${id}`
                ]);
            }
        } finally {
            conn.close();
        }
    }

    /**
     * Propaga o certificado SSL para todos os roteadores NAS cadastrados.
     */
    static async propagateSslToAllNas(cert: string, key: string) {
        const nases = await prisma.nas.findMany({ where: { type: 'mikrotik' } });
        for (const nas of nases) {
            try {
                await this.propagateSsl(nas.id, cert, key);
            } catch (error: any) {
                console.error(`[MikrotikService] Failed to propagate SSL to server ${nas.id}:`, error.message);
            }
        }
    }

    /**
     * Configura a infraestrutura de bloqueio (Firewall) em todos os roteadores NAS.
     */
    static async setupInfrastructureOnAllNas() {
        const nases = await prisma.nas.findMany({ where: { type: 'mikrotik' } });
        for (const nas of nases) {
            try {
                await this.setupBlockingInfrastructure(nas.id);
            } catch (error: any) {
                console.error(`[MikrotikService] Failed to setup firewall on server ${nas.id}:`, error.message);
            }
        }
    }

    /**
     * Provisiona a pilha completa de serviços no roteador.

     */
    static async provisionRouter(nasId: number, options: {
        radiusServerIp: string;
        radiusSecret: string;
        pppoeInterface: string;
        localAddress?: string;
        dnsServers?: string;
    }) {
        const nas = await prisma.nas.findUnique({ where: { id: nasId } });
        if (!nas) throw new Error("NAS não encontrado");

        const conn = await this.getConnection(nas);
        try {
            // Configurar Cliente Radius
            await conn.write('/radius/add', {
                service: 'ppp',
                address: options.radiusServerIp,
                secret: options.radiusSecret,
                timeout: '3000ms',
                'authentication-port': '1812',
                'accounting-port': '1813',
                comment: 'Gerenciado pelo Mikrogestor'
            } as any).catch(() => null);

            // Configurar Profile PPP
            const profileName = 'mikrogestor-profile';
            await conn.write('/ppp/profile/add', {
                name: profileName,
                'use-radius': 'yes',
                'local-address': options.localAddress || '10.0.0.1',
                'dns-server': options.dnsServers || '8.8.8.8,1.1.1.1'
            } as any).catch(() => null);

            // Configurar Servidor PPPoE
            await conn.write('/interface/pppoe-server/server/add', {
                'service-name': 'pppoe-service',
                interface: options.pppoeInterface,
                authentication: 'pap,chap,mschap2',
                'default-profile': profileName,
                disabled: 'no'
            } as any).catch(() => null);

            // Habilitar CoA
            await conn.write('/radius/incoming/set', {
                accept: 'yes',
                port: '3799'
            } as any);

            return { success: true };
        } finally {
            conn.close();
        }
    }

    /**
     * Provisiona a infraestrutura de Hotspot no roteador.
     */
    static async setupHotspot(nasId: number, options: {
        interface: string;
        hotspotAddress: string;
        dnsName: string;
        radiusServerIp: string;
        radiusSecret: string;
        portalUrl: string;
    }) {
        const nas = await prisma.nas.findUnique({ where: { id: nasId } });
        if (!nas) throw new Error("NAS não encontrado");

        const conn = await this.getConnection(nas);
        try {
            // 1. Configurar Radius para Hotspot
            await conn.write('/radius/add', {
                service: 'hotspot',
                address: options.radiusServerIp,
                secret: options.radiusSecret,
                timeout: '3000ms',
                comment: 'Hotspot Mikrogestor'
            } as any).catch(() => null);

            // 2. Walled Garden (Liberar o portal de cadastro)
            const portalHost = new URL(options.portalUrl).hostname;
            await conn.write('/ip/hotspot/walled-garden/add', {
                dst_host: portalHost,
                action: 'allow',
                comment: 'Mikrogestor Portal'
            } as any).catch(() => null);

            // 3. Hotspot Server Profile
            const profileName = 'hsp_mikrogestor';
            await conn.write('/ip/hotspot/profile/add', {
                name: profileName,
                'hotspot-address': options.hotspotAddress.split('/')[0],
                'dns-name': options.dnsName,
                'login-by': 'http-chap,https,http-pap',
                'use-radius': 'yes',
                'radius-interim-update': '00:05:00'
            } as any).catch(() => null);

            // 4. Hotspot Server
            await conn.write('/ip/hotspot/add', {
                name: 'hs_mikrogestor',
                interface: options.interface,
                profile: profileName,
                disabled: 'no'
            } as any).catch(() => null);

            return { success: true };
        } finally {
            conn.close();
        }
    }
}
