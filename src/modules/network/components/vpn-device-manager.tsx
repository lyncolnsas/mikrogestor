"use client"

import { useState } from "react";
import {
    ShieldCheck,
    Smartphone,
    Monitor,
    Router,
    Activity,
    Power,
    Trash2,
    Copy,
    Check,
    Clock,
    ArrowDown,
    ArrowUp,
    Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn, formatBytes } from "@/lib/utils";
import { updateVpnTunnelAction, deleteVpnTunnelAction } from "@/modules/saas/actions/vpn-access.actions";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent
} from "@/components/ui/card";

interface VpnTunnel {
    id: string;
    name: string;
    type: "ROUTER" | "MIKROTIK" | "MOBILE" | "PC";
    internalIp: string;
    isActive: boolean;
    lastHandshake: Date | null;
    totalBytesRx: bigint | number;
    totalBytesTx: bigint | number;
    clientPrivateKey: string;
    server: {
        publicEndpoint: string;
        listenPort: number;
        publicKey: string;
    };
}

interface VpnDeviceManagerProps {
    initialTunnels: VpnTunnel[];
    tenantId: string;
    isSuperAdmin?: boolean;
}

export function VpnDeviceManager({ initialTunnels, tenantId, isSuperAdmin = false }: VpnDeviceManagerProps) {
    const [tunnels, setTunnels] = useState<VpnTunnel[]>(initialTunnels);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleToggleStatus = async (tunnelId: string, currentStatus: boolean) => {
        setLoadingId(tunnelId);
        try {
            const result = await updateVpnTunnelAction({ tunnelId, isActive: !currentStatus });
            if (result.data) {
                setTunnels(prev => prev.map(t => t.id === tunnelId ? { ...t, isActive: !currentStatus } : t));
                toast.success(`Dispositivo ${!currentStatus ? 'ativado' : 'desativado'}`);
            } else if (result.error) {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error("Erro ao atualizar status.");
        } finally {
            setLoadingId(null);
        }
    };

    const handleDelete = async (tunnelId: string) => {
        if (!isSuperAdmin) {
            toast.error("Somente administradores globais podem excluir túneis.");
            return;
        }

        const password = prompt("Para excluir um túnel VPN, confirme sua senha de administrador:");
        if (!password) return;

        setLoadingId(tunnelId);
        try {
            const result = await deleteVpnTunnelAction({ tunnelId, password });
            if (result.data?.success) {
                setTunnels(prev => prev.filter(t => t.id !== tunnelId));
                toast.success("Túnel VPN removido com sucesso.");
            } else if (result.error) {
                toast.error(result.error);
            }
        } catch (error: any) {
            toast.error(error.message || "Erro ao excluir túnel.");
        } finally {
            setLoadingId(null);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "ROUTER":
            case "MIKROTIK": return <Router className="h-4 w-4" />;
            case "MOBILE": return <Smartphone className="h-4 w-4" />;
            case "PC": return <Monitor className="h-4 w-4" />;
            default: return <ShieldCheck className="h-4 w-4" />;
        }
    };

    const copyConfig = (tunnel: VpnTunnel) => {
        const config = `[Interface]
PrivateKey = ${tunnel.clientPrivateKey}
Address = ${tunnel.internalIp}/32
DNS = 1.1.1.1

[Peer]
PublicKey = ${tunnel.server.publicKey}
Endpoint = ${tunnel.server.publicEndpoint}:${tunnel.server.listenPort}
AllowedIPs = 10.255.0.0/16, 172.16.0.0/12, 10.0.0.0/8
PersistentKeepalive = 25`;

        navigator.clipboard.writeText(config);
        setCopiedId(tunnel.id);
        toast.success("Configuração WireGuard copiada!");
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-card/30 overflow-hidden backdrop-blur-sm">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="font-black uppercase text-[10px] tracking-widest italic py-4">Status</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest italic py-4">Dispositivo</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest italic py-4">Endereço IP</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest italic py-4">Tráfego (Rx/Tx)</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest italic py-4">Atividade</TableHead>
                            <TableHead className="text-right font-black uppercase text-[10px] tracking-widest italic py-4 pr-6">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tunnels.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-medium italic">
                                    Nenhum dispositivo VPN configurado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            tunnels.map((tunnel) => (
                                <TableRow key={tunnel.id} className="border-border group transition-all hover:bg-muted/10">
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "h-2 w-2 rounded-full",
                                                tunnel.isActive ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_var(--color-emerald-500)]" : "bg-slate-500"
                                            )} />
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-tighter",
                                                tunnel.isActive ? "text-emerald-500" : "text-slate-500"
                                            )}>
                                                {tunnel.isActive ? "Ativo" : "Inativo"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                                {getIcon(tunnel.type)}
                                            </div>
                                            <div>
                                                <p className="font-black text-xs uppercase tracking-tight">{tunnel.name}</p>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 italic">{tunnel.type}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs font-bold text-primary">
                                        {tunnel.internalIp}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                                                <ArrowDown className="h-3 w-3 text-emerald-500" />
                                                <span>{formatBytes(Number(tunnel.totalBytesRx))}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                                                <ArrowUp className="h-3 w-3 text-blue-500" />
                                                <span>{formatBytes(Number(tunnel.totalBytesTx))}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {tunnel.lastHandshake
                                                ? new Date(tunnel.lastHandshake).toLocaleDateString() + ' ' + new Date(tunnel.lastHandshake).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : "Nunca conectou"
                                            }
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 rounded-xl bg-muted/30 hover:bg-primary/20 hover:text-primary transition-all p-2"
                                                onClick={() => copyConfig(tunnel)}
                                                title="Copiar Configuração WireGuard"
                                            >
                                                {copiedId === tunnel.id ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={cn(
                                                    "h-8 rounded-xl transition-all p-2",
                                                    tunnel.isActive ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20" : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                                                )}
                                                onClick={() => handleToggleStatus(tunnel.id, tunnel.isActive)}
                                                disabled={loadingId === tunnel.id}
                                                title={tunnel.isActive ? "Desativar" : "Ativar"}
                                            >
                                                {loadingId === tunnel.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                                            </Button>

                                            {isSuperAdmin && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all p-2"
                                                    onClick={() => handleDelete(tunnel.id)}
                                                    disabled={loadingId === tunnel.id}
                                                    title="Excluir Túnel"
                                                >
                                                    {loadingId === tunnel.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center gap-4 p-5 bg-primary/5 rounded-[2rem] border border-primary/10">
                <div className="p-3 bg-primary/10 rounded-2xl border border-primary/10 shadow-inner">
                    <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                        Monitoramento em Tempo Real
                    </h4>
                    <p className="text-[10px] text-muted-foreground font-medium italic mt-1 leading-relaxed opacity-70">
                        As estatísticas de tráfego e handshake são coletadas diretamente do servidor VPN central a cada 10 segundos.
                        A interrupção de um túnel corta instantaneamente o acesso administrativo do provedor.
                    </p>
                </div>
            </div>
        </div>
    );
}
