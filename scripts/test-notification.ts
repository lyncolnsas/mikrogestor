import { prisma } from "../src/lib/prisma";
import { NotificationType, NotificationTarget } from "@prisma/client";

async function test() {
    try {
        console.log("Testing SaasNotification creation...");
        const notification = await prisma.saasNotification.create({
            data: {
                title: "Test Notification",
                message: "This is a test message for debugging.",
                type: NotificationType.MODAL,
                target: NotificationTarget.ALL,
                targetIds: [],
                isActive: true
            }
        });
        console.log("Success:", notification);
    } catch (error) {
        console.error("Error creating notification:", error);
    } finally {
        await prisma.$disconnect();
    }
}

test();
