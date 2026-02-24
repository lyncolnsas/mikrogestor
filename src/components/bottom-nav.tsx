
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    CircleDollarSign,
    Menu as MenuIcon
} from "lucide-react";
import { useState } from "react";
import { MobileNav } from "./mobile-nav";

export function BottomNav() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navItems = [
        { label: "Início", href: "/overview", icon: LayoutDashboard },
        { label: "Clientes", href: "/customers", icon: Users },
        { label: "Finan.", href: "/financial/dashboard", icon: CircleDollarSign },
    ];

    return (
        <>
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around z-40 pb-safe">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-transform",
                                isActive
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                            )}
                        >
                            <item.icon className={cn("h-6 w-6", isActive && "fill-current opacity-20")} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}

                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="flex flex-col items-center justify-center w-full h-full gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 active:scale-95 transition-transform"
                >
                    <MenuIcon className="h-6 w-6" strokeWidth={2} />
                    <span className="text-[10px] font-medium">Menu</span>
                </button>
            </div>

            {/* Reusing existing MobileNav logic but triggered via state if needed, 
                or we can just keep MobileNav as is in the layout and trigger it differently. 
                Actually, the existing MobileNav button is in the header. 
                Let's reuse the MobileNav component but pass the open state or trigger it?
                
                Wait, the MobileNav component manages its own state internally usually. 
                Let's modify MobileNav to accept external control or just use a shared context?
                For simplicity in this step without refactoring everything, I will make MobileNav 
                export specific Drawer content or I see MobileNav has its own button.
                
                Let's check MobileNav code again. It has internal state.
                I will modify MobileNav to accept props for controlled state, OR make BottomNav simply trigger it.
                
                Better yet: Let's modify MobileNav to export a Controlled version or just include the drawer here?
                Actually, the best approach is to modify MobileNav to `export function MobileNav({ isOpen, onOpenChange })` 
                but that breaks the Header usage.

                Let's stick to the plan: BottomNav just Links. 
                For the "Menu" button, it opens the "More" drawer.
                
                Let's assume for now I will modify MobileNav to expose its Drawer independently to be cleaner, 
                OR I will just duplicate the Drawer logic here for the Menu button if I can't easily share.
                
                Actually, looking at `mobile-nav.tsx`, it's self-contained with a header button.
                I will modify `MobileNav` to optionaly be controlled or expose the content.
            */}
            <MobileNav
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />
        </>
    );
}
