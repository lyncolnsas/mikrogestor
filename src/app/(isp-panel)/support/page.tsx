import { SupportClientPage } from "./support-client-page";
import { getSupportTicketsAction } from "@/modules/customers/actions/support.actions";

export default async function SupportPage() {
    // 1. Fetch data on Server
    const tickets = await getSupportTicketsAction();

    return <SupportClientPage initialTickets={tickets} />;
}
