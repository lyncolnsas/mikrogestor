"use server"

import { prisma } from "@/lib/prisma";
import { protectedAction } from "@/lib/api/action-wrapper";
import { RadiusService } from "@/modules/saas/services/radius.service";
import * as z from "zod";
import { revalidatePath } from "next/cache";
import { withTenantDb } from "@/lib/auth-utils.server";
import crypto from "node:crypto";

import { generateCpf, generateRandomEmail, generateRandomPassword, validateCpf } from "@/lib/generators";

const customerSchema = z.object({
    name: z.string().min(3, "Nome muito curto"),
    cpfCnpj: z.string().optional().or(z.literal("")).or(z.null()),
    phone: z.string().min(10, "Telefone é obrigatório e deve ser válido"), // Mandatory
    email: z.string().optional().or(z.literal("")).or(z.null()),
    planName: z.string().min(1, "O plano é obrigatório"), // Mandatory
    downloadSpeed: z.number().positive(),
    uploadSpeed: z.number().positive(),
    password: z.string().optional().or(z.literal("")).or(z.null()),
});

/**
 * Securely creates a customer and provisions their specialized network access
 */
export const createCustomerAction = protectedAction(
    ["ISP_ADMIN", "SUPER_ADMIN"],
    async (input, session) => {
        // 1. Validate input
        const data = customerSchema.parse(input);
        const name = data.name;

        // Validation and Generation
        let cpfCnpj = data.cpfCnpj;
        if (cpfCnpj && cpfCnpj.trim() !== "") {
            // Se fornecido, validar (removendo máscaras)
            const cleanCpf = cpfCnpj.replace(/\D/g, "");
            if (cleanCpf.length === 11 && !validateCpf(cleanCpf)) {
                throw new Error("O CPF informado é inválido ou está fora do padrão.");
            }
            cpfCnpj = cleanCpf;
        } else {
            cpfCnpj = generateCpf();

        }

        const email = (data.email && data.email.trim() !== "") ? data.email : generateRandomEmail(name);
        const password = (data.password && data.password.trim() !== "") ? data.password : generateRandomPassword();

        const phone = data.phone;
        const downloadSpeed = data.downloadSpeed;
        const uploadSpeed = data.uploadSpeed;

        // Use transaction to ensure both DB and Radius are in sync
        try {
            const result = await withTenantDb(async (db) => {
                // 1. Check if CPF/CNPJ already exists for this tenant
                const existingCustomer = await db.$queryRaw`
                    SELECT id FROM customers WHERE cpf_cnpj = ${cpfCnpj} LIMIT 1
                ` as any[];

                if (existingCustomer.length > 0) {
                    throw new Error("Este CPF/CNPJ já está cadastrado.");
                }

                // 2. Check SaaS Plan Limits
                const tenantWithPlan = await (prisma as any).tenant.findUnique({
                    where: { id: session.tenantId },
                    include: {
                        subscription: {
                            include: { plan: true }
                        }
                    }
                });

                const maxCustomers = tenantWithPlan?.subscription?.plan?.maxCustomers || 0;
                const currentCustomers = await db.customer.count();

                if (currentCustomers >= maxCustomers) {
                    throw new Error(`Limite de assinantes do seu plano (${maxCustomers}) atingido. Faça um upgrade para continuar.`);
                }

                // Find the plan to get PPPoE attributes - Use Raw SQL to bypass schema hardcoding
                const planResult = await db.$queryRaw`
                    SELECT * FROM plans WHERE name = ${data.planName} LIMIT 1
                ` as any[];
                const plan = planResult[0];

                return await db.$transaction(async (tx) => {
                    const { runWithTenant, getTenantContext } = await import("@/shared/tenancy/tenancy.context");
                    const context = getTenantContext();

                    return await runWithTenant({ ...context!, isInsideTransaction: true }, async () => {
                        // 3. Create the customer record using Raw SQL to bypass schema hardcoding
                        await tx.$executeRawUnsafe(`SET search_path = "${context!.schema}", "management", "radius", "public"`);

                        const customerResult = await tx.$queryRaw`
                            INSERT INTO customers (
                                id, name, cpf_cnpj, phone, address, status, plan_id, radius_password, email, "createdAt", "updatedAt"
                            ) VALUES (
                                ${crypto.randomUUID()}::uuid, ${name}, ${cpfCnpj}, ${phone}, ${JSON.stringify({})}::jsonb, 
                                'ACTIVE', ${plan?.id || null}::uuid, ${password}, ${email}, NOW(), NOW()
                            ) RETURNING *
                        ` as any[];

                        const customer = customerResult[0];
                        if (!customer) throw new Error("Falha ao criar assinante no banco de dados.");

                        // New Rule: Login is t{tenantId}_{CPF} and Password is CPF
                        const radiusUsername = `t${session.tenantId}_${customer.cpf_cnpj}`;
                        const radiusPassword = customer.cpf_cnpj;

                        await RadiusService.syncCustomer(session.tenantId!, {
                            id: customer.id,
                            radiusPassword: radiusPassword,
                            cpfCnpj: customer.cpf_cnpj
                        }, {
                            upload: uploadSpeed,
                            download: downloadSpeed,
                            remoteIpPool: plan?.remoteIpPool || undefined
                        }, tx);

                        // 4. Sync to all associated MikroTiks (NAS) for redundancy
                        try {
                            const nasList = await (prisma as any).nas.findMany({
                                where: { tenantId: session.tenantId }
                            });

                            const { MikrotikService } = await import("@/modules/saas/services/mikrotik.service");

                            for (const nas of nasList) {
                                await MikrotikService.upsertSecret(nas.id, {
                                    username: radiusUsername,
                                    password: radiusPassword,
                                    planName: data.planName,
                                    remoteIpPool: plan?.remoteIpPool || undefined
                                }).catch(err => console.warn(`[CustomerSync] Failed to sync to NAS ${nas.nasname}:`, err.message));
                            }
                        } catch (err) {
                            console.error("[CustomerSync] Global sync error:", err);
                        }

                        return customer;
                    });
                }, { timeout: 30000 });
            });



            // Auto Backup Trigger (ISP Level)
            try {
                const { BackupService } = await import("@/modules/saas/services/backup.service");
                const customerName = (result as any).name || data.name;
                await BackupService.createBackup(`Auto: Novo Assinante ISP (${customerName})`);
            } catch (e) {
                console.error("Failed to create auto-backup:", e);
            }

            revalidatePath("/customers");
            return result;
        } catch (error: any) {
            console.error("[createCustomerAction] Error:", error);

            // Personalizar mensagens de erro comuns
            if (error.message?.includes("23505") || error.message?.includes("already exists")) {
                throw new Error("Este CPF/CNPJ já está cadastrado.");
            }

            throw error;
        }
    }
);

