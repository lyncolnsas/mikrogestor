"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { verifyEmailAction, resendVerificationCodeAction } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Loader2, MailCheck, ArrowRight, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link";

export function VerifyFormClient({ email }: { email: string }) {
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
        <Card className="border-none shadow-2xl shadow-blue-500/10 rounded-[2.5rem] overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800/50">
            <CardHeader className="p-8 pb-4 text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-6">
                    <MailCheck className="h-8 w-8" />
                </div>
                <CardTitle className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    Verifique seu E-mail
                </CardTitle>
                <CardDescription className="text-lg font-medium">
                    Enviamos um código de 6 dígitos para <span className="font-bold text-slate-900 dark:text-white">{email}</span>
                </CardDescription>
            </CardHeader>

            <CardContent className="p-8 pt-4">
                <form onSubmit={handleVerify} className="space-y-6">
                    <div className="space-y-2">
                        <div className="relative">
                            <Input
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                className="h-20 text-center text-4xl font-black tracking-[0.5em] rounded-2xl bg-slate-100 dark:bg-slate-800/50 border-none placeholder:opacity-20 transition-all focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-16 rounded-[1.25rem] bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70"
                        disabled={isPending || code.length < 6}
                    >
                        {isPending ? (
                            <div className="flex items-center gap-3">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                <span>Verificando...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <span>Confirmar Conta</span>
                                <ArrowRight className="h-5 w-5" />
                            </div>
                        )}
                    </Button>
                </form>
            </CardContent>

            <CardFooter className="p-8 pt-0 flex flex-col gap-6">
                <div className="text-center space-y-2">
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Não recebeu o código?
                    </p>
                    <button
                        onClick={handleResend}
                        disabled={isResending}
                        className="flex items-center justify-center gap-2 mx-auto text-blue-600 font-black hover:underline underline-offset-4 disabled:opacity-50"
                    >
                        {isResending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        Solicitar Novo Código
                    </button>
                </div>
                
                <p className="text-center text-xs text-slate-400 font-medium border-top pt-4">
                   Precisa de ajuda? Entre em contato com o <Link href="#" className="font-bold hover:text-blue-500">Suporte Técnico</Link>
                </p>
            </CardFooter>
        </Card>
    )
}
