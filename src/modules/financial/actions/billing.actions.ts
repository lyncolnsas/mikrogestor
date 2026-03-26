"use server";

import { BillingService } from "../billing.service";
import { getCurrentTenant, withTenantDb } from "@/lib/auth-utils.server";
import { revalidatePath } from "next/cache";

// Definições de tipo para configuração de Gateway
export type GatewayMethod = "PIX" | "BOLETO" | "CREDIT_CARD";

export interface GatewayConfig {
    asaas?: { enabled: boolean; apiKey?: string; methods?: GatewayMethod[]; webhookToken?: string };
    mercadopago?: { enabled: boolean; accessToken?: string; methods?: GatewayMethod[] };
    pagseguro?: { enabled: boolean; token?: string; email?: string; methods?: GatewayMethod[] };
    efi?: { enabled: boolean; clientId?: string; clientSecret?: string; sandbox: boolean; certificate?: string; methods?: GatewayMethod[] };
    iugu?: { enabled: boolean; apiKey?: string; accountId?: string; methods?: GatewayMethod[] };
    galaxpay?: { enabled: boolean; hash?: string; id?: string; methods?: GatewayMethod[] };
    gatewayIdx?: string;
}


export async function generateInvoicesAction() {
    const context = await getCurrentTenant();
    if (!context) throw new Error("Unauthorized");

    const billingService = new BillingService();

    try {
        const result = await billingService.generateMonthlyInvoices(context.tenantId);
        revalidatePath("/financial/dashboard");
        return { success: true, generated: result.generated };
    } catch (error: unknown) {
        console.error("[Billing Action] Error:", error);
        return { error: "Erro ao gerar faturas." };
    }
}

import { protectedAction } from "@/lib/api/action-wrapper";
import * as z from "zod";

const configSchema = z.object({
    interestRate: z.coerce.number().min(0),
    penaltyAmount: z.coerce.number().min(0),
    gracePeriod: z.coerce.number().min(0),
    autoBlock: z.boolean(),
    autoUnblock: z.boolean(),
    // Estrutura de Configuração de Gateway Atualizada
    gatewayConfig: z.object({
        asaas: z.object({
            enabled: z.boolean(),
            apiKey: z.string().optional(),
            webhookToken: z.string().optional(),
            methods: z.array(z.string()).optional() // PIX, BOLETO, CREDIT_CARD
        }).optional(),
        mercadopago: z.object({
            enabled: z.boolean(),
            accessToken: z.string().optional(),
            methods: z.array(z.string()).optional()
        }).optional(),
        pagseguro: z.object({
            enabled: z.boolean(),
            token: z.string().optional(),
            email: z.string().optional(),
            methods: z.array(z.string()).optional()
        }).optional(),
        efi: z.object({
            enabled: z.boolean(),
            clientId: z.string().optional(),
            clientSecret: z.string().optional(),
            certificate: z.string().optional(), // base64 cert
            sandbox: z.boolean().default(false),
            methods: z.array(z.string()).optional()
        }).optional(),
        iugu: z.object({
            enabled: z.boolean(),
            apiKey: z.string().optional(),
            accountId: z.string().optional(),
            methods: z.array(z.string()).optional()
        }).optional(),
        galaxpay: z.object({
            enabled: z.boolean(),
            hash: z.string().optional(),
            id: z.string().optional(),
            methods: z.array(z.string()).optional()
        }).optional(),
    }).optional(),
});

export const getFinancialConfigAction = protectedAction(
    ["ISP_ADMIN"],
    async () => {
        return await withTenantDb(async (db) => {
            const config = await db.financialConfig.findFirst();
            if (!config) return null;

            const credentials = (config.gatewayCredentials as unknown as GatewayConfig) || {};

            return {
                id: config.id,
                interestRate: Number(config.interestRate),
                penaltyAmount: Number(config.penaltyAmount),
                gracePeriod: config.gracePeriod,
                autoBlock: config.autoBlock,
                autoUnblock: config.autoUnblock,
                createdAt: config.createdAt,
                updatedAt: config.updatedAt,
                // Retornar dados específicos do gateway
                gatewayType: credentials.asaas?.enabled ? "ASAAS" : credentials.mercadopago?.enabled ? "MERCADOPAGO" : "NONE",
                gatewayConfig: credentials
            };
        });
    }
);

export const updateFinancialConfigAction = protectedAction(
    ["ISP_ADMIN"],
    async (input) => {
        const data = configSchema.parse(input);

        return await withTenantDb(async (db) => {
            const { gatewayConfig, ...rest } = data;

            const config = await db.financialConfig.findFirst();

            const newCredentials = gatewayConfig || {};

            if (config) {
                return await db.financialConfig.update({
                    where: { id: config.id },
                    data: {
                        ...rest,
                        gatewayCredentials: newCredentials
                    }
                });
            } else {
                return await db.financialConfig.create({
                    data: {
                        ...rest,
                        gatewayCredentials: newCredentials
                    }
                });
            }
        });
    }
);
