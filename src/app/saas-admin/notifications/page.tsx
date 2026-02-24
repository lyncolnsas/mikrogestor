import { SaasNotificationManager } from "@/components/notifications/saas-notification-manager";
import { getAllSaasNotificationsAction } from "@/modules/saas/actions/notification.actions";

export const dynamic = "force-dynamic";

export default async function SaasNotificationsPage() {
    const response = await getAllSaasNotificationsAction();

    // Handling the response from action wrapper
    const initialNotifications = response.data || [];

    return (
        <div className="space-y-6">
            <SaasNotificationManager initialNotifications={initialNotifications} />
        </div>
    );
}
