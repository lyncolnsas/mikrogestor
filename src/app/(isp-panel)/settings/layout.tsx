"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    CircleDollarSign,
    ShieldCheck,
    Paintbrush,
    Layout
} from "lucide-react";
import { cn } from "@/lib/utils";

const settingsMenu = [
    { label: "Financeiro", href: "/settings/financial", icon: CircleDollarSign },
    { label: "Segurança", href: "/settings/security", icon: ShieldCheck },
    { label: "Aparência", href: "/settings/appearance", icon: Paintbrush },
    { label: "Site Público", href: "/settings/landing", icon: Layout },
];

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500 space-y-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic text-primary">Configurações</h1>
                <p className="text-muted-foreground font-medium opacity-70">Gerencie as regras de negócio e preferências do seu provedor.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Barra Lateral de Navegação */}
                <aside className="w-full md:w-64 space-y-1.5 shrink-0">
                    {settingsMenu.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 group relative overflow-hidden",
                                    isActive
                                        ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_-5px_var(--color-primary)]"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
                                )}
                            >
                                <div className={cn(
                                    "p-1.5 rounded-lg transition-all",
                                    isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground"
                                )}>
                                    <item.icon className="h-4 w-4" />
                                </div>
                                <span className="relative z-10">{item.label}</span>
                                {isActive && (
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-l-full shadow-[0_0_8px_var(--color-primary)]" />
                                )}
                            </Link>
                        );
                    })}
                </aside>

                {/* Cabeçalho Fixo */}
                <div className="flex-1 bg-card rounded-3xl border border-border shadow-2xl shadow-black/20 overflow-hidden min-h-[600px] flex flex-col">
                    {children}
                </div>
            </div>
        </div>
    );
}
