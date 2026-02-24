"use client";

import { Button } from "@/components/ui/button";
import { generateInvoicesAction } from "../actions/billing.actions";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";

import { useMutation } from "@tanstack/react-query"; // Assuming react-query or similar

// Assuming generateMonthlyInvoices is an action or function that performs the billing
// You might need to import it if it's not already available in this scope.
// For example: import { generateMonthlyInvoices } from "../actions/billing.actions";
// For the purpose of this edit, I'll assume it's available or will be defined.
async function generateMonthlyInvoices() {
    // This function should contain the logic to generate invoices.
    // For example, it might call generateInvoicesAction()
    const result = await generateInvoicesAction();
    if (!result.success) {
        throw new Error(result.error as string || "Failed to generate invoices.");
    }
    return result;
}

export function GenerateInvoicesButton() {
    const { mutate, isPending } = useMutation({
        mutationFn: generateMonthlyInvoices,
        onSuccess: (data) => {
            toast.success("Faturamento processado!", {
                description: `${data.generated} faturas foram geradas para este período.`
            });
        },
        onError: (error) => {
            toast.error("Erro ao processar faturamento.", {
                description: error.message || "Ocorreu um erro inesperado."
            });
        },
    });

    return (
        <Button
            onClick={() => mutate()}
            disabled={isPending}
            className="rounded-xl font-bold bg-slate-900 shadow-xl shadow-slate-900/10 gap-2 h-11"
        >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-white" />}
            {isPending ? "Gerando..." : "Gerar Faturamento Mensal"}
        </Button>
    );
}
