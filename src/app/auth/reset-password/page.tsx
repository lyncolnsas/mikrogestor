
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Network, ArrowLeft, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { resetPasswordAction } from "@/modules/saas/actions/auth-reset.actions";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";

export default function ResetPasswordPage() {
    const [isPending, setIsPending] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();
    
    // Obter token da URL
    const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsPending(true);
        const formData = new FormData(e.currentTarget);
        formData.append("token", token);
        
        try {
            const res = await resetPasswordAction(formData);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Sua senha foi redefinida com sucesso!");
                setTimeout(() => router.push("/auth/login"), 2000);
            }
        } catch (error) {
            toast.error("Erro ao redefinir senha.");
        } finally {
            setIsPending(false);
        }
    }

    if (!token) {
        return (
            <div className="flex min-h-screen items-center justify-center p-8 text-center space-y-4">
                <div className="space-y-2">
                    <h2 className="text-2xl font-black">Link de acesso inválido</h2>
                    <p className="text-slate-500 font-medium">Você precisa de um token de recuperação válido para acessar esta página.</p>
                </div>
                <Button asChild className="rounded-xl"><Link href="/auth/forgot-password">Solicitar Nova Recuperação</Link></Button>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full bg-white dark:bg-slate-950">
            {/* Left Side - Visual Branding */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative flex-col justify-between p-12 text-white overflow-hidden">
                <div
                    className="absolute inset-0 z-0 opacity-40 bg-cover bg-center"
                    style={{ backgroundImage: "url('/assets/login_hero.png')" }}
                />
                <div className="relative z-20 flex items-center gap-2 font-bold text-2xl">
                    <Network className="h-8 w-8 text-primary" />
                    <span>Mikrogestor</span>
                </div>

                <div className="relative z-20 space-y-6 max-w-lg">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-extrabold tracking-tight leading-tight"
                    >
                        Quase lá. 
                        Defina sua nova senha agora.
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-slate-300 font-medium"
                    >
                        Escolha uma senha forte que você não tenha utilizado nos últimos meses.
                    </motion.p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-24 relative overflow-hidden">
                <div className="w-full max-w-md space-y-10">
                    <div className="text-center lg:text-left space-y-2">
                        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Redefinir Senha</h2>
                        <p className="text-sm text-slate-500 font-medium">
                            Digite sua nova senha abaixo para recuperar o acesso.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password" title="password" className="text-xs font-black uppercase tracking-widest text-slate-400">Nova Senha</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary shadow-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm" title="confirm" className="text-xs font-black uppercase tracking-widest text-slate-400">Confirme a Nova Senha</Label>
                                <Input
                                    id="confirm"
                                    name="confirm"
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary shadow-sm"
                                />
                            </div>
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-primary hover:scale-[1.02] transition-all font-black text-base shadow-xl disabled:opacity-50"
                            disabled={isPending}
                        >
                            {isPending ? "Processando..." : "Salvar Nova Senha"}
                            <KeyRound className="ml-2 h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
