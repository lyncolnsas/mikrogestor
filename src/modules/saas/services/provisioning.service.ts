import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { SchemaService } from "@/shared/tenancy/schema.service";
import { VpnService } from "@/modules/saas/services/vpn.service";
import { runWithTenant } from "@/shared/tenancy/tenancy.context";
import { hashPassword } from "@/lib/auth/password";

export interface ProvisioningOptions {
    name: string;
    slug: string;
    adminEmail: string;
    adminPassword?: string; // Optional if existing user
    planId?: string;
    vpnServerId?: string; // Optional - manual VPN server selection
    financialConfig?: {
        interestRate: number;
        penaltyAmount: number;
        gracePeriod: number;
        autoBlock: boolean;
        autoUnblock: boolean;
    };
}

export class ProvisioningService {
    /**
     * Centralized provisioning flow for tenants
     */
    static async provision(options: ProvisioningOptions) {
        const { name, slug, adminEmail, adminPassword, planId, vpnServerId, financialConfig } = options;


        // 0. Pre-Verification: Ensure plan exists if provided
        let plan = null;
        if (planId) {
            plan = await prisma.saasPlan.findUnique({ where: { id: planId } });
            if (!plan) {
                console.error(`[Provisioning] Plan ${planId} not found!`);
                throw new Error(`O plano selecionado (${planId}) não existe ou é inválido.`);
            }

        } else {

        }

        let logId = "";
        let tenantId = "";

        try {

            // 1. Initial Registration (Tenant, User, Log)
            // We use a dummy context to flag that we are inside a transaction
            const { tenant, log } = await runWithTenant({ tenantId: 'SYSTEM', schema: 'management', isInsideTransaction: true }, async () => {
                return await prisma.$transaction(async (tx) => {
                    // 1. Criar Registro do Tenant (management)

                    const newTenant = await tx.tenant.create({
                        data: {
                            name: name,
                            slug: slug,
                            status: 'PROVISIONING'
                        }
                    });
                    tenantId = newTenant.id;


                    // 2. Criar Log de Provisionamento

                    const newLog = await tx.tenantProvisioningLog.create({
                        data: {
                            tenantId: newTenant.id,
                            step: 'INITIALIZING',
                            details: 'Starting automated provisioning',
                            status: 'STARTED'
                        }
                    });


                    // Create Admin User if password provided (new account)
                    if (adminPassword) {

                        const hashedPassword = await hashPassword(adminPassword);
                        await tx.user.create({
                            data: {
                                email: adminEmail,
                                password: hashedPassword,
                                name: `${name} Admin`,
                                role: UserRole.ISP_ADMIN,
                                tenantId: newTenant.id
                            }
                        });

                    } else {

                        // Update existing user to link to this tenant and set role
                        await tx.user.update({
                            where: { email: adminEmail },
                            data: {
                                tenantId: newTenant.id,
                                role: UserRole.ISP_ADMIN
                            }
                        });

                    }

                    return { tenant: newTenant, log: newLog };
                }, { timeout: 30000 }); // Increase to 30s
            });

            logId = log.id;


            // 2. Schema Provisioning (Heavy Operation)
            await SchemaService.createTenantSchema(slug, logId);
            const schemaName = `tenant_${slug.replace(/-/g, '_')}`;




            // 6. Configurações Iniciais e Financeiro (Transação Tenant)
            await prisma.$transaction(async (tx) => {
                // Initialize Financial Configuration
                if (financialConfig) {

                    await runWithTenant({ tenantId: tenant.id, schema: schemaName, isInsideTransaction: true }, async () => {
                        // Must set search_path manually if skipping automated transaction wrapper
                        await tx.$executeRawUnsafe(`SET search_path = "${schemaName}", "management", "radius", "public"`);

                        await tx.financialConfig.create({
                            data: {
                                interestRate: financialConfig.interestRate,
                                penaltyAmount: financialConfig.penaltyAmount,
                                gracePeriod: financialConfig.gracePeriod,
                                autoBlock: financialConfig.autoBlock,
                                autoUnblock: financialConfig.autoUnblock,
                            }
                        });
                    });

                }

                if (planId) {
                    // Create Subscription
                    const trialDays = 30;
                    await tx.subscription.create({
                        data: {
                            tenantId: tenant.id,
                            planId: planId,
                            status: "TRIAL",
                            currentPeriodStart: new Date(),
                            currentPeriodEnd: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
                        }
                    });
                } else {
                }
            }, { timeout: 60000 }); // Increase to 60s for external schema sync


            // 4. VPN & Radius NAS

            let vpnProvisioned = false;
            try {
                await VpnService.provisionForTenant(tenant.id, undefined, "Router Principal", "ROUTER", vpnServerId);
                vpnProvisioned = true;

            } catch (vpnError: any) {
                console.warn(`[Provisioning] VPN Warning for ${name}:`, vpnError.message);
                await prisma.tenantProvisioningLog.update({
                    where: { id: logId },
                    data: { details: `Completed with VPN warning: ${vpnError.message}` }
                });
            }

            // 5. Finalize Log and Tenant Status

            await prisma.tenant.update({
                where: { id: tenant.id },
                data: { status: 'ACTIVE' }
            });

            await prisma.tenantProvisioningLog.update({
                where: { id: logId },
                data: { status: "COMPLETED", step: "DONE", details: `Tenant provisioned successfully. VPN: ${vpnProvisioned ? 'YES' : 'NO'}` }
            });

            // Auto Backup Trigger
            try {

                const { BackupWorker } = await import("../workers/backup.worker");
                await BackupWorker.queue.add('create-backup', {
                    trigger: `Auto: Novo Cliente (${name})`
                });
            } catch (e) {
                console.error("Failed to queue auto-backup:", e);
            }


            return { tenant, vpnProvisioned };

        } catch (error: any) {
            console.error(`[TRACING: Provisioning] DEADLY ERROR for ${slug}:`, error);

            if (logId) {
                await prisma.tenantProvisioningLog.update({
                    where: { id: logId },
                    data: { status: "FAILED", step: "ERROR", details: error.message }
                });
            }

            throw error;
        }
    }
}
