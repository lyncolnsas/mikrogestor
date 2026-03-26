"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { verifyEmailAction, resendVerificationCodeAction } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, MailCheck, ArrowRight, RefreshCw, X } from "lucide-react"
import { toast } from "sonner"

interface VerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    email: string;
}

export function VerificationModal({ isOpen, onClose, email }: VerificationModalProps) {
    const router = useRouter()
    const [code, setCode] = React.useState("")
    const [isPending, setIsPending] = React.useState(false)
    const [isResending, setIsResending] = React.useState(false)

    async function handleVerify(e: React.FormEvent) {
        e.preventDefault()
        if (code.length < 6) return

        setIsPending(true)
        try {
            const result = await verifyEmailAction(email, code)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("E-mail verificado com sucesso!")
                if (result.role === "SUPER_ADMIN") {
                    router.push("/saas-admin/tower")
                } else {
                    router.push("/overview")
                }
                onClose()
            }
        } catch (err) {
            toast.error("Erro ao verificar código.")
        } finally {
            setIsPending(false)
        }
    }

    async function handleResend() {
        setIsResending(true)
        try {
            const result = await resendVerificationCodeAction(email)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Novo código enviado para seu e-mail!")
            }
        } catch (err) {
            toast.error("Erro ao reenviar código.")
        } finally {
            setIsResending(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md border-none shadow-2xl rounded-[2.5rem] bg-white dark:bg-slate-900 p-0 overflow-hidden">
                <div className="p-8">
                    <DialogHeader className="text-center space-y-4">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 mx-auto">
                            <MailCheck className="h-8 w-8" />
                        </div>
                        <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                            Verifique seu E-mail
                        </DialogTitle>
                        <DialogDescription className="text-base font-medium">
                            Enviamos um código de 6 dígitos para <br />
                            <span className="font-bold text-slate-900 dark:text-white">{email}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleVerify} className="mt-8 space-y-6">
                        <div className="space-y-2">
                            <Input
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                className="h-20 text-center text-4xl font-black tracking-[0.5em] rounded-2xl bg-slate-100 dark:bg-slate-800/50 border-none transition-all focus:ring-2 focus:ring-blue-500"
                                autoFocus
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70"
                            disabled={isPending || code.length < 6}
                        >
                            {isPending ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    <span>Verificando...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <span>Confirmar e Entrar</span>
                                    <ArrowRight className="h-5 w-5" />
                                </div>
                            )}
                        </Button>
                    </form>

                    <div className="mt-8 text-center space-y-4">
                        <div className="flex flex-col gap-1">
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                Não recebeu o código?
                            </p>
                            <button
                                onClick={handleResend}
                                disabled={isResending}
                                className="flex items-center justify-center gap-2 mx-auto text-blue-600 font-black hover:underline underline-offset-4 disabled:opacity-50 text-sm"
                            >
                                {isResending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                                Solicitar Novo Código
                            </button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
