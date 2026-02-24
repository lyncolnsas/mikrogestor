"use client"

import Link from "next/link"
import { useActionState } from "react"
import { loginUser } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight } from "lucide-react"

export function LoginFormInner({ onSuccess, onForgotPassword }: { onSuccess?: () => void, onForgotPassword?: () => void }) {
    const [state, action, isPending] = useActionState(loginUser, null);

    return (
        <form action={action} className="w-full space-y-8">
            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-500">Email</Label>
                        <Input id="email" name="email" type="email" placeholder="m@example.com" required className="h-14 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border-none font-bold placeholder:font-medium transition-all focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password" title="password" className="text-xs font-black uppercase tracking-widest text-slate-500">Senha</Label>
                            {onForgotPassword ? (
                                <button
                                    type="button"
                                    onClick={onForgotPassword}
                                    className="text-xs font-bold text-blue-600 hover:underline underline-offset-4"
                                >
                                    Esqueceu a senha?
                                </button>
                            ) : (
                                <Link href="#" className="text-xs font-bold text-blue-600 hover:underline underline-offset-4">
                                    Esqueceu a senha?
                                </Link>
                            )}
                        </div>
                        <Input id="password" name="password" type="password" required className="h-14 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border-none font-bold placeholder:font-medium transition-all focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>

                {state?.error && '_form' in state.error && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-sm text-destructive text-center font-bold">
                        {state.error._form?.[0]}
                    </div>
                )}

                <Button className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-base shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70" disabled={isPending}>
                    {isPending ? "Entrando..." : "Entrar"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </form>
    )
}
