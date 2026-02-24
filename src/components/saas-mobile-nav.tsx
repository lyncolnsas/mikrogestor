import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logoutUser } from "@/actions/auth";
import {
    X,
    Building2,
    Users,
    ShieldCheck,
    CreditCard,
    MessageSquare,
    TrendingUp,
    Wifi,
    Smartphone,
    Activity,
    UserCircle,
    LogOut
} from "lucide-react";
import { Button } from "./ui/button";

const menuItems = [
    { label: "Control Tower", href: "/saas-admin/tower", icon: Building2 },
    { label: "Isp / Tenants", href: "/saas-admin/tenants", icon: Users },
    { label: "VPN Servers", href: "/saas-admin/vpn-servers", icon: ShieldCheck },
    { label: "Plans", href: "/saas-admin/plans", icon: CreditCard },
    { label: "WhatsApp SaaS", href: "/saas-admin/whatsapp", icon: MessageSquare },
    { label: "Financial BI", href: "/saas-admin/billing", icon: TrendingUp },
    { label: "RADIUS Global", href: "/saas-admin/radius", icon: Wifi },
    { label: "VPNs Móveis", href: "/saas-admin/mobile-vpn", icon: Smartphone },
    { label: "Monitores", href: "/saas-admin/monitors", icon: Activity },
];

export function SaasMobileNav({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
                "fixed inset-y-0 left-0 w-[80%] max-w-[300px] bg-slate-900 z-50 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col md:hidden text-white border-r border-slate-800",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <span className="font-bold text-lg text-white">SaaS Admin</span>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-slate-800">
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
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                )}
                            >
                                <item.icon className={cn(
                                    "h-5 w-5",
                                    isActive ? "text-white" : "text-slate-500"
                                )} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/50 border border-slate-700 mb-2">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                            <UserCircle className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">Super Admin</p>
                            <p className="text-xs text-slate-500 truncate">System Owner</p>
                        </div>
                    </div>

                    <button
                        onClick={async () => {
                            await logoutUser();
                        }}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-900/10 text-red-400 hover:bg-red-900/20 border border-red-900/10 font-bold transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Sair
                    </button>
                </div>
            </div>
        </>
    );
}
