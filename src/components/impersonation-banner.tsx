"use client";

import { stopImpersonationAction } from "@/modules/saas/actions/impersonate.actions";
import { LogOut, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

export function ImpersonationBanner({ isImpersonated }: { isImpersonated?: boolean }) {
    const [isLoading, setIsLoading] = useState(false);

    if (!isImpersonated) return null;

    const handleExit = async () => {
        setIsLoading(true);
        try {
            await stopImpersonationAction();
            window.location.href = "/saas-admin/tenants"; // Full reload to clear cache
        } catch (error) {
            console.error("Failed to stop impersonation", error);
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="bg-amber-950/90 text-amber-50 backdrop-blur-md border border-amber-500/50 shadow-2xl rounded-2xl p-4 flex items-center gap-4 max-w-sm">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <ShieldAlert className="h-6 w-6 text-amber-400 animate-pulse" />
                </div>
                <div>
                    <h4 className="font-bold text-sm text-amber-200 uppercase tracking-wider">Modo Espião</h4>
                    <p className="text-xs text-amber-100/80 leading-tight">Você está acessando como o cliente.</p>
                </div>
                <Button
                    size="sm"
                    onClick={handleExit}
                    disabled={isLoading}
                    className="ml-auto bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold border-none"
                >
                    {isLoading ? "Saindo..." : (
                        <>
                            Sair <LogOut className="ml-2 h-3 w-3" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
