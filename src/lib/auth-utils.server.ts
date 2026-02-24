"use server";

import { getSession } from "@/lib/auth/session";
import { prisma } from "./prisma";
import { runWithTenant } from "@/shared/tenancy/tenancy.context";
import pino from 'pino';

// Use pino-pretty only in development, plain JSON in production
const logger = pino(
    process.env.NODE_ENV === 'production'
        ? {
            level: process.env.LOG_LEVEL || 'info',
        }
        : {
            level: process.env.LOG_LEVEL || 'info',
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true
                }
            }
        }
);

const logToFile = (msg: string) => {
    logger.info(msg);
};

/**
 * Resolves the current tenant context from the auth cookie.
 */
export async function getCurrentTenant() {
    const session = await getSession();
    if (!session) {
        logToFile("[AuthDebug] No session found");
        return null;
    }
    if (!session.tenantId) {
        logToFile("[AuthDebug] Session found but no tenantId. User role: " + session.role);
        return null;
    }

    try {
        const payload = session; // session acts as payload

        // Fetch tenant slug to build schema name
        const tenant = await prisma.tenant.findUnique({
            where: { id: payload.tenantId },
            select: { slug: true }
        });

        if (!tenant) {
            logToFile("[AuthDebug] Tenant not found in DB for ID: " + payload.tenantId);
            return null;
        }

        return {
            tenantId: payload.tenantId!,
            schema: `tenant_${tenant.slug.replace(/-/g, '_')}`
        };
    } catch (error: unknown) {
        logToFile("[AuthDebug] Error in getCurrentTenant: " + (error instanceof Error ? error.message : String(error)));
        throw error;
    }
}

/**
 * Executes a database query within the context of the current tenant.
 * Uses the tenancy extension to handle schema switching.
 */
export async function withTenantDb<T>(callback: (db: typeof prisma) => Promise<T>): Promise<T> {
    const context = await getCurrentTenant();
    if (!context) {
        throw new Error("Unauthorized or Tenant context missing");
    }

    return runWithTenant(context, () => callback(prisma));
}
