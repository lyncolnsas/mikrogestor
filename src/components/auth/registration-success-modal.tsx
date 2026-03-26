"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle2, Mail, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function RegistrationSuccessModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md border-none shadow-2xl rounded-[2.5rem] bg-white dark:bg-slate-900 p-0 overflow-hidden">
                <div className="p-8 text-center space-y-6">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center text-green-600 mx-auto animate-bounce">
                        <CheckCircle2 className="h-10 w-10" />
                    </div>
                    
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                            Cadastro Realizado!
                        </DialogTitle>
                        <DialogDescription className="text-lg font-medium text-slate-500 dark:text-slate-400">
                            Seja bem-vindo ao Mikrogestor SaaS. 🚀
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600">
                            <Mail className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            Enviamos um <span className="text-blue-600 uppercase">código de confirmação</span> para o seu e-mail.
                        </p>
                        <p className="text-xs text-slate-500">
                            Verifique sua caixa de entrada (e o spam) para ativar seu acesso.
                        </p>
                    </div>

                    <Button 
                        onClick={onClose}
                        className="w-full h-16 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-lg shadow-xl transition-all hover:scale-[1.02] active:scale-95"
                    >
                        Entrar Agora <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
