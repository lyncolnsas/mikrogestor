"use client"

import { LogOut } from "lucide-react"
import { logoutSubscriber } from "@/modules/customers/actions/auth.actions"
import { Button } from "@/components/ui/button"

export function LogoutButton({ variant = "ghost", className = "" }: { variant?: "ghost" | "outline" | "default", className?: string }) {
    return (
        <Button
            variant={variant}
            size="sm"
            className={`gap-2 ${className}`}
            onClick={() => logoutSubscriber()}
        >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
        </Button>
    )
}
