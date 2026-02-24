"use server";

import { prisma } from "@/lib/prisma";
import { protectedAction } from "@/lib/api/action-wrapper";
import * as z from "zod";
// import { NotificationTarget, NotificationType } from "@prisma/client";

// Workaround for undefined Enums from @prisma/client if generation failed
const NotificationType = {
    MODAL: "MODAL",
    TOAST: "TOAST",
    BANNER: "BANNER"
} as const;

const NotificationTarget = {
    ALL: "ALL",
    SPECIFIC: "SPECIFIC"
} as const;

// Schema for creating a notification
const createNotificationSchema = z.object({
    title: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
    message: z.string().min(10, "A mensagem deve ter pelo menos 10 caracteres"),
    imageUrl: z.string().optional(),
    type: z.nativeEnum(NotificationType),
    target: z.nativeEnum(NotificationTarget),
    targetIds: z.array(z.string()).optional(), // TenantIDs if specific
    expiresAt: z.date().optional(),
});

/**
 * Creates a new notification from SaaS Admin to ISPs (Tenants)
 */
export const createSaasNotificationAction = protectedAction(
    ["SUPER_ADMIN"],
    async (input, session) => {
        const data = createNotificationSchema.parse(input);

        const notification = await prisma.saasNotification.create({
            data: {
                title: data.title,
                message: data.message,
                imageUrl: data.imageUrl,
                type: data.type,
                target: data.target,
                // @ts-ignore - Prisma type sync issue
                targetIds: data.targetIds || [],
                expiresAt: data.expiresAt,
                isActive: true,
            },
        });

        

        // Revalidate paths if necessary, but this is global data usually fetched on mount
        return notification;
    }
);

/**
 * Fetches active notifications for the current ISP Admin (User)
 * - Filters by Target (ALL or Specific Tenant)
 * - Checks if already read by this specific User
 */
export const getMySaasNotificationsAction = protectedAction(
    ["ISP_ADMIN", "TECHNICIAN", "SUPER_ADMIN"],
    async (_, session) => {
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { id: true, tenantId: true },
        });

        if (!user || user.tenantId === null) {
            // Super Admins without tenant might see everything or nothing, assuming nothing for "inbox" context
            return [];
        }

        const today = new Date();

        // Find notifications that:
        // 1. Are Active
        // 2. Not Expired
        // 3. Target is ALL OR Target is My Tenant (included in targetIds)
        const notifications = await prisma.saasNotification.findMany({
            where: {
                isActive: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: today } }
                ],
                AND: [
                    {
                        OR: [
                            { target: "ALL" },
                            {
                                target: "SPECIFIC",
                                // @ts-ignore - Prisma type sync issue
                                targetIds: { has: user.tenantId }
                            }
                        ]
                    },
                    {
                        reads: {
                            none: {
                                userId: session.userId
                            }
                        }
                    }
                ]
            },
            orderBy: { createdAt: "desc" }
        });

        return notifications;
    }
);

/**
 * Marks a notification as read for the current user
 */
export const markSaasNotificationAsReadAction = protectedAction(
    ["ISP_ADMIN", "TECHNICIAN", "SUPER_ADMIN"],
    async (input: { notificationId: string }, session) => {
        const { notificationId } = input;

        await prisma.saasNotificationRead.create({
            data: {
                notificationId,
                userId: session.userId,
            },
        }).catch(err => {
            // Ignore duplicate key error safely
            if (!err.message.includes('Unique constraint')) {
                throw err;
            }
        });

        return { success: true };
    }
);

/**
 * List all notifications (for SaaS Admin management)
 */
export const getAllSaasNotificationsAction = protectedAction(
    ["SUPER_ADMIN"],
    async () => {
        return await prisma.saasNotification.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: { reads: true }
                }
            }
        });
    }
);

/**
 * Toggle active status or delete (SaaS Admin)
 */
export const toggleSaasNotificationStatusAction = protectedAction(
    ["SUPER_ADMIN"],
    async (input: { id: string, isActive: boolean }) => {
        return await prisma.saasNotification.update({
            where: { id: input.id },
            data: { isActive: input.isActive }
        });
    }
);
