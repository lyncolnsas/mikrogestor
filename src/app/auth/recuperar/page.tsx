
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Network, ArrowLeft, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
    const [isPending, setIsPending] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsPending(true);
        const formData = new FormData(e.currentTarget);
        const email = formData.get("email");
        const phone = formData.get("phone");
        
        try {
            console.log("[DEBUG] Enviando para /api/auth/recuperar...");
            const response = await fetch("/api/auth/recuperar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, phone })
            });

            if (response.ok) {
                setSubmitted(true);
                toast.success("Se os dados estiverem corretos, você receberá instruções ou entraremos em contato.");
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error("[DEBUG] Erro na API:", errorData);
                toast.error("Erro ao processar solicitação.");
            }
        } catch (error) {
            console.error("[DEBUG] Erro de rede:", error);
            toast.error("Erro na conexão com o servidor.");
        } finally {
            setIsPending(false);
        }
    }

    return (
        <div className="flex min-h-screen w-full bg-white dark:bg-slate-950">
            {/* Left Side - Hero / Branding */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative flex-col justify-between p-12 text-white overflow-hidden">
                <div
                    className="absolute inset-0 z-0 opacity-40 bg-cover bg-center transition-transform hover:scale-105 duration-[10s]"
                    style={{ backgroundImage: "url('/assets/login_hero.png')" }}
                />
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/50" />

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
                        Não consegue acessar sua conta?
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-slate-300 font-medium"
                    >
                        Insira seus dados cadastrados para recuperar o acesso ou solicitar suporte manual de nossa equipe.
                    </motion.p>
                </div>

                <div className="relative z-20 text-xs text-slate-500 font-bold uppercase tracking-widest">
                    Segurança Mikrogestor SaaS
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-24 relative overflow-hidden">
                <div className="absolute top-8 left-8 lg:top-12 lg:left-12">
                    <Link
                        href="/auth/login"
                        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary transition-all group"
                    >
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Voltar ao Login
                    </Link>
                </div>

                <div className="w-full max-w-md space-y-10">
                    <div className="text-center lg:text-left space-y-2">
                        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Recuperação de Acesso v2</h2>
                        <p className="text-sm text-slate-500 font-medium">
                            Informe seu e-mail e telefone cadastrados.
                        </p>
                    </div>

                    {!submitted ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-400">E-mail Cadastrado</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="seu@email.com"
                                        className="h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-xs font-black uppercase tracking-widest text-slate-400">Telefone Cadastrado</Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        placeholder="(00) 00000-0000"
                                        required
                                        className="h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary shadow-sm"
                                    />
                                </div>
                            </div>

                            <Button 
                                type="submit" 
                                className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-primary hover:scale-[1.02] transition-all font-black text-base shadow-xl disabled:opacity-50"
                                disabled={isPending}
                            >
                                {isPending ? "Processando..." : "Solicitar Recuperação"}
                                <Send className="ml-2 h-4 w-4" />
                            </Button>

                            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
                                Por segurança, se os dados não coincidirem, nenhuma ação será tomada externamente.
                            </p>
                        </form>
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-10 rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-100 dark:border-emerald-500/20 text-center space-y-4"
                        >
                            <div className="h-16 w-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 text-white">
                                <Send className="h-8 w-8" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-400 tracking-tight">Solicitação Enviada!</h3>
                                <p className="text-sm font-medium text-emerald-800/70">
                                    Seus dados foram processados. Nossa equipe entrará em contato ou você receberá um link se o e-mail estiver correto.
                                </p>
                            </div>
                            <Button 
                                variant="outline" 
                                className="w-full mt-4 h-12 rounded-xl border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold"
                                asChild
                            >
                                <Link href="/auth/login">Voltar ao Login</Link>
                            </Button>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
