
import { getCustomersAction } from "@/modules/customers/actions/customer-actions"
import { CreateInvoiceForm } from "./create-invoice-form"

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
    const customersRes = await getCustomersAction()
    const customers = customersRes.data || []

    return (
        <div className="p-8 max-w-5xl mx-auto animate-in fade-in duration-500">
            <CreateInvoiceForm customers={customers} />
        </div>
    )
}
