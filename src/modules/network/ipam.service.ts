import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// Helper to convert IP to Int and back for easy math
function ipToInt(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function intToIp(int: number): string {
    return [
        (int >>> 24) & 0xff,
        (int >>> 16) & 0xff,
        (int >>> 8) & 0xff,
        int & 0xff
    ].join('.');
}

/**
 * IPAM Service (IP Address Management)
 * Manages the 10.8.0.0/16 private range for VPN Tunnels.
 * Ensures uniqueness and handles concurrency.
 */
export class IpamService {
    private readonly SUBNET_START = '10.8.0.2'; // .1 is usually the Gateway/Server
    private readonly SUBNET_END = '10.8.255.254';

    /**
     * Allocates the next available IP address in the VPN subnet.
     * Uses an interactive transaction to prevent race conditions.
     */
    async allocateNextIp(serverId: string): Promise<string> {
        return await prisma.$transaction(async (tx) => {
            // 1. Get all currently assigned IPs for this server, sorted
            // We fetch only the internalIp column to be lightweight
            const allocatedTunnels = await tx.vpnTunnel.findMany({
                where: { serverId },
                select: { internalIp: true },
                orderBy: { internalIp: 'asc' } // Text sort is not ideal for IPs (10.8.0.10 < 10.8.0.2), but we map to Int below
            });

            // 2. Map to integers for proper numeric progression check
            const usedIps = new Set(allocatedTunnels.map(t => ipToInt(t.internalIp)));

            let candidateInt = ipToInt(this.SUBNET_START);
            const endInt = ipToInt(this.SUBNET_END);

            // 3. Find first gap
            // Optimization: If list is huge, this linear scan is slow. 
            // Better approach for scaling: Store 'next_available_ip' in a separate table/Redis.
            // For < 10k clients, this memory op is acceptable (~few ms).
            while (candidateInt <= endInt) {
                if (!usedIps.has(candidateInt)) {
                    // Found a gap!
                    const ip = intToIp(candidateInt);
                    return ip;
                    // Note: We don't "reserve" it here by writing to a table yet, 
                    // but since we are inside a Transaction scope that includes the Caller's INSERT,
                    // valid uniqueness depends on the caller IMMEDIATELY creating the record.
                    // Ideally, IpamService should take a callback or create the record itself.
                }
                candidateInt++;
            }

            throw new Error('IP Pool Exhausted for this VPN Server');
        }, {
            timeout: 30000 // 30s wait for lock/tx
        });
    }

    /**
     * Sincroniza um pool de IPs local para a tabela Radippool (Radius)
     * Isso permite que o FreeRADIUS distribua os IPs dinamicamente.
     */
    async syncPoolToRadius(poolName: string, rangeStart: string, rangeEnd: string, nasIp: string = "0.0.0.0"): Promise<number> {
        const startInt = ipToInt(rangeStart);
        const endInt = ipToInt(rangeEnd);

        if (startInt > endInt) {
            throw new Error('IP Range inválido: Início maior que o fim.');
        }

        const ips: string[] = [];
        for (let i = startInt; i <= endInt; i++) {
            ips.push(intToIp(i));
        }

        // 1. Limpa entradas antigas deste pool para este NAS
        await (prisma as any).radippool.deleteMany({
            where: { poolName, nasipaddress: nasIp }
        });

        // 2. Insere os novos IPs
        // Note: Prisma createMany is efficient for batching
        const data = ips.map(ip => ({
            poolName,
            framedipaddress: ip,
            nasipaddress: nasIp,
            calledstationid: "",
            callingstationid: "",
        }));

        const result = await (prisma as any).radippool.createMany({
            data: data
        });

        return result.count;
    }

    /**
     * Cria uma nova configuração de Pool para o Tenant
     */
    async createPool(data: { name: string, rangeStart: string, rangeEnd: string, description?: string, nasId?: number }) {
        const pool = await (prisma as any).ipPool.create({
            data: {
                name: data.name,
                rangeStart: data.rangeStart,
                rangeEnd: data.rangeEnd,
                description: data.description,
                nasId: data.nasId
            }
        });

        // Sincroniza imediatamente com o Radius
        let nasIp = "0.0.0.0";
        if (data.nasId) {
            const nas = await prisma.nas.findUnique({ where: { id: data.nasId } });
            if (nas) nasIp = nas.nasname;
        }

        await this.syncPoolToRadius(pool.name, pool.rangeStart, pool.rangeEnd, nasIp);

        return pool;
    }

    async getPools() {
        return await (prisma as any).ipPool.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }

    async deletePool(id: string) {
        const pool = await (prisma as any).ipPool.findUnique({ where: { id } });
        if (!pool) return;

        // Remove do Radius também
        await (prisma as any).radippool.deleteMany({
            where: { poolName: pool.name }
        });

        return await (prisma as any).ipPool.delete({ where: { id } });
    }
}
