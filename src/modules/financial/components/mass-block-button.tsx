"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { executeMassBlockAction } from "../actions/block.actions";
import { toast } from "sonner";
import { Loader2, ShieldAlert } from "lucide-react";

interface MassBlockButtonProps {
    disabled?: boolean;
}

export function MassBlockButton({ disabled }: MassBlockButtonProps) {
    const [isPending, startTransition] = useTransition();

    const handleBlock = () => {
        startTransition(async () => {
            try {
                const res = await executeMassBlockAction();
                if (res.data?.success) {
                    toast.success("Bloqueio em massa executado!", {
                        description: `${res.data.blockedCount} assinantes foram processados e bloqueados.`
                    });
                } else {
                    toast.error("Erro ao executar bloqueio");
                }
            } catch (error) {
                console.error(error);
                toast.error("Falha na requisição");
            }
        });
    };

    return (
        <Button
            variant="destructive"
            className="w-full text-xs h-8 gap-2"
            disabled={disabled || isPending}
            onClick={handleBlock}
        >
            {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
                <ShieldAlert className="h-3 w-3" />
            )}
            {isPending ? "Processando..." : "Executar Bloqueio em Massa"}
        </Button>
    );
}
