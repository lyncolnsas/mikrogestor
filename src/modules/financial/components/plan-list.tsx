"use client";

import { deletePlan } from "../actions/plan.actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Wifi, ArrowUp, ArrowDown, Edit2, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import React from "react";

interface Plan {
    id: string;
    name: string;
    price: any;
    upload: number;
    download: number;
    description: string | null;
}

interface PlanListProps {
    plans: Plan[];
    onEdit: (plan: Plan) => void;
}

export function PlanList({ plans, onEdit }: PlanListProps) {
    const [isDeleting, setIsDeleting] = React.useState<string | null>(null);

    async function handleDelete(id: string) {
        if (!confirm("Tem certeza que deseja excluir este plano?")) return;

        setIsDeleting(id);
        try {
            const result = await deletePlan(id);
            if (result.success) {
                toast.success("Plano excluído com sucesso!");
            } else {
                toast.error(result.error as string);
            }
        } catch (error) {
            toast.error("Erro ao excluir plano.");
        } finally {
            setIsDeleting(null);
        }
    }

    if (plans.length === 0) {
        return (
            <div className="text-center p-12 bg-slate-50 border border-slate-200 rounded-2xl">
                <p className="text-slate-500 font-medium">Nenhum plano cadastrado.</p>
            </div>
        );
    }

    return (
        <div className="grid gap-6">
            {plans.map((plan: Plan) => (
                <Card key={plan.id} className="overflow-hidden hover:shadow-md transition-shadow border-slate-200">
                    <div className="flex flex-col md:flex-row">
                        <div className="p-6 flex-1">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                        <Wifi className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-lg">{plan.name}</h3>
                                        <p className="text-xs text-slate-500">{plan.description || "Sem descrição"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-primary"
                                        onClick={() => onEdit(plan)}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-destructive"
                                        onClick={() => handleDelete(plan.id)}
                                        disabled={isDeleting === plan.id}
                                    >
                                        {isDeleting === plan.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 mt-4">
                                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                                    <ArrowDown className="h-4 w-4 text-emerald-500" />
                                    <span>{plan.download} Mbps</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                                    <ArrowUp className="h-4 w-4 text-blue-500" />
                                    <span>{plan.upload} Mbps</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 flex flex-row md:flex-col items-center justify-between border-t md:border-t-0 md:border-l border-slate-200 min-w-[180px]">
                            <div className="text-right md:text-center w-full">
                                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Mensalidade</p>
                                <p className="text-2xl font-black text-slate-900">
                                    R$ {Number(plan.price).toFixed(2).replace('.', ',')}
                                </p>
                            </div>
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3 font-bold">
                                Ativo
                            </Badge>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}
