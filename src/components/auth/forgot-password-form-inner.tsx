"use client"

import * as React from "react"
import { useActionState } from "react"
import { forgotPassword } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react"

interface ForgotPasswordState {
    error?: {
        email?: string[];
        _form?: string[];
    };
    success?: string;
}

export function ForgotPasswordFormInner({ onBack }: { onBack: () => void }) {
    const [state, action, isPending] = useActionState(
        forgotPassword as (prevState: any, formData: FormData) => Promise<ForgotPasswordState>,
        {}
    );

    if (state?.success) {
        return (
            <div className="space-y-6 text-center py-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-10 w-10" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Email enviado!</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed px-4">
                        {state.success}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-500/10 gap-2"
                >
                    <ArrowLeft className="h-4 w-4" /> Voltar para o Login
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Recuperar Senha</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Sua senha será enviada diretamente no seu e-mail.
                </p>
            </div>

            <form action={action} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="text-xs font-black uppercase tracking-widest text-slate-500">Email da conta</Label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            id="forgot-email"
                            name="email"
                            type="email"
                            placeholder="admin@provedor.com"
                            className="h-14 pl-11 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border-none font-bold placeholder:font-medium transition-all focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    {state?.error?.email && (
                        <p className="text-xs font-bold text-red-500 animate-in fade-in slide-in-from-top-1">{state.error.email[0]}</p>
                    )}
                </div>

                {state?.error?._form && (
                    <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold text-center">
                        {state.error._form[0]}
                    </div>
                )}

                <Button
                    className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-base shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70"
                    disabled={isPending}
                >
                    {isPending ? (
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Enviando Link...</span>
                        </div>
                    ) : (
                        "Enviar Link de Recuperação"
                    )}
                </Button>

                <div className="text-center pt-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onBack}
                        className="text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" /> Cancelar
                    </Button>
                </div>
            </form>
        </div>
    )
}
