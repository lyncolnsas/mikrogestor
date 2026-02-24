"use client"

import * as React from "react"
import {
    Wrench,
    MapPin,
    Clock,
    ChevronRight,
    AlertTriangle,
    CheckCircle2,
    Calendar
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface ServiceOrder {
    id: string
    type: "INSTALACAO" | "REPARO" | "RETIRADA"
    customer: string
    address: string
    priority: "ALTA" | "MEDIA" | "BAIXA"
    time: string
    status: "PENDENTE" | "EM_DESLOCAMENTO" | "EM_ATENDIMENTO"
}

export function ServiceOrderList() {
    const orders: ServiceOrder[] = [
        {
            id: "OS-4421",
            type: "INSTALACAO",
            customer: "Marcos Oliveira",
            address: "Rua das Flores, 120 - Apto 42",
            priority: "ALTA",
            time: "09:00 - 11:00",
            status: "PENDENTE"
        },
        {
            id: "OS-4425",
            type: "REPARO",
            customer: "Sueli Mendonça",
            address: "Av. Brasil, 1500 - Bloco B",
            priority: "MEDIA",
            time: "11:00 - 13:00",
            status: "PENDENTE"
        }
    ]

    return (
        <div className="space-y-4 p-2">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-sm font-bold uppercase tracking-tight text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Tarefas de Hoje
                </h2>
                <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px]">2 Ordens</Badge>
            </div>

            <div className="space-y-3">
                {orders.map((order) => (
                    <Link key={order.id} href={`/technician/tasks/${order.id}`}>
                        <div className="bg-card border rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all hover:border-primary/50 relative overflow-hidden group mb-3">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "h-8 w-8 rounded-lg flex items-center justify-center",
                                        order.type === "INSTALACAO" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                                    )}>
                                        {order.type === "INSTALACAO" ? <Wrench className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-muted-foreground leading-none">{order.type}</p>
                                        <p className="font-bold text-sm mt-1">{order.id}</p>
                                    </div>
                                </div>
                                <Badge className={cn(
                                    "text-[10px] font-bold",
                                    order.priority === "ALTA" ? "bg-rose-500" : "bg-amber-500"
                                )}>
                                    {order.priority}
                                </Badge>
                            </div>

                            <div className="space-y-2">
                                <p className="font-bold text-slate-900 dark:text-slate-100">{order.customer}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{order.address}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3 shrink-0" />
                                    <span>Janela: {order.time}</span>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between pt-3 border-t border-dashed">
                                <div className="flex items-center gap-1.5">
                                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-amber-600 uppercase">Aguardando Início</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="pt-8 pb-4 text-center">
                <p className="text-xs text-muted-foreground italic">Fim da lista para hoje.</p>
            </div>
        </div>
    )
}
