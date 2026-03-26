import { prisma } from '@/lib/prisma';

/**
 * Serviço de Sincronização com o RADIUS.
 * Mantém o provisionamento do FreeRADIUS alinhado com as mudanças no sistema Mikrogestor.
 */
export class RadiusService {
    /**
     * Sincroniza um cliente completo (Senha + Limites) com o Radius.
     */
    static async syncCustomer(tenantId: string, customer: { id: string, radiusPassword?: string | null, framedIp?: string | null, cpfCnpj?: string | null, status?: string, nasId?: number | null }, plan: { upload: number | string, download: number | string, remoteIpPool?: string | null }, tx?: any): Promise<void> {
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

            // 5. RadCheck: NAS-IP-Address (Isolation)
            // Se o cliente estiver vinculado a um NAS, adicionamos a restrição no Radius
            await innerTx.radCheck.deleteMany({ where: { username, attribute: 'NAS-IP-Address' } });
            if (customer.nasId) {
                const nas = await innerTx.nas.findUnique({ where: { id: customer.nasId } });
                if (nas) {
                    await innerTx.radCheck.create({
                        data: {
                            username,
                            attribute: 'NAS-IP-Address',
                            op: '==',
                            value: nas.nasname
                        }
                    });
                }
            }
        }, { timeout: 30000 });

        // Background OOB Sync to Local MikroTik
        try {
            const nasFilter = customer.nasId ? { id: customer.nasId } : { tenantId };
            const tenantNases = await (db as any).nas.findMany({ where: nasFilter });
            if (tenantNases && tenantNases.length > 0) {
                const { MikrotikService } = await import('@/modules/saas/services/mikrotik.service');
                for (const nas of tenantNases) {
                    MikrotikService.upsertSecret(nas.id, {
                        username,
                        password: customer.radiusPassword || '123456',
                        planName: 'mikrogestor-profile',
                        remoteIpPool: plan.remoteIpPool || undefined,
                        disabled: customer.status === 'BLOCKED'
                    }).catch(e => console.warn(`[Background OOB Sync] Nas ${nas.id} failed:`, e.message));
                }
            }
        } catch (e) {
            console.warn('[RadiusService] Failed to execute OOB sync', e);
        }
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

        // Background OOB toggle to Local MikroTik
        try {
            const tenantMatch = username.match(/^t([^_]+)_/);
            if (tenantMatch) {
                const tenantId = tenantMatch[1];
                const tenantNases = await (db as any).nas.findMany({ where: { tenantId } });
                if (tenantNases && tenantNases.length > 0) {
                    const { MikrotikService } = await import('@/modules/saas/services/mikrotik.service');
                    for (const nas of tenantNases) {
                        MikrotikService.toggleSecret(nas.id, username, status === 'BLOCKED')
                            .catch(e => console.warn(`[Background OOB Status Toggle] Nas ${nas.id} failed:`, e.message));
                    }
                }
            }
        } catch (e) {
            console.warn('[RadiusService] Failed to execute OOB status toggle', e);
        }
    }

    /**
     * Remove um cliente do serviço Radius.
     */
    static async removeCustomer(username: string, tx?: any) {
        const db = tx || prisma;
        await db.radCheck.deleteMany({ where: { username } });
        await db.radReply.deleteMany({ where: { username } });

        // Background OOB Removal from Local MikroTik
        try {
            const tenantMatch = username.match(/^t([^_]+)_/);
            if (tenantMatch) {
                const tenantId = tenantMatch[1];
                const tenantNases = await (db as any).nas.findMany({ where: { tenantId } });
                if (tenantNases && tenantNases.length > 0) {
                    const { MikrotikService } = await import('@/modules/saas/services/mikrotik.service');
                    for (const nas of tenantNases) {
                        MikrotikService.removeSecret(nas.id, username)
                            .catch(e => console.warn(`[Background OOB Remove] Nas ${nas.id} failed:`, e.message));
                    }
                }
            }
        } catch (e) {
            console.warn('[RadiusService] Failed to execute OOB remove toggle', e);
        }
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
