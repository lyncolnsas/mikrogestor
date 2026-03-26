"use server"

import { protectedAction } from "@/lib/api/action-wrapper";
import { prisma } from "@/lib/prisma";
import { differenceInSeconds, formatDistanceStrict } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Busca o tempo de conexão atual de um cliente baseado nos logs do Radius (radacct)
 */
export const getCustomerUptimeAction = protectedAction(
    ["ISP_ADMIN", "SUBSCRIBER"],
    async (customerId: string, session) => {
        // No Radius, o username segue o padrão t{tenantId}_{customerId}
        // Mas o sistema as vezes simplifica. Vamos buscar o cliente para ter certeza.
        const customer = await prisma.customer.findUnique({
            where: { id: customerId }
        });

        if (!customer) return { online: false, uptime: "Cliente não encontrado" };

        // Username padrão no radacct: deve seguir o padrão t{tenantId}_{identificador}
        const identifier = customer.cpfCnpj || customer.id;
        const username = `t${session.tenantId}_${identifier}`;

        // Busca a sessão mais recente que não parou (stoptime é null)
        const activeSession = await prisma.radAcct.findFirst({
            where: {
                username: username,
                acctstoptime: null
            },
            orderBy: {
                acctstarttime: "desc"
            }
        });

        if (activeSession && activeSession.acctstarttime) {
            const now = new Date();
            const start = new Date(activeSession.acctstarttime);
            
            // Calcula a distância de tempo
            const uptime = formatDistanceStrict(start, now, { 
                locale: ptBR,
                addSuffix: false 
            });

            return {
                online: true,
                uptime: uptime,
                startTime: activeSession.acctstarttime,
                ip: activeSession.framedipaddress,
                mac: activeSession.callingstationid
            };
        }

        // Caso não haja sessão ativa, busca a última sessão finalizada para informar há quanto tempo caiu
        const lastSession = await prisma.radAcct.findFirst({
            where: { username: username },
            orderBy: { acctstoptime: "desc" }
        });

        if (lastSession && lastSession.acctstoptime) {
            const downtime = formatDistanceStrict(new Date(lastSession.acctstoptime), new Date(), {
                locale: ptBR,
                addSuffix: true
            });
            return { online: false, uptime: `Offline ${downtime}` };
        }

        return { online: false, uptime: "Sem histórico de conexão" };
    }
);
