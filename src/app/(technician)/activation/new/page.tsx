import { ActivationWizard } from "@/modules/technician/components/activation-wizard"
import { getPlans } from "@/modules/financial/actions/plan.actions"

export const dynamic = "force-dynamic";

export default async function NewActivationPage() {
    const plans = await getPlans();

    return (
        <div className="animate-in fade-in duration-700">
            <ActivationWizard
                customerId="mock-customer-id"
                customerName="Cliente Experimental"
                plans={plans.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    price: Number(p.price.toString()),
                    upload: p.upload,
                    download: p.download
                }))}
            />
        </div>
    )
}
