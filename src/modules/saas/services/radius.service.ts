import { prisma } from '@/lib/prisma';

/**
 * Serviço de Sincronização com o RADIUS.
 * Mantém o provisionamento do FreeRADIUS alinhado com as mudanças no sistema Mikrogestor.
 */
export class RadiusService {
    /**
     * Sincroniza um cliente completo (Senha + Limites) com o Radius.
     */
    static async syncCustomer(tenantId: string, customer: { id: string, radiusPassword?: string | null, framedIp?: string | null, cpfCnpj?: string | null }, plan: { upload: number | string, download: number | string, remoteIpPool?: string | null }, tx?: any): Promise<void> {
        const username = customer.cpfCnpj ? `t${tenantId}_${customer.cpfCnpj}` : `t${tenantId}_${customer.id}`;
        const rateLimit = `${plan.upload}M/${plan.download}M`;
        const db = tx || prisma;

        await (db as any).$transaction(async (innerTx: any) => {
            // 1. RadCheck: Cleartext-Password
            if (customer.radiusPassword) {
                await innerTx.radCheck.deleteMany({ where: { username, attribute: 'Cleartext-Password' } });
                await innerTx.radCheck.create({
                    data: {
                        username,
                        attribute: 'Cleartext-Password',
                        op: ':=',
                        value: customer.radiusPassword
                    }
                });
            }

            // 2. RadReply: MikroTik-Rate-Limit
            await innerTx.radReply.deleteMany({ where: { username, attribute: 'MikroTik-Rate-Limit' } });
            await innerTx.radReply.create({
                data: {
                    username,
                    attribute: 'MikroTik-Rate-Limit',
                    op: '=',
                    value: rateLimit
                }
            });

            // 3. RadReply: Framed-IP-Address (Static IP)
            if (customer.framedIp) {
                await innerTx.radReply.deleteMany({ where: { username, attribute: 'Framed-IP-Address' } });
                await innerTx.radReply.create({
                    data: {
                        username,
                        attribute: 'Framed-IP-Address',
                        op: '=',
                        value: customer.framedIp
                    }
                });
            }

            // 4. RadReply: Framed-Pool (if any)
            if (plan.remoteIpPool) {
                await innerTx.radReply.deleteMany({ where: { username, attribute: 'Framed-Pool' } });
                await innerTx.radReply.create({
                    data: {
                        username,
                        attribute: 'Framed-Pool',
                        op: '=',
                        value: plan.remoteIpPool
                    }
                });
            }
        }, { timeout: 30000 });
    }

    /**
     * Sincroniza o status de bloqueio do cliente no Radius.
     */
    static async syncStatus(username: string, status: 'ACTIVE' | 'BLOCKED', tx?: any) {
        const db = tx || prisma;

        await (db as any).radReply.deleteMany({
            where: {
                username,
                attribute: 'MikroTik-Address-List'
            }
        });

        if (status === 'BLOCKED') {
            await (db as any).radReply.create({
                data: {
                    username,
                    attribute: 'MikroTik-Address-List',
                    op: '=',
                    value: 'BLOCKED_USERS'
                }
            });
        }
    }

    /**
     * Remove um cliente do serviço Radius.
     */
    static async removeCustomer(username: string, tx?: any) {
        const db = tx || prisma;
        await db.radCheck.deleteMany({ where: { username } });
        await db.radReply.deleteMany({ where: { username } });
    }

    /**
     * Envia um Pacote de Desconexão (CoA/Disconnect-Request) para o NAS.

     */
    static async disconnectUser(username: string, nasIp: string, secret: string): Promise<void> {
        try {
            const dgram = await import('node:dgram');
            const crypto = await import('node:crypto');
            const client = dgram.createSocket('udp4');

            const usernameAttr = Buffer.concat([
                Buffer.from([1]),
                Buffer.from([username.length + 2]),
                Buffer.from(username)
            ]);

            const code = 40;
            const identifier = Math.floor(Math.random() * 256);
            const length = 20 + usernameAttr.length;

            const headerPrefix = Buffer.alloc(4);
            headerPrefix.writeUInt8(code, 0);
            headerPrefix.writeUInt8(identifier, 1);
            headerPrefix.writeUInt16BE(length, 2);

            const zeroAuthenticator = Buffer.alloc(16, 0);

            const hashInput = Buffer.concat([
                headerPrefix,
                zeroAuthenticator,
                usernameAttr,
                Buffer.from(secret)
            ]);

            const authenticator = crypto.createHash('md5').update(hashInput).digest();

            const packet = Buffer.concat([
                headerPrefix,
                authenticator,
                usernameAttr
            ]);

            return new Promise((resolve, reject) => {
                client.send(packet, 3799, nasIp, (err) => {
                    client.close();
                    if (err) reject(err);
                    else resolve();
                });
            });
        } catch (error) {
            console.error('[Radius CoA] Erro crítico:', error);
            throw error;
        }
    }
}
