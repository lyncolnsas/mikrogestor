"use server"

import { protectedAction } from "@/lib/api/action-wrapper"
import { withTenantDb } from "@/lib/auth-utils.server"

/**
 * Busca os dados de configuração bancária para renderizar o boleto no portal
 */
export const getBoletoConfigAction = protectedAction(
    ["SUBSCRIBER", "ISP_ADMIN"],
    async () => {
        return await withTenantDb(async (db) => {
            const config = await db.financialConfig.findFirst();
            if (!config || !config.gatewayCredentials) return null;

            const gc = config.gatewayCredentials as any;
            if (gc.cb?.enabled) {
                return {
                    beneficiario: {
                        nome: "SEU PROVEDOR LTDA", // Em produção, buscar do Tenant/Empresa
                        documento: "00.000.000/0001-00",
                        agencia: gc.cb.agencia,
                        conta: gc.cb.conta,
                        dvConta: gc.cb.dvConta,
                        carteira: gc.cb.carteira,
                        convenio: gc.cb.convenio,
                    },
                    banco: gc.cb.bank // BB, SICOOB, etc.
                };
            }
            return null;
        });
    }
);
