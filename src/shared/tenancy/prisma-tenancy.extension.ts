import { PrismaClient } from '@prisma/client';
import { getTenantContext } from './tenancy.context';

/**
 * Extensão do Prisma para suporte a multi-tenancy via Schemas do PostgreSQL.
 * Define o search_path automaticamente baseado no contexto do tenant.
 */

/**
 * Shared logic for tenancy schema switching
 */
async function handleTenancy(model: string | undefined, operation: string, args: any, query: any) {
    const context = getTenantContext();
    const prisma = (handleTenancy as any)._prisma as PrismaClient;

    // 1. Recursion Check via Context
    if (context?.isInsideTransaction) {
        return query(args);
    }

    // 2. Model Filtering (Shared vs Tenant)
    const managementModels = [
        'User', 'UserSecurityLog', 'Tenant', 'SaasPlan', 'Subscription', 'SaasAuditLog',
        'TenantProvisioningLog', 'SaasInvoice', 'VpnServer',
        'VpnServerStats', 'VpnTunnel', 'VpnTrafficLog',
        'LandingConfig', 'Testimonial', 'FAQ',
        'SaasNotification', 'SaasNotificationRead',
        'TenantNotification', 'TenantNotificationRead',
        'SystemSettings', 'PasswordResetToken', 'PasswordRecoveryRequest',
        'SaasPasswordResetToken', 'SaasPasswordRecoveryRequest', 'Nas'
    ];
    const radiusModels = [
        'RadCheck', 'RadReply', 'RadAcct', 'Radippool'
    ];

    const isSharedModel = managementModels.includes(model || '') || radiusModels.includes(model || '');

    // 3. Schema Selection
    // Shared models use the fixed management/radius search path.
    // Tenant models include the tenant-specific schema first.
    const schemaPath = (isSharedModel || !context?.schema)
        ? `"management", "radius", "public"`
        : `"${context.schema}", "management", "radius", "public"`;

    if (process.env.DEBUG_TENANCY) {
        
    }

    // 4. Transaction Wrapper - Pin the search_path to the connection
    // We ALWAYS wrap in a transaction to set search_path and prevent connection pool contamination.
    return prisma.$transaction(async (tx: any) => {
        try {
            await tx.$executeRawUnsafe(`SET search_path = ${schemaPath}`);
        } catch (err) {
            console.error(`[Tenancy] Failed to SET search_path for ${schemaPath}:`, err);
            throw err;
        }

        // Import runWithTenant dynamically to use updated context
        const { runWithTenant } = await import('./tenancy.context');

        // Execute original operation inside a new context flagged as 'isInsideTransaction'
        const result = await runWithTenant({ ...context!, isInsideTransaction: true }, async () => {
            if (model) {
                // Standardize to camelCase for safer property access on the transaction object
                const modelName = model.charAt(0).toLowerCase() + model.slice(1);

                // Safety check: Verify if the model exists in the current Prisma instance
                if (!(tx as any)[modelName]) {
                    throw new Error(`Prisma Client stale: Model "${modelName}" missing.`);
                }

                return (tx as any)[modelName][operation](args);
            }
            // Base client operations like $queryRaw / $executeRawUnsafe 
            const finalArgs = Array.isArray(args) ? args : [args];
            return (tx as any)[operation](...finalArgs);
        });

        return result;
    }, {
        timeout: 30000 // 30s default timeout for schema-switching transactions
    });
}

// Store prisma instance on the function for handleTenancy to access
(handleTenancy as any)._prisma = null;

// The main export remains as is but initializes the singleton ref
export function tenancyExtension(prisma: PrismaClient) {
    (handleTenancy as any)._prisma = prisma;
    return prisma.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }: any) {
                    return handleTenancy(model, operation, args, query);
                },
            },
            // ADDED: Capture top-level client operations
            $queryRaw: async ({ operation, args, query }: any) => handleTenancy(undefined, operation, args, query),
            $queryRawUnsafe: async ({ operation, args, query }: any) => handleTenancy(undefined, operation, args, query),
            $executeRaw: async ({ operation, args, query }: any) => handleTenancy(undefined, operation, args, query),
            $executeRawUnsafe: async ({ operation, args, query }: any) => handleTenancy(undefined, operation, args, query),
        },
    });
}
