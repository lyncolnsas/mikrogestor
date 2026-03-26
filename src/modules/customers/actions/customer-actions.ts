"use server"

import { prisma } from "@/lib/prisma";
import { protectedAction } from "@/lib/api/action-wrapper";
import { RadiusService } from "@/modules/saas/services/radius.service";
import * as z from "zod";
import { revalidatePath } from "next/cache";
import { withTenantDb } from "@/lib/auth-utils.server";
import { validateCpf, generateCpf, generateRandomEmail, generateRandomPassword } from "@/lib/generators";

const customerSchema = z.object({
    name: z.string().min(3, "Nome muito curto"),
    cpfCnpj: z.string().optional().or(z.literal("")).or(z.null()),
    phone: z.string().min(10, "Telefone é obrigatório e deve ser válido"), // Mandatory
    email: z.string().optional().or(z.literal("")).or(z.null()),
    planName: z.string().min(1, "O plano é obrigatório"), // Mandatory
    downloadSpeed: z.number().positive(),
    uploadSpeed: z.number().positive(),
    password: z.string().optional().or(z.literal("")).or(z.null()),
    // Address Fields
    zipCode: z.string().optional().or(z.literal("")).or(z.null()),
    street: z.string().optional().or(z.literal("")).or(z.null()),
    number: z.string().optional().or(z.literal("")).or(z.null()),
    neighborhood: z.string().optional().or(z.literal("")).or(z.null()),
    city: z.string().optional().or(z.literal("")).or(z.null()),
    state: z.string().optional().or(z.literal("")).or(z.null()),
    complement: z.string().optional().or(z.literal("")).or(z.null()),
    nasId: z.coerce.number().optional().or(z.null()),
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

        try {
            const result = await withTenantDb(async (db) => {
                return await db.$transaction(async (tx) => {
                    const { runWithTenant, getTenantContext } = await import("@/shared/tenancy/tenancy.context");
                    const context = getTenantContext();

                    return await runWithTenant({ ...context!, isInsideTransaction: true }, async () => {
                        // 1. Check if CPF/CNPJ already exists for this tenant
                        const existingCustomer = await tx.customer.findUnique({
                            where: { cpfCnpj }
                        });

                        if (existingCustomer) {
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
                        const currentCustomers = await tx.customer.count();

                        if (currentCustomers >= maxCustomers) {
                            throw new Error(`Limite de assinantes do seu plano (${maxCustomers}) atingido. Faça um upgrade para continuar.`);
                        }

                        // Find the plan to get PPPoE attributes
                        const plan = await tx.plan.findFirst({
                            where: { name: data.planName }
                        });

                        // 3. Create the customer record using Prisma Client
                        const customer = await (tx.customer as any).create({
                            data: {
                                name,
                                cpfCnpj,
                                phone,
                                email,
                                zipCode: data.zipCode,
                                street: data.street,
                                number: data.number,
                                neighborhood: data.neighborhood,
                                city: data.city,
                                state: data.state,
                                complement: data.complement,
                                radiusPassword: password,
                                status: 'ACTIVE' as any,
                                planId: plan?.id,
                                nasId: data.nasId
                            }
                        });

                        if (!customer) throw new Error("Falha ao criar assinante no banco de dados.");

                        // New Rule: Login is t{tenantId}_{CPF} and Password is CPF
                        const radiusUsername = `t${session.tenantId}_${customer.cpfCnpj}`;
                        const radiusPassword = customer.cpfCnpj;

                        await RadiusService.syncCustomer(session.tenantId!, {
                            id: customer.id,
                            radiusPassword: radiusPassword,
                            cpfCnpj: customer.cpfCnpj,
                            nasId: customer.nasId
                        }, {
                            upload: data.uploadSpeed,
                            download: data.downloadSpeed,
                            remoteIpPool: plan?.remoteIpPool || undefined
                        }, tx);

                        // 4. Sync to associated MikroTik (NAS) - Only defined NAS or all for fallback
                        try {
                            const nasFilter = customer.nasId ? { id: customer.nasId } : { tenantId: session.tenantId };
                            const nasList = await (prisma as any).nas.findMany({
                                where: nasFilter
                            });

                            const { MikrotikService } = await import("@/modules/saas/services/mikrotik.service");

                            for (const nas of nasList) {
                                await MikrotikService.upsertSecret(nas.id, {
                                    username: radiusUsername,
                                    password: radiusPassword,
                                    planName: data.planName,
                                    remoteIpPool: plan?.remoteIpPool || undefined
                                }).catch(() => {});
                            }
                        } catch (err) {}

                        return customer;
                    });
                }, { timeout: 30000 });
            });

            revalidatePath("/customers");
            return result;
        } catch (error: any) {
            console.error("[createCustomerAction] Error:", error);
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
                zipCode: c.zipCode,
                street: c.street,
                number: c.number,
                neighborhood: c.neighborhood,
                city: c.city,
                state: c.state,
                complement: c.complement,
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
                zipCode: customer.zipCode,
                street: customer.street,
                number: customer.number,
                neighborhood: customer.neighborhood,
                city: customer.city,
                state: customer.state,
                complement: customer.complement,
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
                take: 20
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
                    const customer = await tx.customer.update({
                        where: { id: customerId },
                        data: { 
                            status: status as any,
                            updatedAt: new Date()
                        }
                    });

                    if (!customer) throw new Error("Assinante não encontrado.");

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
                return await db.$transaction(async (tx) => {
                    const { runWithTenant, getTenantContext } = await import("@/shared/tenancy/tenancy.context");
                    const context = getTenantContext();

                    return await runWithTenant({ ...context!, isInsideTransaction: true }, async () => {
                        const customer = await tx.customer.findUnique({ where: { id: customerId } });
                        if (!customer) throw new Error("Assinante não encontrado.");

                        const radiusUsername = customer.cpfCnpj ? `t${session.tenantId}_${customer.cpfCnpj}` : `t${session.tenantId}_${customer.id}`;
                        await RadiusService.removeCustomer(radiusUsername, tx).catch(() => {});

                        try {
                            const nasList = await (prisma as any).nas.findMany({
                                where: { tenantId: session.tenantId }
                            });
                            const { MikrotikService } = await import("@/modules/saas/services/mikrotik.service");
                            for (const nas of nasList) {
                                await MikrotikService.removeSecret(nas.id, radiusUsername).catch(() => {});
                            }
                        } catch (err) {}

                        await tx.customer.delete({ where: { id: customerId } });
                        return { success: true };
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

/**
 * Updates an existing customer and re-provisions access if necessary
 */
export const updateCustomerAction = protectedAction(
    ["ISP_ADMIN", "SUPER_ADMIN"],
    async (input: any, session) => {
        const { id, ...data } = input;
        
        try {
            const result = await withTenantDb(async (db) => {
                return await db.$transaction(async (tx) => {
                    const { runWithTenant, getTenantContext } = await import("@/shared/tenancy/tenancy.context");
                    const context = getTenantContext();

                    return await runWithTenant({ ...context!, isInsideTransaction: true }, async () => {
                        // 1. Check if customer exists inside transaction
                        const customer = await tx.customer.findUnique({
                            where: { id },
                            include: { plan: true }
                        });

                        if (!customer) throw new Error("Assinante não encontrado.");

                        // 2. Find the new plan if changed
                        let planId = customer.planId;
                        if (data.planName && data.planName !== customer.plan?.name) {
                            const planResult = await tx.plan.findFirst({
                                where: { name: data.planName }
                            });
                            if (planResult) {
                                planId = planResult.id;
                            }
                        }

                        // 3. Update the customer record
                        const updatedCustomer = await (tx.customer as any).update({
                            where: { id },
                            data: {
                                name: data.name,
                                phone: data.phone,
                                email: data.email,
                                zipCode: data.zipCode,
                                street: data.street,
                                number: data.number,
                                neighborhood: data.neighborhood,
                                city: data.city,
                                state: data.state,
                                complement: data.complement,
                                radiusPassword: data.password || customer.radiusPassword,
                                planId: planId,
                                nasId: data.nasId,
                                updatedAt: new Date()
                            }
                        });


                        // 4. Re-sync with Radius
                        const radiusUsername = updatedCustomer.cpfCnpj ? `t${session.tenantId}_${updatedCustomer.cpfCnpj}` : `t${session.tenantId}_${updatedCustomer.id}`;
                        
                        await RadiusService.syncCustomer(session.tenantId!, {
                            id: updatedCustomer.id,
                            radiusPassword: updatedCustomer.radiusPassword!,
                            cpfCnpj: updatedCustomer.cpfCnpj,
                            nasId: (updatedCustomer as any).nasId
                        }, {
                            upload: data.uploadSpeed || 0,
                            download: data.downloadSpeed || 0
                        }, tx);

                        // 5. Update MikroTik if needed
                        try {
                            const nasList = await (prisma as any).nas.findMany({
                                where: { tenantId: session.tenantId }
                            });
                            const { MikrotikService } = await import("@/modules/saas/services/mikrotik.service");
                            for (const nas of nasList) {
                                await MikrotikService.upsertSecret(nas.id, {
                                    username: radiusUsername,
                                    password: updatedCustomer.radiusPassword!,
                                    planName: data.planName,
                                }).catch(() => {});
                            }
                        } catch (err) {}

                        return updatedCustomer;
                    });
                }, { timeout: 30000 });
            });

            revalidatePath(`/customers/${id}`);
            revalidatePath("/customers");
            return result;
        } catch (error: any) {
            console.error("[updateCustomerAction] Error:", error);
            throw error;
        }
    }
);

/**
 * Force-syncs a customer's profile across all systems (RADIUS + Local Cache)
 */
export const reSyncCustomerAction = protectedAction(
    ["ISP_ADMIN", "SUPER_ADMIN"],
    async (customerId: string, session) => {
        return await withTenantDb(async (db) => {
            const customer = await db.customer.findUnique({
                where: { id: customerId },
                include: { plan: true }
            });

            if (!customer) throw new Error("Assinante não encontrado.");

            const upload = Number(customer.plan?.upload || 0);
            const download = Number(customer.plan?.download || 0);

            await RadiusService.syncCustomer(session.tenantId!, {
                id: customer.id,
                radiusPassword: customer.radiusPassword || "",
                cpfCnpj: customer.cpfCnpj,
                nasId: customer.nasId,
                status: customer.status as any
            }, {
                upload,
                download,
                remoteIpPool: customer.plan?.remoteIpPool || undefined
            });

            return { success: true };
        });
    }
);

/**
 * Sends a CoA (Disconnect Packet) to the router to force a session refresh
 */
export const disconnectCustomerAction = protectedAction(
    ["ISP_ADMIN", "SUPER_ADMIN"],
    async (customerId: string, session) => {
        return await withTenantDb(async (db) => {
            const customer = await db.customer.findUnique({
                where: { id: customerId },
                include: { nas: true }
            });

            if (!customer || !customer.nas) {
                throw new Error("Assinante ou Concentrador não encontrado para esta operação.");
            }

            const username = customer.cpfCnpj ? `t${session.tenantId}_${customer.cpfCnpj}` : `t${session.tenantId}_${customer.id}`;
            const nasIp = (customer.nas as any).nasname;
            const secret = (customer.nas as any).secret;

            await RadiusService.disconnectUser(username, nasIp, secret);
            
            return { success: true };
        });
    }
);
