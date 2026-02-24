"use client"

import React from "react"
import { motion } from "framer-motion"
import { ShieldAlert, CreditCard, MessageCircle, ArrowRight, Info } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function BlockedPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-red-950/20 via-slate-950 to-slate-950">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-xl w-full"
            >
                {/* Header Icon */}
                <div className="flex justify-center mb-8">
                    <div className="relative">
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="bg-red-500/10 p-6 rounded-full"
                        >
                            <ShieldAlert className="h-16 w-16 text-red-500" />
                        </motion.div>
                        <div className="absolute -top-2 -right-2 bg-red-500 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter">
                            Acesso Suspenso
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <ShieldAlert className="h-32 w-32" />
                    </div>

                    <h1 className="text-3xl md:text-4xl font-black mb-4 tracking-tight leading-tight">
                        Ops! Identificamos uma <span className="text-red-500">pendência</span> em sua conta.
                    </h1>

                    <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                        Para garantir que você continue navegando com a melhor conexão, precisamos regularizar sua situação financeira. Seu acesso foi redirecionado temporariamente.
                    </p>

                    <div className="grid grid-cols-1 gap-4 mb-8">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-start gap-4">
                            <div className="bg-red-500/20 p-2 rounded-lg mt-1">
                                <Info className="h-4 w-4 text-red-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm uppercase tracking-wider text-slate-300">Motivo</h4>
                                <p className="text-sm text-slate-400">Atraso no pagamento ou fatura vencida.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-2xl py-6 font-bold shadow-xl shadow-red-500/20 h-auto gap-2">
                            <CreditCard className="h-5 w-5" />
                            Pagar com Pix
                            <ArrowRight className="h-4 w-4 ml-1 opacity-50" />
                        </Button>
                        <Button variant="outline" className="flex-1 bg-transparent border-white/10 hover:bg-white/5 rounded-2xl py-6 font-bold h-auto gap-2">
                            <MessageCircle className="h-5 w-5 text-emerald-500" />
                            Falar no WhatsApp
                        </Button>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center mt-12 text-slate-500 text-sm font-medium">
                    &copy; 2026 MikroGestor. Todos os direitos reservados.
                </p>
            </motion.div>
        </div>
    )
}
