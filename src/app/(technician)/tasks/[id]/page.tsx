"use client"

import * as React from "react"
import {
    ChevronLeft,
    MapPin,
    Phone,
    Info,
    Navigation,
    CheckCircle2,
    FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { use } from "react"

export default function ServiceOrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [status, setStatus] = React.useState<"PENDENTE" | "EM_DESLOCAMENTO" | "EM_ATENDIMENTO" | "CONCLUIDA">("PENDENTE")

    // Mock OS data
    const os = {
        id,
        type: "INSTALACAO" as const,
        customer: "Marcos Oliveira",
        phone: "(11) 97765-4321",
        address: "Rua das Flores, 120 - Apto 42, Bairro Jardim, São Paulo - SP",
        priority: "ALTA" as const,
        status: status,
        instructions: "Instalar ONU FiberHome. Cliente solicitou roteador na sala. Testar sinal no quarto fundo."
    }

    return (
        <div className="flex flex-col min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 pb-20">
            <div className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                    <Link href="/technician/tasks">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h1 className="font-bold flex items-center gap-2">Detalhes da Ordem <Badge variant="outline">{os.id}</Badge></h1>
                </div>

                <Card className={cn(
                    "rounded-2xl shadow-sm border-none text-primary-foreground overflow-hidden transition-colors duration-500",
                    status === "CONCLUIDA" ? "bg-emerald-600" : "bg-primary"
                )}>
                    <CardContent className="p-6 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Status Atual</p>
                                <h2 className="text-xl font-bold">
                                    {status === "PENDENTE" && "Aguardando Início"}
                                    {status === "EM_DESLOCAMENTO" && "Em Deslocamento"}
                                    {status === "EM_ATENDIMENTO" && "Em Atendimento"}
                                    {status === "CONCLUIDA" && "OS Finalizada ✅"}
                                </h2>
                            </div>
                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm">
                                {os.priority} PRIORIDADE
                            </Badge>
                        </div>
                        <div className="flex gap-2">
                            {status === "PENDENTE" && (
                                <Button
                                    className="flex-1 bg-white text-primary hover:bg-slate-100 font-bold rounded-xl h-12 shadow-lg"
                                    onClick={() => setStatus("EM_DESLOCAMENTO")}
                                >
                                    Iniciar Deslocamento
                                </Button>
                            )}
                            {status === "EM_DESLOCAMENTO" && (
                                <Button
                                    className="flex-1 bg-white text-primary hover:bg-slate-100 font-bold rounded-xl h-12 shadow-lg"
                                    onClick={() => setStatus("EM_ATENDIMENTO")}
                                >
                                    Cheguei no Local
                                </Button>
                            )}
                            {status === "EM_ATENDIMENTO" && (
                                <Button
                                    className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600 font-bold rounded-xl h-12 shadow-lg border-white/20 border"
                                    onClick={() => setStatus("CONCLUIDA")}
                                >
                                    Finalizar Ordem
                                </Button>
                            )}
                            {status === "CONCLUIDA" && (
                                <Button asChild className="flex-1 bg-white/20 text-white hover:bg-white/30 font-bold rounded-xl h-12">
                                    <Link href="/technician/tasks">Voltar para a Lista</Link>
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <div className="bg-card border rounded-2xl p-5 space-y-4 shadow-sm">
                        <h3 className="text-sm font-bold flex items-center gap-2 border-b pb-2">
                            <Info className="h-4 w-4 text-primary" /> Dados do Cliente
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">{os.customer}</span>
                                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full text-emerald-500 border-emerald-500/20 bg-emerald-500/5">
                                    <Phone className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex gap-3 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                                <span className="leading-tight">{os.address}</span>
                            </div>
                            <Button variant="secondary" className="w-full h-10 rounded-xl gap-2 text-primary font-bold">
                                <Navigation className="h-4 w-4" /> Abrir no Google Maps
                            </Button>
                        </div>
                    </div>

                    <div className="bg-card border rounded-2xl p-5 space-y-4 shadow-sm">
                        <h3 className="text-sm font-bold flex items-center gap-2 border-b pb-2">
                            <FileText className="h-4 w-4 text-primary" /> Instruções Técnicas
                        </h3>
                        <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-dashed italic leading-relaxed">
                            &quot;{os.instructions}&quot;
                        </p>
                    </div>

                    <div className="bg-card border rounded-2xl p-5 space-y-4 shadow-sm">
                        <h3 className="text-sm font-bold flex items-center gap-2 border-b pb-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" /> Checklist de Ativação
                        </h3>
                        <div className="space-y-2">
                            <CheckItem label="ONU Conectada e Sincronizada" checked={false} />
                            <CheckItem label="Sinal Óptico (RX) entre -15 e -25 dBm" checked={false} />
                            <CheckItem label="Navegação testada em Cabo/Wifi" checked={false} />
                        </div>
                    </div>

                    {status === "EM_ATENDIMENTO" && (
                        <Card className="rounded-2xl border-indigo-200 bg-indigo-50/50 shadow-sm overflow-hidden">
                            <CardContent className="p-6 text-center space-y-4">
                                <p className="text-xs font-black uppercase text-indigo-600 tracking-widest">Procedimento Técnico</p>
                                <h3 className="font-bold">Aparelho pronto para registro?</h3>
                                <Button asChild className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 text-lg font-bold">
                                    <Link href={`/technician/activation/new?customerId=${os.id}`}>
                                        Iniciar Ativação de Rede
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}

function CheckItem({ label, checked }: { label: string, checked: boolean }) {
    return (
        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-transparent hover:border-primary/20 transition-colors">
            <div className={cn(
                "h-5 w-5 rounded border-2 flex items-center justify-center shrink-0",
                checked ? "bg-primary border-primary" : "border-muted-foreground/30"
            )}>
                {checked && <CheckCircle2 className="h-3 w-3 text-white" />}
            </div>
            <span className="text-xs font-medium">{label}</span>
        </div>
    )
}
