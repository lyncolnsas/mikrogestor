import { PlusCircle, ListTodo, Map } from "lucide-react"
import Link from "next/link"

export default function TechnicianLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
            <header className="p-4 bg-card border-b font-bold text-center text-primary tracking-tight">
                MIKROGESTOR <span className="text-muted-foreground font-light text-xs">TÉCNICO</span>
            </header>
            <main className="flex-1 overflow-x-hidden">
                {children}
            </main>

            {/* Bottom Nav - Optimized for one-hand usage */}
            <footer className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t flex items-center justify-around z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                <Link href="/(technician)/activation/new" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                    <PlusCircle className="h-6 w-6" />
                    <span className="text-[10px] font-bold uppercase">Ativar</span>
                </Link>
                <Link href="/(technician)/tasks" className="flex flex-col items-center gap-1 text-primary">
                    <ListTodo className="h-6 w-6" />
                    <span className="text-[10px] font-bold uppercase">Tarefas</span>
                </Link>
                <Link href="#" className="flex flex-col items-center gap-1 text-muted-foreground opacity-50">
                    <Map className="h-6 w-6" />
                    <span className="text-[10px] font-bold uppercase">Mapa</span>
                </Link>
            </footer>
        </div>
    );
}

