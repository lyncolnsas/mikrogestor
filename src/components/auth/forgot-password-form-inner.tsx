
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Phone, ArrowLeft, Loader2, CheckCircle2, Send } from "lucide-react"
import { toast } from "sonner"

export function ForgotPasswordFormInner({ onBack }: { onBack: () => void }) {
    const [isPending, setIsPending] = React.useState(false);
    const [success, setSuccess] = React.useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsPending(true);
        const formData = new FormData(e.currentTarget);
        const email = formData.get("email");
        const phone = formData.get("phone");

        try {
            const response = await fetch("/api/auth/recuperar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, phone })
            });

            if (response.ok) {
                setSuccess("Se os dados estiverem corretos, o link foi enviado.");
                toast.success("Solicitação processada com sucesso!");
            } else {
                toast.error("Erro ao processar solicitação.");
            }
        } catch (error) {
            toast.error("Erro na conexão com o servidor.");
        } finally {
            setIsPending(false);
        }
    }

    if (success) {
        return (
            <div className="space-y-6 text-center py-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-10 w-10" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Solicitação Enviada!</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed px-4">
                        Verifique seu e-mail. Caso os dados coincidam, você receberá as instruções em instantes.
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
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Recuperar Acesso v2</h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Informe seus dados cadastrados para podermos te ajudar.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="text-xs font-black uppercase tracking-widest text-slate-500">Email da conta</Label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            id="forgot-email"
                            name="email"
                            type="email"
                            placeholder="seu@email.com"
                            className="h-14 pl-11 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border-none font-bold placeholder:font-medium transition-all focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="forgot-phone" className="text-xs font-black uppercase tracking-widest text-slate-500">Telefone Cadastrado</Label>
                    <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            id="forgot-phone"
                            name="phone"
                            type="tel"
                            placeholder="(00) 00000-0000"
                            required
                            className="h-14 pl-11 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border-none font-bold placeholder:font-medium transition-all focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-base shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70"
                    disabled={isPending}
                >
                    {isPending ? (
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Processando...</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                             Solicitar Recuperação <Send className="h-4 w-4" />
                        </div>
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
