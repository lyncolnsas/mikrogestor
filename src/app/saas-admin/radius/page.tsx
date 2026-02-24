"use client";

import { useQuery } from "@tanstack/react-query";
import { getGlobalRadiusMetrics, getGlobalRadiusSessions, disconnectGlobalRadiusUser } from "@/modules/saas/actions/radius-saas.actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Wifi,
    Users,
    Globe,
    ArrowUpCircle,
    ArrowDownCircle,
    Server,
    Search,
    RefreshCcw,
    ShieldOff
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface RadiusMetrics {
    activeCount: number;
    totalTraffic: {
        input: number | bigint;
        output: number | bigint;
    };
    topNas: Array<{
        ip: string;
        count: number;
        tenantName: string;
    }>;
}

interface RadiusSession {
    radacctid: string | bigint;
    username: string;
    nasipaddress: string;
    framedipaddress: string | null;
    acctstarttime: Date | string;
    acctsessiontime: number;
    acctinputoctets: number | bigint;
    acctoutputoctets: number | bigint;
    tenantName: string;
}

export default function RadiusGlobalPage() {
    const [searchTerm, setSearchTerm] = useState("");

    const { data: metrics, refetch: refetchMetrics } = useQuery<RadiusMetrics>({
        queryKey: ["global-radius-metrics"],
        queryFn: async () => {
            const res = await getGlobalRadiusMetrics(null);
            return res.data as RadiusMetrics;
        }
    });

    const { data: sessions = [], refetch: refetchSessions } = useQuery<RadiusSession[]>({
        queryKey: ["global-radius-sessions"],
        queryFn: async () => {
            const res = await getGlobalRadiusSessions(null);
            return (res.data || []) as RadiusSession[];
        },
        refetchInterval: 10000 // Refresh every 10s
    });

    const handleDisconnect = async (username: string, nasIp: string) => {
        try {
            const res = await disconnectGlobalRadiusUser({ username, nasIp });
            if (res.error) throw new Error(res.error);
            toast.success(`Comando PoD enviado para ${username}`);
            refetchSessions();
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Erro ao desconectar usuário.");
        }
    };

    const formatBytes = (bytes: string | number | bigint) => {
        let b: number;
        if (typeof bytes === 'string') {
            b = parseInt(bytes);
        } else if (typeof bytes === 'bigint') {
            b = Number(bytes);
        } else {
            b = bytes;
        }

        if (b === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(b) / Math.log(k));
        return parseFloat((b / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const filteredSessions = sessions.filter((s) =>
        s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.tenantName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <Wifi className="h-8 w-8 text-blue-600" /> RADIUS Global Auth
                    </h1>
                    <p className="text-muted-foreground mt-1 font-medium">Monitoramento de sessões PPP/Hotspot em toda a rede SaaS.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => { refetchMetrics(); refetchSessions(); }}
                        className="rounded-xl font-bold h-12 gap-2 border-slate-200"
                    >
                        <RefreshCcw className="h-4 w-4" /> Atualizar
                    </Button>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-none shadow-xl rounded-2xl bg-white dark:bg-slate-950 p-6">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sessões Ativas</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{metrics?.activeCount || 0}</h3>
                        </div>
                        <Users className="h-8 w-8 text-blue-500 opacity-20" />
                    </div>
                </Card>
                <Card className="border-none shadow-xl rounded-2xl bg-white dark:bg-slate-950 p-6">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Download Total (30d)</p>
                            <h3 className="text-2xl font-black text-emerald-600 italic tracking-tighter">
                                {formatBytes(metrics?.totalTraffic?.output || 0)}
                            </h3>
                        </div>
                        <ArrowDownCircle className="h-8 w-8 text-emerald-500 opacity-20" />
                    </div>
                </Card>
                <Card className="border-none shadow-xl rounded-2xl bg-white dark:bg-slate-950 p-6">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload Total (30d)</p>
                            <h3 className="text-2xl font-black text-blue-600 italic tracking-tighter">
                                {formatBytes(metrics?.totalTraffic?.input || 0)}
                            </h3>
                        </div>
                        <ArrowUpCircle className="h-8 w-8 text-blue-500 opacity-20" />
                    </div>
                </Card>
                <Card className="border-none shadow-xl rounded-2xl bg-slate-900 p-6 text-white">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ISPs Conectados</p>
                            <h3 className="text-3xl font-black">{metrics?.topNas?.length || 0}</h3>
                        </div>
                        <Globe className="h-8 w-8 text-blue-500 opacity-20" />
                    </div>
                </Card>
            </div>

            {/* Sessions Table */}
            <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white dark:bg-slate-950">
                <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl font-black tracking-tight uppercase">Sessões em Tempo Real</CardTitle>
                        <CardDescription>Visualizando as 50 sessões mais recentes em todos os ISPs.</CardDescription>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Filtrar por usuário ou ISP..."
                            className="pl-10 h-10 rounded-xl bg-slate-50 border-none font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário / ISP</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço IP</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Início / Tempo</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tráfego</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {filteredSessions.map((s) => (
                                    <tr key={s.radacctid} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group">
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="font-extrabold text-slate-900 dark:text-white">{s.username}</span>
                                                <span className="text-[10px] font-bold text-blue-500 uppercase flex items-center gap-1">
                                                    <Server className="h-3 w-3" /> {s.tenantName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-sm font-mono font-bold text-slate-600">
                                            {s.framedipaddress || "N/A"}
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-500">
                                                    {new Date(s.acctstarttime).toLocaleTimeString()}
                                                </span>
                                                <Badge variant="outline" className="w-fit text-[10px] h-5 mt-1 border-blue-100 text-blue-600">
                                                    {Math.floor(s.acctsessiontime / 3600)}h {Math.floor((s.acctsessiontime % 3600) / 60)}m
                                                </Badge>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                                                    <ArrowDownCircle className="h-3.5 w-3.5" />
                                                    {formatBytes(s.acctoutputoctets)}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
                                                    <ArrowUpCircle className="h-3.5 w-3.5" />
                                                    {formatBytes(s.acctinputoctets)}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDisconnect(s.username, s.nasipaddress)}
                                                className="h-10 w-10 p-0 rounded-xl hover:bg-red-50 hover:text-red-500 text-slate-400 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <ShieldOff className="h-5 w-5" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredSessions.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-400 font-medium italic">
                                            Nenhuma sessão ativa encontrada.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