/**
 * Fetches all customers for the current tenant
 */
export const getCustomersAction = protectedAction(
    ["ISP_ADMIN", "SUPER_ADMIN"],
    async (_, session) => {
        return await withTenantDb(async (db) => {
            const customers = await db.customer.findMany({
                include: {
                    plan: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return customers.map(c => ({
                id: c.id,
                name: c.name,
                cpfCnpj: c.cpfCnpj,
                status: c.status,
                email: c.email,
                radiusPassword: c.radiusPassword,
                radiusUsername: c.cpfCnpj ? `t${session.tenantId}_${c.cpfCnpj}` : `t${session.tenantId}_${c.id}`,
                plan: c.plan ? {
                    id: c.plan.id,
                    name: c.plan.name,
                    price: Number(c.plan.price || 0),
                    download: Number(c.plan.download || 0),
                    upload: Number(c.plan.upload || 0)
                } : null
            }));
        });
    }
);

/**
 * Fetches a single customer by ID with detailed information
 */
export const getCustomerAction = protectedAction(
    ["ISP_ADMIN", "SUPER_ADMIN"],
    async (customerId: string, session) => {
        return await withTenantDb(async (db) => {
            const customer = await db.customer.findUnique({
                where: { id: customerId },
                include: {
                    plan: true
                }
            });

            if (!customer) throw new Error("Assinante não encontrado.");

            return {
                id: customer.id,
                name: customer.name,
                cpfCnpj: customer.cpfCnpj,
                status: customer.status,
                email: customer.email,
                phone: customer.phone,
                radiusPassword: customer.radiusPassword,
                radiusUsername: customer.cpfCnpj ? `t${session.tenantId}_${customer.cpfCnpj}` : `t${session.tenantId}_${customer.id}`,
                createdAt: customer.createdAt,
                plan: customer.plan ? {
                    id: customer.plan.id,
                    name: customer.plan.name,
                    price: Number(customer.plan.price || 0),
                    download: Number(customer.plan.download || 0),
                    upload: Number(customer.plan.upload || 0)
                } : null
            };
        });
    }
);

/**
 * Fetches network consumption logs for a specific customer
 */
export const getCustomerConsumptionAction = protectedAction(
    ["ISP_ADMIN", "SUPER_ADMIN"],
    async (customerId: string, session) => {
        return await withTenantDb(async (db) => {
            const customer = await db.customer.findUnique({
                where: { id: customerId }
            });

            if (!customer) throw new Error("Assinante não encontrado.");

            const radiusUsername = customer.cpfCnpj ? `t${session.tenantId}_${customer.cpfCnpj}` : `t${session.tenantId}_${customer.id}`;

            // Query RadAcct for usage
            const logs = await prisma.radAcct.findMany({
                where: { username: radiusUsername },
                orderBy: { acctstarttime: 'desc' },
                take: 20,
                select: {
                    radacctid: true,
                    acctstarttime: true,
                    acctstoptime: true,
                    acctsessiontime: true,
                    acctinputoctets: true,
                    acctoutputoctets: true,
                    framedipaddress: true,
                    acctterminatecause: true
                }
            });

            return logs.map(l => ({
                id: l.radacctid.toString(),
                start: l.acctstarttime,
                end: l.acctstoptime,
                duration: l.acctsessiontime || 0,
                download: Number(l.acctinputoctets || 0),
                upload: Number(l.acctoutputoctets || 0),
                ip: l.framedipaddress,
                cause: l.acctterminatecause
            }));
        });
    }
);

/**
 * Alterna o status do cliente (Ativo/Bloqueado) e sincroniza com o Radius
 */
export const toggleCustomerStatusAction = protectedAction(
    ["ISP_ADMIN", "SUPER_ADMIN"],
    async ({ customerId, status }: { customerId: string, status: "ACTIVE" | "BLOCKED" }, session) => {
        const result = await withTenantDb(async (db) => {
            return await db.$transaction(async (tx) => {
                const { runWithTenant, getTenantContext } = await import("@/shared/tenancy/tenancy.context");
                const context = getTenantContext();

                return await runWithTenant({ ...context!, isInsideTransaction: true }, async () => {
                    // 1. Atualiza no banco do tenant usando Raw SQL
                    const customerResult = await tx.$queryRaw`
                        UPDATE customers 
                        SET status = ${status}, "updatedAt" = NOW()
                        WHERE id = ${customerId}
                        RETURNING *
                    ` as any[];

                    const customer = customerResult[0];
                    if (!customer) throw new Error("Assinante não encontrado.");

                    // 2. Sincroniza com o Radius para aplicar/remover bloqueio
                    const radiusUsername = customer.cpfCnpj ? `t${session.tenantId}_${customer.cpfCnpj}` : `t${session.tenantId}_${customer.id}`;

                    await RadiusService.syncStatus(radiusUsername, status, tx);

                    return customer;
                });
            }, { timeout: 30000 });
        });

        revalidatePath("/customers");
        return result;
    }
);

/**
 * Exclui permanentemente um assinante e limpa seus acessos (Radius/MikroTik)
 */
export const deleteCustomerAction = protectedAction(
    ["ISP_ADMIN", "SUPER_ADMIN"],
    async (customerId: string, session) => {
        try {
            const result = await withTenantDb(async (db) => {
                // 1. Busca o cliente para garantir que existe e obter dados necessários
                const customer = await db.customer.findUnique({
                    where: { id: customerId }
                });

                if (!customer) {
                    throw new Error("Assinante não encontrado.");
                }

                // 2. Executa a limpeza em transação
                return await db.$transaction(async (tx) => {
                    const { runWithTenant, getTenantContext } = await import("@/shared/tenancy/tenancy.context");
                    const context = getTenantContext();

                    return await runWithTenant({ ...context!, isInsideTransaction: true }, async () => {
                        // A. Remove do Radius (Síncrono)
                        const radiusUsername = customer.cpfCnpj ? `t${session.tenantId}_${customer.cpfCnpj}` : `t${session.tenantId}_${customer.id}`;
                        await RadiusService.removeCustomer(radiusUsername, tx).catch(err => {
                            console.warn(`[DeleteCustomer] Failed to de-provision from Radius:`, err.message);
                        });

                        // B. Remove do MikroTik (Redundância NAS)
                        try {
                            const nasList = await (prisma as any).nas.findMany({
                                where: { tenantId: session.tenantId }
                            });

                            const { MikrotikService } = await import("@/modules/saas/services/mikrotik.service");

                            for (const nas of nasList) {
                                await MikrotikService.removeSecret(nas.id, radiusUsername)
                                    .catch(err => console.warn(`[DeleteCustomer] Failed to remove secret from NAS ${nas.nasname}:`, err.message));
                            }
                        } catch (err) {
                            console.error("[DeleteCustomer] Global NAS sync error:", err);
                        }

                        // C. Exclui o registro no banco do tenant usando Raw SQL
                        await tx.$queryRaw`DELETE FROM customers WHERE id = ${customerId}`;

                        return { success: true, message: `Assinante ${customer.name} excluído com sucesso.` };
                    });
                }, { timeout: 30000 });
            });

            revalidatePath("/customers");
            return result;
        } catch (error: any) {
            console.error("[deleteCustomerAction] Error:", error);
            throw error;
        }
    }
);
