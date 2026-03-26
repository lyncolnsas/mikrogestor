"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Network, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

import { useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { LoginFormInner } from "@/components/auth/login-form-inner"
import { RegistrationSuccessModal } from "@/components/auth/registration-success-modal"

export default function LoginForm() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Carregando...</div>}>
            <LoginFormContent />
        </Suspense>
    );
}

function LoginFormContent() {
    const searchParams = useSearchParams();
    const [isSuccessOpen, setIsSuccessOpen] = useState(false);

    useEffect(() => {
        if (searchParams.get("registered") === "true") {
            setIsSuccessOpen(true);
        }
    }, [searchParams]);

    return (
        <div className="flex min-h-screen w-full bg-white dark:bg-slate-950">
            {/* Left Side - Hero / Branding */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative flex-col justify-between p-12 text-white overflow-hidden">
                {/* Background Image Overlay */}
                <div
                    className="absolute inset-0 z-0 opacity-40 bg-cover bg-center"
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
                        transition={{ delay: 0.2 }}
                        className="text-4xl font-extrabold tracking-tight leading-tight"
                    >
                        Bem-vindo de volta.
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-lg text-slate-300"
                    >
                        Acesse seu painel de controle e monitore sua rede em tempo real.
                    </motion.p>
                </div>

                <div className="relative z-20 text-xs text-slate-500">
                    © 2024 Mikrogestor SaaS. Edição Enterprise.
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-24 relative">
                <div className="absolute top-8 right-8 lg:top-12 lg:right-12">
                    <Link
                        href="/auth/register"
                        className="text-sm font-medium hover:text-primary transition-colors"
                    >
                        Criar conta grátis
                    </Link>
                </div>

                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight">Login</h2>
                        <p className="mt-2 text-sm text-slate-500">
                            Entre com suas credenciais para continuar.
                        </p>
                    </div>

                    <LoginFormInner />
                </div>
            </div>

            <RegistrationSuccessModal 
                isOpen={isSuccessOpen} 
                onClose={() => setIsSuccessOpen(false)} 
            />
        </div>
    )
}
