"use client";

import { Button } from "@/components/ui/button";
import { Trash2, Power, PowerOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { toggleSaasPlanStatusAction, deleteSaasPlanAction } from "../actions/plan.actions";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PlanActionsProps {
    planId: string;
    isActive: boolean;
    showOnLanding: boolean;
}

export function PlanActions({ planId, isActive }: PlanActionsProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleToggleStatus = async () => {
        setIsLoading(true);
        try {
            await toggleSaasPlanStatusAction({ id: planId });
            toast.success("Status do plano atualizado!");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Erro ao atualizar status";
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        setIsLoading(true);
        try {
            await deleteSaasPlanAction({ id: planId });
            toast.success("Plano removido com sucesso!");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Erro ao deletar plano";
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleStatus}
                disabled={isLoading}
                className={`rounded-xl h-12 w-12 transition-all ${isActive
                    ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                    : "text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                    }`}
                title={isActive ? "Desativar Plano" : "Ativar Plano"}
            >
                {isLoading ? <Loader2 className="animate-spin" /> : isActive ? <Power /> : <PowerOff />}
            </Button>

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        disabled={isLoading}
                        className="rounded-xl h-12 w-12 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                        title="Deletar Plano"
                    >
                        <Trash2 className="h-5 w-5" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-black text-2xl">Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription className="font-medium text-slate-500">
                            Esta ação não pode ser desfeita. O plano só será deletado se não houver nenhuma assinatura ativa vinculada a ele.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="rounded-xl bg-rose-600 hover:bg-rose-700 font-bold"
                        >
                            Confirmar Exclusão
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
