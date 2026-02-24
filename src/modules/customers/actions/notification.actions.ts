"use server";
// Last Update: 2026-01-27 01:30 (Force Refresh)

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

// Schema for creating a notification for subscribers
const createTenantNotificationSchema = z.object({
    title: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
    message: z.string().min(10, "A mensagem deve ter pelo menos 10 caracteres"),
    imageUrl: z.string().optional(),
    type: z.nativeEnum(NotificationType),
    targetType: z.nativeEnum(NotificationTarget),
    targetId: z.string().optional(), // CustomerID if specific
    expiresAt: z.date().optional(),
});

/**
 * Creates a new notification from ISP Admin to Subscribers
 */
export const createTenantNotificationAction = protectedAction(
    ["ISP_ADMIN", "TECHNICIAN"],
    async (input, session) => {
        const data = createTenantNotificationSchema.parse(input);
        const tenantId = session.tenantId!;

        const notification = await prisma.tenantNotification.create({
            data: {
                tenantId,
                title: data.title,
                message: data.message,
                imageUrl: data.imageUrl,
                type: data.type,
                targetType: data.targetType,
                targetId: data.targetId,
                expiresAt: data.expiresAt,
                isActive: true,
            },
        });

        

        return notification;
    }
);

/**
 * Fetches notifications for a specific Subscriber (Customer)
 * NOTE: This action is typically called from the Subscriber Portal context.
 * The Session User here might be the "ISP Admin" looking at previews, OR a logged-in Subscriber.
 * 
 * Fetches notifications for the logged-in Subscriber
 */
export const getMyTenantNotificationsAction = async () => {
    const { getSession } = await import("@/lib/auth/session");
    const session = await getSession();

    if (!session || session.role !== "SUBSCRIBER" || !session.tenantId) {
        return { error: "Não autorizado" };
    }

    const customerId = session.userId;
    const tenantId = session.tenantId;

    const today = new Date();

    const notifications = await prisma.tenantNotification.findMany({
        where: {
            tenantId,
            isActive: true,
            OR: [
                { expiresAt: null },
                { expiresAt: { gt: today } }
            ],
            AND: [
                {
                    OR: [
                        { targetType: "ALL" },
                        { targetType: "SPECIFIC", targetId: customerId }
                    ]
                },
                {
                    reads: {
                        none: {
                            customerId: customerId
                        }
                    }
                }
            ]
        },
        orderBy: { createdAt: "desc" }
    });

    return { data: notifications };
};

/**
 * Marks a notification as read for a subscriber
 */
export const markTenantNotificationAsReadAction = async ({ notificationId }: { notificationId: string }) => {
    const { getSession } = await import("@/lib/auth/session");
    const session = await getSession();

    if (!session || session.role !== "SUBSCRIBER") return { error: "Não autorizado" };

    const customerId = session.userId;

    await prisma.tenantNotificationRead.create({
        data: {
            notificationId,
            customerId,
        },
    }).catch(err => {
        if (!err.message.includes('Unique constraint')) {
            throw err;
        }
    });
    return { success: true };
};

/**
 * List all notifications sent by this Tenant (For ISP Admin Dashboard)
 */
export const getSentTenantNotificationsAction = protectedAction(
    ["ISP_ADMIN", "TECHNICIAN"],
    async (_, session) => {
        return await prisma.tenantNotification.findMany({
            where: { tenantId: session.tenantId! },
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: { reads: true }
                }
            }
        });
    }
);

export const deleteTenantNotificationAction = protectedAction(
    ["ISP_ADMIN"],
    async (input: { id: string }, session) => {
        return await prisma.tenantNotification.delete({
            where: {
                id: input.id,
                tenantId: session.tenantId! // Security check
            }
        });
    }
);
