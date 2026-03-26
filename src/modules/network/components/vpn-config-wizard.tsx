"use client"

import * as React from "react"
import { useState } from "react"
import { 
    CheckCircle2, 
    Copy, 
    Terminal, 
    ShieldCheck, 
    Zap, 
    History, 
    Download, 
    ExternalLink,
    AlertCircle,
    Check,
    ChevronRight,
    PlayCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface VpnConfigWizardProps {
    protocol: "WIREGUARD" | "L2TP" | "SSTP";
    tunnelId: string;
    internalIp: string;
    nasVersion?: string;
    nasProtocol?: string;
    config: {
        part1: string;
        part2: string;
        part3: string;
        part4: string;
        fullScript: string;
    };
}

export function VpnConfigWizard({ protocol, tunnelId, internalIp, nasVersion, nasProtocol, config }: VpnConfigWizardProps) {
    const [copied, setCopied] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [viewMode, setViewMode] = useState<"MASTER" | "STEPPER">("MASTER");

    const targetVersion = nasVersion || "v7";
    const targetProtocol = nasProtocol || protocol;

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        toast.success("Copiado com sucesso!");
        setTimeout(() => setCopied(null), 2000);
    };

    const steps = [
        {
            id: 1,
            title: protocol === "WIREGUARD" ? "Interface Tunnel" : "L2TP Client",
            icon: <Terminal className="h-4 w-4" />,
            description: "Cria a interface virtual de gerência.",
            command: config.part1,
        },
        {
            id: 2,
            title: protocol === "WIREGUARD" ? "Peer Routing" : "Security/IPsec",
            icon: <Zap className="h-4 w-4" />,
            description: "Estabelece a conexão com a Cloud.",
            command: config.part2,
        },
        {
            id: 3,
            title: "Radius Auth",
            icon: <ShieldCheck className="h-4 w-4" />,
            description: "Habilita a autenticação centralizada.",
            command: config.part3,
        },
        {
            id: 4,
            title: "Regras de Serviço",
            icon: <PlayCircle className="h-4 w-4" />,
            description: "Aplica regras de rede e firewall.",
            command: config.part4,
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in zoom-in duration-700">
            {/* HERO SECTION: Master Provisioning */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-indigo-500/5 to-primary/10 rounded-[2.5rem] blur-xl opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative bg-slate-950/40 border border-white/5 rounded-[2.5rem] p-10 overflow-hidden">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
                        <div className="space-y-5 text-center lg:text-left">
                            <div className="flex flex-col md:flex-row items-center justify-center lg:justify-start gap-4">
                                <Badge className="bg-primary/10 text-primary border-primary/20 rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-widest">RECOMENDADO</Badge>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Procedimento Zero-Touch</span>
                            </div>
                            <h3 className="text-4xl font-bold text-white tracking-tight leading-none uppercase">Script Mestre</h3>
                            <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-md">
                                Provisionamento completo em um único clique. Este script configura o Túnel, o Radius e as regras de firewall de forma harmonizada.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 w-full lg:w-auto min-w-[320px]">
                            <Button 
                                onClick={() => copyToClipboard(config.fullScript, "master")}
                                className="h-16 px-10 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 text-lg font-bold uppercase gap-4 shadow-xl shadow-white/5 transition-all active:scale-95 group/btn"
                            >
                                {copied === "master" ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />}
                                {copied === "master" ? "Copiado!" : "Copiar Script Único"}
                            </Button>
                            <Button 
                                variant="ghost"
                                onClick={() => setViewMode(viewMode === "MASTER" ? "STEPPER" : "MASTER")}
                                className="text-slate-500 hover:text-white font-bold uppercase text-[10px] tracking-widest gap-2 bg-white/5 md:bg-transparent"
                            >
                                {viewMode === "MASTER" ? "Ver passos manuais" : "Voltar para Master"} <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* STEP-BY-STEP FLOW (Optional/Validation) */}
            {viewMode === "STEPPER" && (
                <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {steps.map((step) => (
                            <div 
                                key={step.id}
                                onClick={() => setCurrentStep(step.id)}
                                className={cn(
                                    "p-6 rounded-[2rem] border transition-all cursor-pointer",
                                    currentStep === step.id ? "bg-slate-900 border-primary/30" : "bg-slate-950/40 border-white/5 opacity-60"
                                )}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={cn(
                                        "h-8 w-8 rounded-lg flex items-center justify-center border",
                                        currentStep === step.id ? "bg-primary text-slate-950 border-white/20" : "bg-slate-900 border-white/5"
                                    )}>
                                        {step.icon}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Passo {step.id}</span>
                                </div>
                                <p className="text-[11px] font-bold text-slate-300 leading-tight mb-4">{step.title}</p>
                                {currentStep === step.id && (
                                    <Button 
                                        size="sm" 
                                        onClick={(e) => { e.stopPropagation(); copyToClipboard(step.command, `step${step.id}`); }}
                                        className="w-full h-10 rounded-xl bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest gap-2"
                                    >
                                        <Copy className="h-3 w-3" /> {copied === `step${step.id}` ? "Copiado" : "Copiar"}
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CONNECTION STATUS FOOTER */}
            <div className="p-8 bg-slate-950/20 rounded-3xl border border-white/5 flex flex-col lg:flex-row items-center justify-between gap-8 h-auto lg:h-32">
                 <div className="flex items-center gap-5">
                    <div className="relative">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-lg animate-pulse"></div>
                        <div className="h-5 w-5 bg-emerald-500 rounded-full border-4 border-slate-950 relative z-10 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest leading-none mb-1.5">Handshake Status</p>
                        <p className="text-sm font-bold text-white uppercase tracking-tight">Aguardando Conexão da RB...</p>
                    </div>
                 </div>

                 <div className="flex flex-wrap items-center justify-center lg:justify-end gap-10">
                    <div className="text-center md:text-right">
                        <p className="text-[10px] font-bold uppercase text-slate-600 tracking-widest mb-1.5">Ponto de Presença (PoP)</p>
                        <p className="text-[13px] font-bold text-slate-400">SAO-01 (São Paulo, BR)</p>
                    </div>
                    <Separator orientation="vertical" className="hidden lg:block h-10 bg-white/5" />
                    <div className="text-center md:text-right">
                        <p className="text-[10px] font-bold uppercase text-slate-600 tracking-widest mb-1.5">Gateway Interno</p>
                        <Badge className="bg-primary/5 text-primary border-primary/20 rounded-lg px-3 py-1 font-mono font-bold text-xs ring-1 ring-primary/20">
                            10.255.0.1
                        </Badge>
                    </div>
                 </div>
            </div>
        </div>
    );
}
