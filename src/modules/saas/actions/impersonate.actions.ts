"use server";

import { prisma } from "@/lib/prisma";
import { createSession, decrypt } from "@/lib/auth/session";
import { cookies } from "next/headers";

export async function impersonateTenantAction(tenantId: string) {
    try {
        // 1. Verify Requestor is SUPER_ADMIN
        const cookie = (await cookies()).get("session")?.value;
        const session = cookie ? await decrypt(cookie) : null;

        if (!session || session.role !== "SUPER_ADMIN") {
            throw new Error("Unauthorized: Only Super Admins can impersonate.");
        }

        // 2. Validate Tenant
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            include: {
                users: {
                    where: { role: "ISP_ADMIN" },
                    take: 1, // Get the first admin
                }
            }
        });

        if (!tenant) throw new Error("Tenant not found");
        if (tenant.users.length === 0) throw new Error("No ISP_ADMIN found for this tenant");

        const targetUser = tenant.users[0];

        // 3. Create Audit Log
        await (prisma as unknown as { saasAuditLog: { create: (args: unknown) => Promise<unknown> } }).saasAuditLog.create({
            data: {
                adminUserId: session.userId,
                targetTenantId: tenant.id,
                action: "IMPERSONATE_LOGIN",
                details: {
                    targetUserId: targetUser.id,
                    targetEmail: targetUser.email,
                    timestamp: new Date().toISOString(),
                }
            }
        });

        // 4. Create New Session (Impersonated)
        await createSession({
            userId: targetUser.id,
            email: targetUser.email,
            role: "ISP_ADMIN",
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            tenantStatus: (tenant as unknown as { status: string }).status as "ACTIVE" | "BLOCKED" | "PROVISIONING" | "CANCELLED",
            isImpersonated: true,
            originalAdminId: session.userId,
        });

        return { success: true };

    } catch (error: unknown) {
        console.error("Impersonation error:", error);
        return { error: error instanceof Error ? error.message : "Internal Error" };
    }
}

export async function stopImpersonationAction() {
    try {
        const cookie = (await cookies()).get("session")?.value;
        const session = cookie ? await decrypt(cookie) : null;

        if (!session || !session.isImpersonated || !session.originalAdminId) {
            throw new Error("Not currently impersonating.");
        }

        // 1. Find Original Admin
        const adminUser = await prisma.user.findUnique({
            where: { id: session.originalAdminId }
        });

        if (!adminUser) throw new Error("Original admin not found.");

        // 2. Restore Session
        await createSession({
            userId: adminUser.id,
            email: adminUser.email,
            role: "SUPER_ADMIN", // Assuming original was SUPER_ADMIN
            tenantId: undefined,
        });

        return { success: true };
    } catch (error: unknown) {
        console.error("Stop Impersonation error:", error);
        return { error: error instanceof Error ? error.message : "Internal Error" };
    }
}
