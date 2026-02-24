import { TenantNotificationManager } from "@/components/notifications/tenant-notification-manager";
import { getSentTenantNotificationsAction } from "@/modules/customers/actions/notification.actions";

export const dynamic = "force-dynamic";

export default async function IspNotificationsPage() {
    const response = await getSentTenantNotificationsAction();

    // Handling the response from action wrapper
    const initialNotifications = response.data || [];

    return (
        <div className="space-y-6">
            <TenantNotificationManager initialNotifications={initialNotifications} />
        </div>
    );
}
