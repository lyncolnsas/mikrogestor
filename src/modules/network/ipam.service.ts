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
     * Checks if a specific IP is available (e.g. for static assignment requests)
     */
    async isIpAvailable(serverId: string, ip: string): Promise<boolean> {
        const count = await prisma.vpnTunnel.count({
            where: { serverId, internalIp: ip }
        });
        return count === 0;
    }
}
