import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logoutUser } from "@/actions/auth";
import {
    X,
    LayoutDashboard,
    Users,
    CircleDollarSign,
    Network,
    Settings,
    BarChart3,
    ScrollText,
    Wallet,
    MessageCircle,
    UserCircle,
    LogOut
} from "lucide-react";
import { Button } from "./ui/button";

const menuItems = [
    { label: "Dashboard", href: "/overview", icon: LayoutDashboard },
    { label: "Clientes", href: "/customers", icon: Users },
    { label: "Financeiro", href: "/financial/dashboard", icon: CircleDollarSign },
    { label: "Planos", href: "/financial/plans", icon: Wallet },
    { label: "Rede", href: "/network", icon: Network },
    { label: "Relatórios", href: "/reports/revenue", icon: BarChart3 },
    { label: "Logs de Rede", href: "/network/logs", icon: ScrollText },
    { label: "WhatsApp", href: "/whatsapp", icon: MessageCircle },
    { label: "Configurações", href: "/settings/financial", icon: Settings },
];

export function MobileNav({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const pathname = usePathname();

    return (
        <>
            {/* Drawer Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Drawer Content */}
            <div className={cn(
                "fixed inset-y-0 left-0 w-[80%] max-w-[300px] bg-white z-50 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col md:hidden",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-4 border-b flex justify-between items-center">
                    <span className="font-bold text-lg text-slate-800">Menu</span>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-3 text-sm font-semibold rounded-xl transition-all duration-200",
                                    isActive
                                        ? "bg-primary text-white shadow-md shadow-primary/20"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <item.icon className={cn(
                                    "h-5 w-5",
                                    isActive ? "text-white" : "text-slate-400"
                                )} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-200 mb-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                            <UserCircle className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">NetFast ISP</p>
                            <p className="text-xs text-slate-500 truncate">Administrador</p>
                        </div>
                    </div>

                    <button
                        onClick={async () => {
                            await logoutUser();
                        }}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 font-bold transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Sair
                    </button>
                </div>
            </div>
        </>
    );
}
