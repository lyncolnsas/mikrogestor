"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Activity,
    MessageSquare,
    Wifi,
    Database,
    ShieldCheck,
    AlertCircle,
    RefreshCcw,
    Clock,
    Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { getServiceStatus, getConnectedVpnPeers } from "@/modules/saas/actions/monitors.actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MonitorsPage() {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [data, setData] = useState<any>(null);
    const [vpnPeers, setVpnPeers] = useState<any[]>([]);
    const [isPeersOpen, setIsPeersOpen] = useState(false);

    const refresh = async () => {
        setIsRefreshing(true);
        try {
            const res = await getServiceStatus();
            if (res.data) setData(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsRefreshing(false);
        }
    };

    const loadPeers = async () => {
        setIsPeersOpen(true);
        const res = await getConnectedVpnPeers();
        if (res.data) setVpnPeers(res.data);
    };

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 30000); // 30s auto-refresh
        return () => clearInterval(interval);
    }, []);

    const services = data ? [
        {
            name: "WhatsApp SaaS Gateway",
            status: data?.whatsapp?.status || "OFFLINE",
            uptime: data?.whatsapp?.uptime || "0%",
            latency: data?.whatsapp?.latency || "0ms",
            icon: MessageSquare,
            color: data?.whatsapp?.status === "ONLINE" ? "emerald" : "rose",
            description: "Serviço de envio de notificações globais e cobranças."
        },
        {
            name: "RADIUS Auth Server",
            status: data?.radius?.status || "OFFLINE",
            uptime: data?.radius?.uptime || "0%",
            latency: data?.radius?.latency || "0ms",
            meta: `${data?.radius?.activeSessions || 0} Sessões Ativas`,
            icon: Wifi,
            color: "blue",
            description: "Autenticação centralizada para conexões ISP."
        },
        {
            name: "Main Database (Prisma)",
            status: data?.database?.status || "OFFLINE",
            uptime: data?.database?.uptime || "0%",
            latency: data?.database?.latency || "0ms",
            icon: Database,
            color: "emerald",
            description: "Banco de dados relacional (Tenancy-Aware)."
        },
        {
            name: "VPN Provisioning Manager",
            status: data?.vpn?.status || "OFFLINE",
            uptime: data?.vpn?.uptime || "0%",
            latency: data?.vpn?.latency || "0ms",
            meta: `${data?.vpn?.connectedPeers || 0} Nodos Conectados`,
            icon: ShieldCheck,
            color: data?.vpn?.status === "ONLINE" ? "emerald" : "amber",
            description: "Orquestrador de nodos WireGuard.",
            action: (
                <Button variant="link" className="h-4 p-0 text-xs" onClick={loadPeers}>
                    Ver Conectados
                </Button>
            )
        }
    ] : [];

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <Activity className="h-8 w-8 text-emerald-500" /> Monitores de Serviço
                    </h1>
                    <p className="text-muted-foreground mt-1 font-medium">Status em tempo real de toda a infraestrutura Microgestor.</p>
                </div>
                <Button
                    variant="outline"
                    className="rounded-xl font-bold h-12 gap-2 border-slate-200"
                    onClick={refresh}
                    disabled={isRefreshing}
                >
                    <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Sincronizar Agora
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {!data ? (
                    // Skeleton Loading
                    [1, 2, 3, 4].map(i => (
                        <div key={i} className="h-48 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    ))
                ) : services.map((service) => (
                    <Card key={service.name} className="border-none shadow-xl rounded-3xl overflow-hidden bg-white dark:bg-slate-950 group">
                        <CardContent className="p-8">
                            <div className="flex justify-between items-start">
                                <div className="space-y-4">
                                    <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-400">
                                        <service.icon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">{service.name}</h3>
                                        <p className="text-xs font-medium text-slate-500 mt-1">{service.description}</p>
                                    </div>
                                </div>
                                <Badge className={`bg-${service.color}-50 text-${service.color}-700 border-${service.color}-200 ring-1 ring-${service.color}-600/20 font-bold px-3 py-1`}>
                                    {service.status}
                                </Badge>
                            </div>

                            <div className="mt-8 grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 space-y-1">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <Clock className="h-3 w-3" /> Uptime 30d
                                    </div>
                                    <p className="text-lg font-black text-slate-900 dark:text-white">{service.uptime}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 space-y-1">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <Activity className="h-3 w-3" /> {service.meta || "Latência"}
                                    </div>
                                    <p className="text-lg font-black text-slate-900 dark:text-white">{service.meta ? service.meta.split(" ")[0] : service.latency}</p>
                                </div>
                            </div>
                            {service.action && <div className="mt-2 flex justify-end">{service.action}</div>}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* VPN Peers Modal */}
            <Dialog open={isPeersOpen} onOpenChange={setIsPeersOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Usuários VPN Conectados (Últimos 3 min)</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        {vpnPeers.length === 0 ? (
                            <p className="text-center text-muted-foreground p-8">Nenhum usuário conectado recentemente.</p>
                        ) : (
                            vpnPeers.map((peer, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                            <Wifi className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{peer.name}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-muted-foreground">{peer.internalIp} • {peer.tenant?.slug}</p>
                                                {peer.lastHandshake && (
                                                    <span className="text-[10px] font-medium px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100">
                                                        Ativo {formatDistanceToNow(new Date(peer.lastHandshake), { addSuffix: true, locale: ptBR })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-mono text-slate-500">RX: {(Number(peer.totalBytesRx) / 1024 / 1024).toFixed(1)} MB</p>
                                        <p className="text-xs font-mono text-slate-500">TX: {(Number(peer.totalBytesTx) / 1024 / 1024).toFixed(1)} MB</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Global Alert System */}
            <div className="p-8 rounded-[2rem] bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-100 dark:border-amber-900/30 flex gap-6 items-center">
                <div className="h-14 w-14 rounded-2xl bg-amber-500 shadow-xl shadow-amber-500/20 flex items-center justify-center shrink-0">
                    <AlertCircle className="h-8 w-8 text-white" />
                </div>
                <div>
                    <h4 className="text-lg font-black text-amber-900 dark:text-amber-400 tracking-tight">Status Geral: Operacional</h4>
                    <p className="text-sm font-medium text-amber-800/70">Nenhum incidente crítico detectado nas últimas 24 horas. Sistema operando em capacidade total.</p>
                </div>
            </div>
        </div>
    );
}
