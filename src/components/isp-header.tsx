"use client";

import { usePathname } from "next/navigation";
import {
    Bell,
    Search,
    ChevronRight,
    HelpCircle,
    UserCircle,
    LogOut,
    Settings,
    Menu,
    Globe
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { logoutUser } from "@/actions/auth";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { getLandingConfigAction } from "@/modules/saas/actions/landing.actions";

interface ISPHeaderProps {
    onOpenMobileMenu?: () => void;
}

export function ISPHeader({ onOpenMobileMenu }: ISPHeaderProps) {
    const pathname = usePathname();
    const [branding, setBranding] = useState<{ logoUrl?: string | null, tenantName?: string } | null>(null);

    useEffect(() => {
        async function loadBranding() {
            const result = await getLandingConfigAction({});
            if (result.data) {
                setBranding({
                    logoUrl: result.data.logoUrl,
                    tenantName: (result.data as any).tenant?.name || "MikroGestor"
                });
            }
        }
        loadBranding();
    }, []);

    // ... breadcrumbs logic ...
    const breadcrumbs = pathname
        .split('/')
        .filter(Boolean)
        .map((segment, index, array) => {
            const path = `/${array.slice(0, index + 1).join('/')}`;
            // Formata segmento: capitaliza e substitui traços
            const label = segment
                .replace(/-/g, ' ')
                .replace(/^\w/, c => c.toUpperCase());

            return { label, path };
        });

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/40 px-4 md:px-6 backdrop-blur-2xl transition-all border-border shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
            <div className="flex flex-1 items-center gap-2">
                {/* Mobile Hamburger Trigger */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden -ml-2 mr-1"
                    onClick={onOpenMobileMenu}
                >
                    <Menu className="h-6 w-6" />
                </Button>

                {/* Mobile Logo Brand */}
                <div className="md:hidden flex items-center gap-2 font-black text-lg tracking-tighter text-foreground mr-auto">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white">
                        <Globe className="h-4 w-4" />
                    </div>
                    MG
                </div>

                {/* Caminho de Navegação (Hidden on Mobile) */}
                <div className="hidden flex-row items-center gap-2 text-sm text-muted-foreground md:flex">
                    <Link href="/overview" className="hover:text-primary transition-colors">
                        Início
                    </Link>
                    {breadcrumbs.length > 0 && (
                        <ChevronRight className="h-4 w-4" />
                    )}
                    {breadcrumbs.map((crumb, index) => (
                        <div key={crumb.path} className="flex items-center gap-2">
                            <Link
                                href={crumb.path}
                                className={cn(
                                    "hover:text-primary transition-colors",
                                    index === breadcrumbs.length - 1 && "font-semibold text-foreground"
                                )}
                            >
                                {crumb.label}
                            </Link>
                            {index < breadcrumbs.length - 1 && (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Barra de Busca - Apenas Visual por enquanto */}
                <div className="relative hidden md:block">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="search"
                        placeholder="Buscar..."
                        className="h-9 w-64 rounded-full border border-border bg-muted/50 pl-9 pr-4 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                </div>

                {/* Notificações */}
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary hover:bg-muted/50">
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background animate-pulse"></span>
                </Button>

                {/* Ajuda */}
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-muted/50">
                    <HelpCircle className="h-5 w-5" />
                </Button>

                {/* Divisor Vertical */}
                <div className="h-6 w-px bg-border" />

                {/* Dropdown de Usuário */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-border p-0 hover:bg-primary/5 hover:border-primary/30 transition-all group overflow-hidden flex items-center justify-center p-1">
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            {branding?.logoUrl ? (
                                <img src={branding.logoUrl} alt="Logo" className="h-full w-full object-contain relative z-10" />
                            ) : (
                                <UserCircle className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors relative z-10" />
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 p-2 bg-card/95 backdrop-blur-xl border-border shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] rounded-2xl animate-in zoom-in-95 duration-200" align="end" forceMount>
                        <DropdownMenuLabel className="p-3 mb-1">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-black text-foreground uppercase tracking-tight italic leading-none">{branding?.tenantName || "ISP Panel"}</p>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none opacity-60">
                                    Painel de Gestão
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-border/50 mx-1" />
                        <div className="py-1">
                            <DropdownMenuItem asChild>
                                <Link href="/settings/security" className="flex items-center px-3 py-2.5 my-0.5 rounded-xl cursor-pointer hover:bg-primary/10 group transition-all">
                                    <div className="w-8 h-8 rounded-lg bg-muted/20 flex items-center justify-center border border-border group-hover:border-primary/20 transition-all overflow-hidden p-1">
                                        {branding?.logoUrl ? (
                                            <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                        ) : (
                                            <UserCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        )}
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-foreground group-hover:text-primary transition-colors">Perfil</p>
                                    </div>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/settings/financial" className="flex items-center px-3 py-2.5 my-0.5 rounded-xl cursor-pointer hover:bg-primary/10 group transition-all">
                                    <div className="w-8 h-8 rounded-lg bg-muted/20 flex items-center justify-center border border-border group-hover:border-primary/20 transition-all">
                                        <Settings className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-foreground group-hover:text-primary transition-colors">Configurações</p>
                                    </div>
                                </Link>
                            </DropdownMenuItem>
                        </div>
                        <DropdownMenuSeparator className="bg-border/50 mx-1" />
                        <DropdownMenuItem
                            className="flex items-center px-3 py-3 mt-1 rounded-xl cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 group transition-all"
                            onClick={async () => await logoutUser()}
                        >
                            <div className="w-8 h-8 rounded-lg bg-destructive/5 flex items-center justify-center border border-destructive/10 group-hover:border-destructive/30 transition-all">
                                <LogOut className="h-4 w-4" />
                            </div>
                            <span className="ml-3 text-[11px] font-black uppercase tracking-widest italic">Sair da Conta</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
