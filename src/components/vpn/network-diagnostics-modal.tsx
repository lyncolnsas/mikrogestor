"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Activity, Loader2, CheckCircle2, XCircle, Wifi, Network, Route, Globe, Server } from "lucide-react";
import { runVpnNetworkDiagnosticsAction } from "@/modules/saas/actions/vpn-diagnostics.actions";
import type { NetworkDiagnostics } from "@/modules/saas/actions/vpn-diagnostics.actions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export function NetworkDiagnosticsModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [diagnostics, setDiagnostics] = useState<NetworkDiagnostics | null>(null);

    const runDiagnostics = async () => {
        setIsRunning(true);
        setDiagnostics(null);

        try {
            const result = await runVpnNetworkDiagnosticsAction();

            if (result.error) {
                toast.error(result.error);
                return;
            }

            if (result.data) {
                setDiagnostics(result.data);
                const allSuccess = result.data.pingResults.every((r) => r.success);
                if (allSuccess) {
                    toast.success("Todos os testes de conectividade passaram!");
                } else {
                    toast.warning("Alguns testes falharam. Verifique os resultados.");
                }
            }
        } catch (error: any) {
            toast.error("Erro ao executar diagnóstico");
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl font-bold h-10 gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                >
                    <Activity className="h-4 w-4" /> Diagnóstico de Rede
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl rounded-[2.5rem] border-none max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-3">
                        <Wifi className="h-6 w-6 text-emerald-500" /> Diagnóstico Completo de Rede VPN
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 font-bold">
                        Informações detalhadas sobre IP, DNS, rotas e conectividade do container VPN.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <Button
                        onClick={runDiagnostics}
                        disabled={isRunning}
                        className="w-full rounded-2xl font-bold bg-emerald-500 hover:bg-emerald-600 gap-2 h-12"
                    >
                        {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isRunning ? "Executando Diagnóstico Completo..." : "Iniciar Diagnóstico"}
                    </Button>

                    {diagnostics && (
                        <div className="space-y-6">
                            {/* Network Info Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                    <Network className="h-4 w-4" /> Informações de Rede
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Internal IP */}
                                    <div className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-200">
                                        <p className="text-xs font-black uppercase text-blue-600 mb-1">IP Interno (Container)</p>
                                        <p className="text-lg font-mono font-bold text-blue-900">{diagnostics.networkInfo.internalIp}</p>
                                    </div>

                                    {/* External IP */}
                                    <div className="p-4 bg-purple-50 rounded-2xl border-2 border-purple-200">
                                        <p className="text-xs font-black uppercase text-purple-600 mb-1 flex items-center gap-1">
                                            <Globe className="h-3 w-3" /> IP Externo (Público)
                                        </p>
                                        <p className="text-lg font-mono font-bold text-purple-900">
                                            {diagnostics.networkInfo.externalIp || "N/A"}
                                        </p>
                                    </div>

                                    {/* Gateway */}
                                    <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-200">
                                        <p className="text-xs font-black uppercase text-amber-600 mb-1">Gateway Padrão</p>
                                        <p className="text-lg font-mono font-bold text-amber-900">{diagnostics.networkInfo.gateway}</p>
                                    </div>

                                    {/* Network Mode */}
                                    <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-200">
                                        <p className="text-xs font-black uppercase text-emerald-600 mb-1 flex items-center gap-1">
                                            <Server className="h-3 w-3" /> Modo de Rede Docker
                                        </p>
                                        <Badge className="bg-emerald-600 text-white font-mono text-sm">
                                            {diagnostics.networkInfo.networkMode}
                                        </Badge>
                                    </div>
                                </div>

                                {/* DNS Servers */}
                                <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200">
                                    <p className="text-xs font-black uppercase text-slate-600 mb-2">Servidores DNS</p>
                                    <div className="flex flex-wrap gap-2">
                                        {diagnostics.networkInfo.dnsServers.length > 0 ? (
                                            diagnostics.networkInfo.dnsServers.map((dns, i) => (
                                                <Badge key={i} variant="secondary" className="font-mono">
                                                    {dns}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-sm text-slate-400 italic">Nenhum DNS configurado</span>
                                        )}
                                    </div>
                                </div>

                                {/* Routes */}
                                <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200">
                                    <p className="text-xs font-black uppercase text-slate-600 mb-2 flex items-center gap-1">
                                        <Route className="h-3 w-3" /> Tabela de Rotas (Top 5)
                                    </p>
                                    <div className="space-y-1">
                                        {diagnostics.networkInfo.routes.map((route, i) => (
                                            <code key={i} className="block text-xs font-mono text-slate-700 bg-white px-2 py-1 rounded">
                                                {route}
                                            </code>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Ping Results */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">
                                    Testes de Conectividade (Ping)
                                </h3>
                                {diagnostics.pingResults.map((result, index) => (
                                    <div
                                        key={index}
                                        className={`flex items-center justify-between p-4 rounded-2xl border-2 ${result.success
                                                ? "bg-emerald-50 border-emerald-200"
                                                : "bg-red-50 border-red-200"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {result.success ? (
                                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-red-600" />
                                            )}
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{result.target}</p>
                                                {result.error && (
                                                    <p className="text-xs text-red-600 font-medium">{result.error}</p>
                                                )}
                                            </div>
                                        </div>
                                        {result.latency && (
                                            <div className="text-right">
                                                <p className="text-xs font-black uppercase text-slate-400">Latência</p>
                                                <p className="text-lg font-bold text-emerald-600">
                                                    {result.latency.toFixed(1)} ms
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Traceroute */}
                            {diagnostics.traceroute && diagnostics.traceroute.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                        <Route className="h-4 w-4" /> Traceroute para 8.8.8.8
                                    </h3>
                                    <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200">
                                        <div className="space-y-2">
                                            {diagnostics.traceroute.map((hop) => (
                                                <div key={hop.hop} className="flex items-center gap-3 text-sm">
                                                    <Badge variant="outline" className="w-8 justify-center font-mono">
                                                        {hop.hop}
                                                    </Badge>
                                                    <code className="flex-1 font-mono text-slate-700">{hop.ip}</code>
                                                    {hop.latency && (
                                                        <span className="text-xs font-bold text-emerald-600">{hop.latency}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Diagnostic Interpretation */}
                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
                                <p className="text-xs font-black uppercase text-blue-600 mb-2">
                                    📊 Interpretação dos Resultados
                                </p>
                                {diagnostics.pingResults.every((r) => r.success) ? (
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold text-blue-900">
                                            ✅ Container tem conectividade total ({diagnostics.networkInfo.networkMode} mode).
                                        </p>
                                        <p className="text-sm font-bold text-blue-900">
                                            O problema do handshake VPN está em outro lugar: firewall do host, configuração do
                                            cliente, ou porta UDP 51820 bloqueada.
                                        </p>
                                    </div>
                                ) : diagnostics.pingResults.every((r) => !r.success) ? (
                                    <p className="text-sm font-bold text-red-900">
                                        ❌ Container está ISOLADO da rede. Verifique a configuração de rede do Docker
                                        (docker-compose.yml, network mode, DNS settings).
                                    </p>
                                ) : (
                                    <p className="text-sm font-bold text-amber-900">
                                        ⚠️ Conectividade parcial. Alguns alvos estão acessíveis, outros não. Pode ser problema
                                        de DNS ou roteamento seletivo.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
