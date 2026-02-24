"use server"

import { prisma } from "@/lib/prisma";
import { protectedAction } from "@/lib/api/action-wrapper";
import { RadiusService } from "../services/radius.service";

/**
 * Normaliza valores BigInt para serialização JSON.
 */
function serializeBigInt(obj: unknown): unknown {
    return JSON.parse(JSON.stringify(obj, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
}

/**
 * Obtém métricas globais de uso do RADIUS.
 */
export const getGlobalRadiusMetrics = protectedAction(
    ["SUPER_ADMIN"],
    async () => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // 1. Sessões Ativas Totais (acctstoptime é nulo E acctupdatetime é recente)
        const activeCount = await prisma.radAcct.count({
            where: {
                acctstoptime: null,
                acctupdatetime: {
                    gte: new Date(now.getTime() - 5 * 60 * 1000) // Heartbeat de 5 minutos
                }
            }
        });

        // 2. Transferência Total de Dados (Últimos 30 dias)
        const traffic = await prisma.radAcct.aggregate({
            _sum: {
                acctinputoctets: true,
                acctoutputoctets: true
            },
            where: {
                acctstarttime: { gte: thirtyDaysAgo }
            }
        });

        // 3. ISPs com mais atividade
        const topNas = await prisma.radAcct.groupBy({
            by: ['nasipaddress'],
            _count: {
                radacctid: true
            },
            orderBy: {
                _count: {
                    radacctid: 'desc'
                }
            },
            take: 5
        });

        // Resolve o NAS para nomes de Tenants
        const nasDetails = await Promise.all(topNas.map(async (n) => {
            const nasInfo = await prisma.nas.findUnique({
                where: { nasname: n.nasipaddress },
                include: { tenant: { select: { name: true } } }
            });
            return {
                ip: n.nasipaddress,
                count: n._count.radacctid,
                tenantName: nasInfo?.tenant?.name || "ISP Desconhecido"
            };
        }));

        return serializeBigInt({
            activeCount,
            totalTraffic: {
                input: traffic._sum.acctinputoctets || BigInt(0),
                output: traffic._sum.acctoutputoctets || BigInt(0)
            },
            topNas: nasDetails
        });
    }
);

/**
 * Lista todas as sessões ativas de todos os ISPs.
 */
export const getGlobalRadiusSessions = protectedAction(
    ["SUPER_ADMIN"],
    async () => {
        const sessions = await prisma.radAcct.findMany({
            where: {
                acctstoptime: null
            },
            orderBy: {
                acctstarttime: 'desc'
            },
            take: 50
        });

        const enhancedSessions = await Promise.all(sessions.map(async (s) => {
            const nas = await prisma.nas.findUnique({
                where: { nasname: s.nasipaddress },
                include: { tenant: { select: { name: true } } }
            });
            return {
                ...s,
                tenantName: nas?.tenant?.name || "ISP Desconhecido"
            };
        }));

        return serializeBigInt(enhancedSessions);
    }
);

/**
 * Força a desconexão de um usuário enviando um Pacote CoA de Desconexão.
 */
export const disconnectGlobalRadiusUser = protectedAction(
    ["SUPER_ADMIN"],
    async (input: { username: string, nasIp: string }) => {
        const nas = await prisma.nas.findUnique({
            where: { nasname: input.nasIp },
            select: { secret: true }
        });

        if (!nas) throw new Error("NAS não encontrado");

        await RadiusService.disconnectUser(input.username, input.nasIp, nas.secret);
        return { success: true };
    }
);
