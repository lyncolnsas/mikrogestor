"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    CircleDollarSign,
    Network,
    Settings,
    BarChart3,
    ScrollText,
    Wallet,
    MessageCircle,
    Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ISPHeader } from "@/components/isp-header";
import { MobileNav } from "@/components/mobile-nav";
import { GlobalNotificationListener } from "@/components/notifications/global-notification-listener";
import { getMySaasNotificationsAction, markSaasNotificationAsReadAction } from "@/modules/saas/actions/notification.actions";

const menuItems = [
    { label: "Dashboard", href: "/overview", icon: LayoutDashboard },
    { label: "Clientes", href: "/customers", icon: Users },
    { label: "Financeiro", href: "/financial/dashboard", icon: CircleDollarSign },
    { label: "Planos", href: "/financial/plans", icon: Wallet },
    { label: "Integração MK", href: "/mk-integration", icon: Network },
    { label: "Relatórios", href: "/reports/revenue", icon: BarChart3 },
    { label: "WhatsApp", href: "/whatsapp", icon: MessageCircle },
    { label: "Comunicações", href: "/notifications", icon: MessageCircle },
    { label: "Configurações", href: "/settings/financial", icon: Settings },
];

export default function ISPPanelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-background">
            {/* Barra Lateral Desktop ("Rail" no Tablet, "Full" no Desktop) */}
            <aside className="fixed inset-y-0 left-0 z-50 hidden md:flex flex-col border-r bg-sidebar border-sidebar-border shadow-sm transition-all duration-300 md:w-20 lg:w-64">
                {/* Marca */}
                <div className="flex h-16 items-center px-4 lg:px-6 border-b border-sidebar-border justify-center lg:justify-start">
                    <Link href="/overview" className="flex items-center gap-2 font-black text-xl tracking-tighter text-sidebar-foreground">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
                            <Globe className="h-5 w-5" />
                        </div>
                        <span className="hidden lg:block truncate">MIKROGESTOR</span>
                    </Link>
                </div>

                <nav className="flex-1 overflow-y-auto px-2 lg:px-3 py-6 space-y-1">
                    <div className="hidden lg:block px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Menu Principal
                    </div>
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={cn(
                                    "group relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 overflow-visible", // Changed overflow-hidden to overflow-visible for tooltip
                                    // Centraliza no tablet (md), alinha a esquerda no desktop (lg)
                                    "justify-center lg:justify-start",
                                    isActive
                                        ? "bg-primary/5 text-primary shadow-[inset_0_0_15px_rgba(var(--color-primary),0.05)]"
                                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full bg-primary shadow-[0_0_12px_var(--color-primary)]" />
                                )}
                                <item.icon className={cn(
                                    "h-5 w-5 shrine-0 transition-colors",
                                    isActive ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                                )} />
                                <span className="hidden lg:block truncate">
                                    {item.label}
                                </span>

                                {/* Custom Tooltip for Rail Mode (Tablet) */}
                                <div className="absolute left-full ml-4 z-50 rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 hidden md:block lg:hidden pointer-events-none whitespace-nowrap border border-border">
                                    {item.label}
                                </div>

                                {isActive && (
                                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse hidden lg:block" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Rodapé / Versão */}
                <div className="p-2 lg:p-4 border-t border-sidebar-border">
                    <div className="rounded-xl bg-sidebar-accent p-2 lg:p-4 text-center">
                        <p className="text-xs font-medium text-sidebar-foreground hidden lg:block">MikroGestor v2.0</p>
                        <p className="text-xs font-bold text-sidebar-foreground md:block lg:hidden">v2.0</p>
                        <p className="text-[10px] text-muted-foreground mt-1 hidden lg:block">© 2024</p>
                    </div>
                </div>
            </aside>

            {/* Container Principal */}
            <div className="flex flex-1 flex-col transition-all duration-300 md:pl-20 lg:pl-64">
                {/* Cabeçalho */}
                <ISPHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} />

                {/* Global Notifications from SaaS */}
                <GlobalNotificationListener
                    fetchAction={getMySaasNotificationsAction}
                    markReadAction={async (id) => { await markSaasNotificationAsReadAction({ notificationId: id }); }}
                />

                {/* Navegação Mobile */}
                <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

                {/* Conteúdo da Página */}
                <main className="flex-1 px-3 py-4 md:p-6 lg:p-8 overflow-y-auto overflow-x-hidden w-full max-w-7xl mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
