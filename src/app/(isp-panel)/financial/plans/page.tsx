"use client";

import React, { useEffect, useState } from "react";
import { PlanForm } from "@/modules/financial/components/plan-form";
import { PlanList } from "@/modules/financial/components/plan-list";
import { Info, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getPlans } from "@/modules/financial/actions/plan.actions";

export default function PlansPage() {
    const [plans, setPlans] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingPlan, setEditingPlan] = useState<any>(null);

    async function loadPlans() {
        setIsLoading(true);
        try {
            const data = await getPlans();
            setPlans(data);
        } catch (error) {
            console.error("Error loading plans:", error);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadPlans();
    }, []);

    const handleEdit = (plan: any) => {
        setEditingPlan(plan);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setEditingPlan(null);
        loadPlans(); // Reload to reflect any changes if updated
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-inter">Planos de Acesso</h1>
                    <p className="text-muted-foreground mt-1">Configure as velocidades e preços que serão oferecidos aos seus assinantes.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-slate-200 rounded-2xl">
                            <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                            <p className="text-slate-500 font-medium">Carregando planos...</p>
                        </div>
                    ) : (
                        <PlanList plans={plans} onEdit={handleEdit} />
                    )}
                </div>

                <div className="space-y-6">
                    <PlanForm editingPlan={editingPlan} onCancel={handleCancel} />

                    <Alert className="bg-blue-50 border-blue-100 text-blue-800">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="font-bold">Dica do Provedor</AlertTitle>
                        <AlertDescription className="text-sm opacity-90">
                            Ao alterar o preço de um plano, as novas faturas geradas a partir de hoje usarão o valor atualizado. Faturas existentes não serão alteradas.
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        </div>
    );
}
