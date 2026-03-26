"use client"

import { useState } from "react";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle, 
    SheetTrigger 
} from "@/components/ui/sheet";
import { 
    MessageCircle, 
    CheckCircle2, 
    Clock, 
    Trash2, 
    Phone, 
    User,
    ArrowUpRight
} from "lucide-react";
import { resolveTicketAction, deleteTicketAction } from "@/modules/customers/actions/support.actions";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function SupportClientPage({ initialTickets }: { initialTickets: any[] }) {
    const [tickets, setTickets] = useState(initialTickets);

    async function handleResolve(id: string) {
        try {
            await resolveTicketAction(id);
            setTickets(prev => prev.map(t => t.id === id ? { ...t, status: "RESOLVED" } : t));
            toast.success("Ticket finalizado com sucesso!");
        } catch (err) {
            toast.error("Erro ao finalizar ticket.");
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Tem certeza que deseja excluir este ticket?")) return;
        try {
            await deleteTicketAction(id);
            setTickets(prev => prev.filter(t => t.id !== id));
            toast.success("Ticket excluído.");
        } catch (err) {
            toast.error("Erro ao excluir.");
        }
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">
                        Central de Tickets <span className="text-blue-600">Bot WhatsApp</span>
                    </h1>
                    <p className="text-slate-500 font-medium font-outfit uppercase tracking-widest text-[11px]">Gerencie todos os atendimentos gerados através das automações.</p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <StatCard 
                    title="Abertos Agora" 
                    count={tickets.filter(t => t.status === "OPEN").length} 
                    icon={<Clock className="text-amber-500" />} 
                />
                <StatCard 
                    title="Finalizados" 
                    count={tickets.filter(t => t.status === "RESOLVED").length} 
                    icon={<CheckCircle2 className="text-emerald-500" />} 
                />
                <StatCard 
                  title="Historico Mensal" 
                  count={tickets.length} 
                  icon={<MessageCircle className="text-blue-500" />} 
                />
            </div>

            <div className="bg-white dark:bg-slate-950 border rounded-3xl overflow-hidden shadow-2xl shadow-blue-500/5">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                        <TableRow className="border-b border-slate-100 dark:border-slate-800 h-16">
                            <TableHead className="font-black text-xs uppercase text-slate-500 tracking-widest p-6">Protocolo / Cliente</TableHead>
                            <TableHead className="font-black text-xs uppercase text-slate-500 tracking-widest">Suporte / Descrição</TableHead>
                            <TableHead className="font-black text-xs uppercase text-slate-500 tracking-widest text-center">Status</TableHead>
                            <TableHead className="font-black text-xs uppercase text-slate-500 tracking-widest text-right p-6">Atendimento</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tickets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-64 text-center text-slate-400 font-medium">
                                    Aguardando novos chamados do Robô... 👋🏼✨
                                </TableCell>
                            </TableRow>
                        ) : (
                            tickets.map(ticket => (
                                <TableRow key={ticket.id} className="border-b border-slate-50 dark:border-slate-900 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors h-24">
                                    <TableCell className="p-6">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-black text-blue-600 text-sm tracking-tighter">#{ticket.protocol}</span>
                                            <span className="font-black text-slate-900 dark:text-white uppercase italic tracking-tight">{ticket.customer.name}</span>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                                <Phone className="h-3 w-3" />
                                                <span>{ticket.customer.phone}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-[300px] space-y-1">
                                            <p className="font-black text-slate-900 dark:text-white uppercase text-[12px]">{ticket.subject}</p>
                                            <p className="text-slate-500 text-sm font-medium line-clamp-1">{ticket.description}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge 
                                            className={ticket.status === "RESOLVED" 
                                              ? "bg-emerald-500/10 text-emerald-600 border-none px-4 py-1.5 font-black uppercase text-[10px]" 
                                              : "bg-amber-500/10 text-amber-600 border-none px-4 py-1.5 font-black uppercase text-[10px]"
                                            }
                                        >
                                            {ticket.status === "OPEN" ? "Aguardando" : "RESOLVIDO"}
                                        </Badge>
                                        <div className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">
                                            {format(new Date(ticket.createdAt), "dd MMM HH:mm", { locale: ptBR })}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right p-6">
                                        <div className="flex justify-end gap-2">
                                            <Sheet>
                                                <SheetTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white transition-all">
                                                        <MessageCircle className="h-6 w-6" />
                                                    </Button>
                                                </SheetTrigger>
                                                <SheetContent className="sm:max-w-md bg-white dark:bg-slate-950 border-none shadow-2xl rounded-l-[3rem]">
                                                    <SheetHeader className="mb-8">
                                                        <SheetTitle className="text-2xl font-black uppercase tracking-tighter italic">Historico <span className="text-blue-600">Bot Chat</span></SheetTitle>
                                                    </SheetHeader>
                                                    
                                                    <div className="space-y-6 flex flex-col h-full">
                                                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                                                            <div className="flex items-start gap-4">
                                                                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-600/10 flex items-center justify-center text-blue-600 shrink-0 border border-blue-200/50">
                                                                    <User className="h-6 w-6" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">DADOS DO CLIENTE</p>
                                                                    <p className="font-black text-slate-900 dark:text-white uppercase italic text-lg leading-none mb-1">{ticket.customer.name}</p>
                                                                    <p className="text-sm font-bold text-slate-500">{ticket.customer.phone}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                                                            <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                                                              <Clock size={12} /> LINHA DO TEMPO DE SUPORTE
                                                            </h4>
                                                            <div className="space-y-4">
                                                                {ticket.messages.map((m: any) => (
                                                                    <div key={m.id} className={`flex flex-col gap-1.5 ${m.sender === 'CUSTOMER' ? 'items-start' : 'items-end'}`}>
                                                                        <div className={`p-4 rounded-3xl text-sm font-bold max-w-[90%] shadow-sm ${
                                                                            m.sender === 'CUSTOMER' ? 'bg-slate-100 text-slate-900 rounded-tl-none' : 'bg-blue-600 text-white rounded-tr-none shadow-blue-500/20'
                                                                        }`}>
                                                                            {m.text}
                                                                        </div>
                                                                        <span className="text-[10px] text-slate-400 font-extrabold px-2 uppercase tracking-widest italic">
                                                                            {m.sender === 'CUSTOMER' ? 'Assinante' : 'Robô Mikrogestor'} • {format(new Date(m.createdAt), "HH:mm")}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {ticket.status === "OPEN" && (
                                                            <div className="pb-8 pt-6 space-y-4">
                                                                <Button 
                                                                    onClick={() => handleResolve(ticket.id)}
                                                                    className="w-full h-16 rounded-[1.25rem] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-xl shadow-emerald-500/20 transition-all active:scale-95 gap-3"
                                                                >
                                                                    <CheckCircle2 size={24} />
                                                                    FINALIZAR CHAMPADO
                                                                </Button>
                                                                <Button 
                                                                    variant="outline"
                                                                    className="w-full h-16 rounded-[1.25rem] border-2 border-slate-100 dark:border-slate-800 font-black text-lg gap-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                                                                    asChild
                                                                >
                                                                    <a href={`https://wa.me/${ticket.customer.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 w-full">
                                                                        ABRIR WHATSAPP HUMANO <ArrowUpRight size={24} />
                                                                    </a>
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </SheetContent>
                                            </Sheet>
                                            <Button 
                                                onClick={() => handleDelete(ticket.id)}
                                                variant="ghost" 
                                                size="icon" 
                                                className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-600/10 text-rose-600 hover:bg-rose-600 hover:text-white transition-all"
                                            >
                                                <Trash2 className="h-6 w-6" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function StatCard({ title, count, icon }: { title: string, count: number, icon: React.ReactNode }) {
    return (
        <div className="p-8 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-[2.5rem] shadow-2xl shadow-blue-500/[0.03] space-y-4 group hover:border-blue-500/30 transition-all">
            <div className="flex justify-between items-start">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] group-hover:text-blue-600 transition-colors">{title}</p>
                <div className="h-10 w-10 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 transition-transform group-hover:rotate-12">
                    {icon}
                </div>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{count}</span>
            </div>
        </div>
    );
}
