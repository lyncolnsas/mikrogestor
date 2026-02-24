"use client"

import { use } from "react"
import { CustomerProfileHeader } from "@/modules/customers/components/customer-profile-header"
import { CustomerProfileTabs } from "@/modules/customers/components/customer-profile-tabs"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { getCustomerAction } from "@/modules/customers/actions/customer-actions"
import { Skeleton } from "@/components/ui/skeleton"

export default function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)

    const { data: customer, isLoading, error } = useQuery({
        queryKey: ['customer', id],
        queryFn: async () => {
            const result = await getCustomerAction(id);
            if (result.error) throw new Error(result.error);
            return result.data;
        }
    })

    if (isLoading) {
        return (
            <div className="p-4 md:p-6 space-y-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        )
    }

    if (error || !customer) {
        return (
            <div className="p-4 md:p-6 text-center">
                <h2 className="text-xl font-bold text-destructive">Erro ao carregar assinante</h2>
                <p className="text-muted-foreground">{error?.message || "Assinante não encontrado"}</p>
                <Link href="/customers">
                    <Button variant="outline" className="mt-4">Voltar para lista</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 space-y-4">
            <div className="flex items-center gap-4">
                <Link href="/customers">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <nav className="text-sm text-muted-foreground">
                    Assinantes / <span className="text-foreground font-medium">{customer.name}</span>
                </nav>
            </div>

            <CustomerProfileHeader customer={customer as any} />

            <CustomerProfileTabs customerId={customer.id} />
        </div>
    )
}
