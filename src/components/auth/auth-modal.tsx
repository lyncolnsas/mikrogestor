"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoginFormInner } from "./login-form-inner"
import { RegisterFormInner } from "./register-form-inner"
import { ForgotPasswordFormInner } from "./forgot-password-form-inner"
import { Network } from "lucide-react"

interface Plan {
    id: string;
    name: string;
    monthlyPrice: string | number | { toString(): string };
}

interface AuthModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTab?: "login" | "register";
    plans: Plan[];
}

export function AuthModal({
    isOpen,
    onOpenChange,
    defaultTab = "login",
    plans
}: AuthModalProps) {
    const [view, setView] = React.useState<"auth" | "forgot-password">("auth")
    const [activeTab, setActiveTab] = React.useState<"login" | "register">(defaultTab)

    // Reset view when modal opens/closes
    React.useEffect(() => {
        if (!isOpen) {
            setTimeout(() => setView("auth"), 300) // Reset after animation
        } else {
            setActiveTab(defaultTab)
        }
    }, [isOpen, defaultTab])

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl bg-white dark:bg-slate-900 backdrop-blur-xl max-h-[90vh] flex flex-col">
                <div className="p-8 pb-4 flex flex-col items-center text-center space-y-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <Network className="h-7 w-7" />
                    </div>
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                            Mikrogestor
                        </DialogTitle>
                        <DialogDescription className="text-sm font-medium">
                            {view === "auth"
                                ? "Acesse sua conta ou comece sua jornada agora."
                                : "Recupere o acesso à sua conta de forma segura."
                            }
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {view === "auth" ? (
                    <Tabs
                        value={activeTab}
                        onValueChange={(v) => setActiveTab(v as "login" | "register")}
                        className="w-full flex-1 flex flex-col"
                    >
                        <div className="px-8 pb-4">
                            <TabsList className="grid w-full grid-cols-2 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                                <TabsTrigger
                                    value="login"
                                    className="rounded-lg font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm transition-all"
                                >
                                    Login
                                </TabsTrigger>
                                <TabsTrigger
                                    value="register"
                                    className="rounded-lg font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm transition-all"
                                >
                                    Cadastro
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                            <TabsContent value="login" className="mt-0 focus-visible:outline-none">
                                <LoginFormInner onForgotPassword={() => setView("forgot-password")} />
                            </TabsContent>
                            <TabsContent value="register" className="mt-0 focus-visible:outline-none">
                                <RegisterFormInner plans={plans} />
                            </TabsContent>
                        </div>
                    </Tabs>
                ) : (
                    <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                        <ForgotPasswordFormInner onBack={() => setView("auth")} />
                    </div>
                )}

                <style jsx global>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(156, 163, 175, 0.3);
                        border-radius: 10px;
                    }
                    .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(75, 85, 99, 0.3);
                    }
                `}</style>
            </DialogContent>
        </Dialog>
    )
}
