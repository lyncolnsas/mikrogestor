"use client"

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Building2,
    ShieldCheck,
    Users,
    UserCircle,
    LogOut,
    CreditCard,
    Activity,
    MessageSquare,
    Wifi,
    Smartphone,
    TrendingUp,
    Menu, // Added Menu icon
    Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutUser } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { SaasMobileNav } from "@/components/saas-mobile-nav";

const menuItems = [
    { label: "Torre de Controle", href: "/saas-admin/tower", icon: Building2 },
    { label: "ISPs / Provedores", href: "/saas-admin/tenants", icon: Users },
    { label: "Servidores VPN", href: "/saas-admin/vpn-servers", icon: ShieldCheck },
    { label: "Planos", href: "/saas-admin/plans", icon: CreditCard },
    { label: "WhatsApp SaaS", href: "/saas-admin/whatsapp", icon: MessageSquare },
    { label: "BI Financeiro", href: "/saas-admin/billing", icon: TrendingUp },
    { label: "RADIUS Global", href: "/saas-admin/radius", icon: Wifi },
    { label: "VPNs Móveis", href: "/saas-admin/mobile-vpn", icon: Smartphone },
    { label: "Monitores", href: "/saas-admin/monitors", icon: Activity },
    { label: "Backups", href: "/saas-admin/backups", icon: Database },
    { label: "Notificações", href: "/saas-admin/notifications", icon: MessageSquare },
];

export default function SaasAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-[#F1F5F9] dark:bg-slate-950 flex-col md:flex-row">
            {/* Mobile Header */}
            <header className="md:hidden flex h-16 items-center gap-4 border-b bg-slate-900 px-4 text-white">
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/10"
                    onClick={() => setMobileMenuOpen(true)}
                >
                    <Menu className="h-6 w-6" />
                </Button>
                <div className="flex items-center gap-2 font-black text-lg tracking-tighter">
                    <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white text-[10px] shadow-lg shadow-blue-500/20">SA</div>
                    SAAS ADMIN
                </div>
            </header>

            {/* Sidebar (Hidden on Mobile) */}
            <aside className="w-64 border-r bg-slate-900 flex-col shadow-xl text-white hidden md:flex sticky top-0 h-screen">
                <div className="p-6">
                    <div className="flex items-center gap-2 font-black text-2xl tracking-tighter text-white">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs shadow-lg shadow-blue-500/20">SA</div>
                        SAAS ADMIN
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1 py-4 overflow-y-auto">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 group",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                )}
                            >
                                <item.icon className={cn(
                                    "h-5 w-5 transition-colors",
                                    isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                                )} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors group">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                            <UserCircle className="h-6 w-6 text-slate-500 group-hover:text-blue-400 transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">Super Admin</p>
                            <p className="text-xs text-slate-500 truncate">Dono do Sistema</p>
                        </div>
                    </div>

                    <button
                        onClick={async () => {
                            await logoutUser();
                        }}
                        className="mt-2 w-full flex items-center gap-3 p-2 rounded-xl text-slate-400 hover:bg-red-900/20 hover:text-red-400 cursor-pointer transition-colors group"
                    >
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-red-900/50 group-hover:bg-red-900/20">
                            <LogOut className="h-5 w-5 transition-colors" />
                        </div>
                        <p className="text-sm font-bold">Sair</p>
                    </button>
                </div>
            </aside>

            {/* Mobile Nav Drawer */}
            <SaasMobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

            {/* Main Content */}
            <main className="flex-1 overflow-auto overflow-x-hidden md:h-screen w-full">
                <div className="h-full px-3 py-4 md:p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
