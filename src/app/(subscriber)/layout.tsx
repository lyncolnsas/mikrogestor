"use client"

import { LogOut, User, Home, HelpCircle, CreditCard } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LogoutButton } from "@/components/subscriber/logout-button"

export default function SubscriberLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Top Bar */}
            <header className="h-16 px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-black text-lg">M</span>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white tracking-tighter">MIKROGESTOR <span className="text-indigo-600 font-light">ASSINANTE</span></span>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" asChild>
                        <Link href="/profile">
                            <User className="h-5 w-5 text-slate-400" />
                        </Link>
                    </Button>
                    <LogoutButton variant="ghost" className="hidden md:flex text-slate-500 font-bold hover:text-red-600 hover:bg-red-50" />
                    <Button variant="ghost" size="icon" className="md:hidden rounded-full h-9 w-9" asChild>
                        <Link href="/auth/login">
                            <HelpCircle className="h-5 w-5 text-slate-400" />
                        </Link>
                    </Button>
                </div>
            </header>

            <main className="flex-1 px-3 pb-24 md:pb-8 overflow-x-hidden w-full">
                {children}
            </main>

            {/* Bottom Navigation for Mobile */}
            <nav className="md:hidden fixed bottom-4 left-4 right-4 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/50 rounded-2xl flex items-center justify-around z-50 px-2 shadow-2xl shadow-indigo-500/10">
                <NavButton icon={<Home className="h-5 w-5" />} label="Início" href="/portal" />
                <NavButton icon={<CreditCard className="h-5 w-5" />} label="Faturas" href="/portal#invoices" />
                <NavButton icon={<User className="h-5 w-5" />} label="Perfil" href="/profile" />
                <LogoutNavButton icon={<LogOut className="h-5 w-5" />} label="Sair" />
            </nav>
        </div>
    );
}

function NavButton({ icon, label, href, active = false }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) {
    return (
        <Link href={href} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-indigo-600 scale-110 font-black' : 'text-slate-400 font-medium'}`}>
            {icon}
            <span className="text-[10px] uppercase tracking-tighter">{label}</span>
        </Link>
    )
}

function LogoutNavButton({ icon, label }: { icon: React.ReactNode, label: string }) {
    return (
        <button
            onClick={() => logoutSubscriber()}
            className="flex flex-col items-center gap-1 transition-all text-slate-400 font-medium active:text-red-600"
        >
            {icon}
            <span className="text-[10px] uppercase tracking-tighter">{label}</span>
        </button>
    )
}

import { logoutSubscriber } from "@/modules/customers/actions/auth.actions"
