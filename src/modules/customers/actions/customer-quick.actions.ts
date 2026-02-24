"use server";

import { protectedAction } from "@/lib/api/action-wrapper";
import { prisma } from "@/lib/prisma";
import { MikrotikService } from "@/modules/saas/services/mikrotik.service";
import { getTenantContext } from "@/shared/tenancy/tenancy.context";

// [REMOVED] const mikrotik = new MikroTikService();

/**
 * Desbloqueia um cliente removendo da Address List do MikroTik
 */
export const unblockCustomerAction = protectedAction(
    ["ISP_ADMIN", "TECHNICIAN"],
    async (customerId: string) => {
        const context = await getTenantContext();
        if (!context?.tenantId) {
            throw new Error("Contexto de tenant não encontrado");
        }

        // Busca o cliente
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: {
                id: true,
                name: true,
                status: true,
            }
        });

        if (!customer) {
            throw new Error("Cliente não encontrado");
        }

        // Busca sessão ativa do cliente no Radius para obter o IP
        const activeSession = await prisma.radAcct.findFirst({
            where: {
                username: customer.id,
                acctstoptime: null, // Sessão ativa
            },
            orderBy: {
                acctstarttime: 'desc'
            },
            select: {
                framedipaddress: true,
                nasipaddress: true,
            }
        });

        if (!activeSession?.framedipaddress) {
            throw new Error("Cliente não possui sessão ativa ou IP não encontrado");
        }

        // Busca o NAS para executar o comando
        const nas = await prisma.nas.findFirst({
            where: {
                tenantId: context.tenantId,
                nasname: activeSession.nasipaddress,
            }
        });

        if (!nas) {
            throw new Error("Concentrador (NAS) não encontrado");
        }

        // Remove da Address List BLOCKED_CLIENTS
        await MikrotikService.unblockCustomer(
            nas.id,
            activeSession.framedipaddress
        );

        // Atualiza status do cliente no banco
        await prisma.customer.update({
            where: { id: customerId },
            data: { status: "ACTIVE" }
        });

        return {
            success: true,
            message: `Cliente ${customer.name} desbloqueado com sucesso!`
        };
    }
);

/**
 * Desconecta (kick) uma sessão ativa do cliente no Radius
 */
export const kickCustomerConnectionAction = protectedAction(
    ["ISP_ADMIN", "TECHNICIAN"],
    async (customerId: string) => {
        const context = await getTenantContext();
        if (!context?.tenantId) {
            throw new Error("Contexto de tenant não encontrado");
        }

        // Busca o cliente
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: {
                id: true,
                name: true,
            }
        });

        if (!customer) {
            throw new Error("Cliente não encontrado");
        }

        // Busca sessão ativa
        const activeSession = await prisma.radAcct.findFirst({
            where: {
                username: customer.id,
                acctstoptime: null,
            },
            orderBy: {
                acctstarttime: 'desc'
            },
            select: {
                acctuniqueid: true,
                framedipaddress: true,
                nasipaddress: true,
            }
        });

        if (!activeSession) {
            throw new Error("Cliente não possui sessão ativa");
        }

        // Busca o NAS para executar o comando
        const nas = await prisma.nas.findFirst({
            where: {
                tenantId: context.tenantId,
                nasname: activeSession.nasipaddress,
            }
        });

        if (!nas) {
            throw new Error("Concentrador (NAS) não encontrado");
        }

        // Executa comando para desconectar o cliente via PPP
        // Busca a interface PPP ativa do cliente
        const pppInterfaces = await MikrotikService.executeCommand(
            nas.id,
            '/interface/pppoe-server/print',
            [
                `?remote-address=${activeSession.framedipaddress}`,
                `?running=yes`
            ]
        ) as Array<{ '.id': string; 'name': string }>;

        if (pppInterfaces && pppInterfaces.length > 0) {
            const interfaceId = pppInterfaces[0]['.id'];

            // Remove a interface PPP (kick)
            await MikrotikService.executeCommand(
                nas.id,
                '/interface/pppoe-server/remove',
                [`=.id=${interfaceId}`]
            );

            return {
                success: true,
                message: `Conexão de ${customer.name} desconectada com sucesso!`
            };
        }

        throw new Error("Interface PPP ativa não encontrada");
    }
);

/**
 * Retorna logs do Radius para um cliente específico
 */
export const getCustomerRadiusLogsAction = protectedAction(
    ["ISP_ADMIN", "TECHNICIAN"],
    async (input: { customerId: string; limit?: number }) => {
        const context = await getTenantContext();
        if (!context?.tenantId) {
            throw new Error("Contexto de tenant não encontrado");
        }

        const { customerId, limit = 50 } = input;

        // Busca o cliente
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: {
                id: true,
                name: true,
            }
        });

        if (!customer) {
            throw new Error("Cliente não encontrado");
        }

        // Busca logs de accounting (sessões)
        const accountingLogs = await prisma.radAcct.findMany({
            where: {
                username: customer.id,
            },
            orderBy: {
                acctstarttime: 'desc'
            },
            take: limit,
            select: {
                radacctid: true,
                acctsessionid: true,
                acctstarttime: true,
                acctstoptime: true,
                acctinputoctets: true,
                acctoutputoctets: true,
                framedipaddress: true,
                nasipaddress: true,
                acctterminatecause: true,
                acctsessiontime: true,
            }
        });

        // Formata os logs
        const formattedLogs = accountingLogs.map(log => ({
            id: log.radacctid.toString(),
            sessionId: log.acctsessionid,
            startTime: log.acctstarttime,
            stopTime: log.acctstoptime,
            duration: log.acctsessiontime || 0,
            downloadBytes: log.acctinputoctets || BigInt(0),
            uploadBytes: log.acctoutputoctets || BigInt(0),
            ipAddress: log.framedipaddress || 'N/A',
            nasIp: log.nasipaddress,
            terminateCause: log.acctterminatecause || 'N/A',
            isActive: !log.acctstoptime,
        }));

        return {
            success: true,
            customer: {
                id: customer.id,
                name: customer.name,
            },
            logs: formattedLogs,
            totalLogs: formattedLogs.length,
        };
    }
);
