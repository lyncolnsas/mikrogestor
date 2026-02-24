"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { AuthModal } from "@/components/auth/auth-modal"
import { ArrowRight } from "lucide-react"

interface Plan {
    id: string;
    name: string;
    monthlyPrice: string | number | { toString(): string };
}

export function AuthTrigger({ plans }: { plans: Plan[] }) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [defaultTab, setDefaultTab] = React.useState<"login" | "register">("login")

    const handleOpen = (tab: "login" | "register") => {
        setDefaultTab(tab)
        setIsOpen(true)
    }

    return (
        <>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <button
                    onClick={() => handleOpen("login")}
                    className="text-xs sm:text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors"
                >
                    Entrar
                </button>
                <Button
                    onClick={() => handleOpen("register")}
                    className="rounded-full px-4 sm:px-6 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25"
                >
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                        Teste <span className="hidden xs:inline">Gratuito</span> <ArrowRight size={16} />
                    </div>
                </Button>
            </div>

            <AuthModal
                isOpen={isOpen}
                onOpenChange={setIsOpen}
                defaultTab={defaultTab}
                plans={plans}
            />
        </>
    )
}
