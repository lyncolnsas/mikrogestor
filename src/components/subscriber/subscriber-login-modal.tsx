"use client";

import { useActionState, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithCpf } from "@/modules/customers/actions/auth.actions";
import { Loader2, LogIn, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User } from "lucide-react";

interface SubscriberLoginModalProps {
    tenantSlug: string;
}

export function SubscriberLoginModal({ tenantSlug }: SubscriberLoginModalProps) {
    const [open, setOpen] = useState(false);
    const [state, action, isPending] = useActionState(loginWithCpf, null);

    // Fechar modal em caso de redirecionamento (embora server action faça redirect, bom garantir estado limpo se voltar)
    useEffect(() => {
        if (state?.error) {
            // Mantém aberto para mostrar erro
        }
    }, [state]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    className="gap-2 font-semibold hover:bg-white/10 text-white"
                >
                    <User className="w-5 h-5" />
                    <span className="hidden sm:inline">Área do Cliente</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800 text-slate-100">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center">Área do Cliente</DialogTitle>
                    <DialogDescription className="text-center text-slate-400">
                        Digite seu CPF para acessar suas faturas e serviços.
                    </DialogDescription>
                </DialogHeader>

                <form action={action} className="space-y-6 py-4">
                    <input type="hidden" name="tenantSlug" value={tenantSlug} />

                    <div className="space-y-2">
                        <Label htmlFor="cpf" className="text-slate-200">CPF do Titular</Label>
                        <Input
                            id="cpf"
                            name="cpf"
                            placeholder="000.000.000-00"
                            required
                            className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600 h-12 text-lg tracking-wider text-center focus-visible:ring-indigo-500"
                        />
                    </div>

                    {state?.error && (
                        <Alert variant="destructive" className="bg-red-900/20 border-red-900/50 text-red-200">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{state.error}</AlertDescription>
                        </Alert>
                    )}

                    <Button
                        type="submit"
                        className="w-full h-12 text-base font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                        disabled={isPending}
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Verificando...
                            </>
                        ) : (
                            <>
                                Acessar Painel
                                <LogIn className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>

                    <p className="text-center text-xs text-slate-500">
                        Ao continuar, você concorda com nossos termos de uso.
                    </p>
                </form>
            </DialogContent>
        </Dialog>
    );
}
