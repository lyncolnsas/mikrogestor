"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
    ShieldCheck,
    Activity,
    Zap,
    Settings2,
    ArrowUpRight,
    Database,
    Cpu,
    Unplug,
    Globe as GlobeIcon,
    Loader2
} from "lucide-react"

import { useQuery } from "@tanstack/react-query";
import { getServerMetricsAction } from "@/modules/saas/actions/saas-actions";
import { getVpnServerSetupScript } from "@/modules/saas/actions/vpn-setup.actions";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { Terminal, Copy, CheckCircle2, MoreVertical, Trash2, Power, Wifi, WifiOff, HardDriveDownload, HardDriveUpload, Edit2, AlertCircle, RefreshCw, XCircle } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NetworkDiagnosticsModal } from "@/components/vpn/network-diagnostics-modal"
import { updateVpnTunnelAction, deleteVpnTunnelAction } from "@/modules/saas/actions/vpn-access.actions"
import { updateVpnServerAction, deleteVpnServerAction, regenerateVpnServerKeysAction } from "@/modules/saas/actions/vpn-server.actions"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function RegenerateKeysModal({ serverId }: { serverId: string }) {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [newPrivateKey, setNewPrivateKey] = useState<string | null>(null);

    const handleRegenerate = async () => {
        setIsRegenerating(true);
        try {
            const res = await regenerateVpnServerKeysAction(serverId);
            if (res.error) {
                toast.error(res.error);
            } else if (res.data?.success) {
                toast.success(res.data.message || "Chaves regeneradas com sucesso!");
                queryClient.invalidateQueries({ queryKey: ["saas-servers"] });
                // Show the new key to the user
                if (res.data.privateKey) {
                    setNewPrivateKey(res.data.privateKey);
                } else {
                    setIsOpen(false);
                }
            }
        } catch (error) {
            toast.error("Erro ao regenerar chaves");
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setNewPrivateKey(null);
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            setNewPrivateKey(null);
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-slate-50 border-2 border-transparent hover:border-slate-100">
                    <RefreshCw className="h-5 w-5 text-amber-500" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2.5rem] border-none">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-amber-500 flex items-center gap-2">
                        <RefreshCw className="h-5 w-5" /> {newPrivateKey ? "Chave Regenerada!" : "Regenerar Chaves do Servidor?"}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="font-bold text-slate-500">
                        {newPrivateKey ? (
                            <div className="space-y-4">
                                <p className="text-emerald-600">
                                    A chave pública foi atualizada no banco de dados.
                                    <br />
                                    O servidor VPN local/remoto <strong>será atualizado automaticamente</strong> em até 1 minuto através do script de sincronização.
                                </p>
                                <div className="relative">
                                    <pre className="bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-xs break-all border border-emerald-500/20">
                                        {newPrivateKey}
                                    </pre>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="absolute top-2 right-2 text-white hover:bg-white/10"
                                        onClick={() => {
                                            navigator.clipboard.writeText(newPrivateKey);
                                            toast.success("Copiado!");
                                        }}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-400 font-normal">
                                    Caso o servidor não tenha auto-sync, você deve editar <code>/etc/wireguard/private.key</code> manualmente.
                                </p>
                            </div>
                        ) : (

                            <>
                                <p className="mb-2">ISSO QUEBRARÁ TODAS AS CONEXÕES ATUAIS.</p>
                                <p className="text-xs text-slate-400 font-normal">
                                    Ao regenerar o par de chaves (Pública/Privada) do servidor, todos os roteadores MikroTik conectados perderão o acesso imediatamente.
                                    Eles precisarão baixar o novo script de configuração.
                                </p>
                            </>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    {!newPrivateKey ? (
                        <>
                            <AlertDialogCancel className="rounded-2xl font-bold">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                disabled={isRegenerating}
                                className="bg-amber-500 hover:bg-amber-600 rounded-2xl font-bold gap-2 text-white"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleRegenerate();
                                }}
                            >
                                {isRegenerating && <Loader2 className="h-4 w-4 animate-spin" />}
                                Sim, Regenerar Chaves
                            </AlertDialogAction>
                        </>
                    ) : (
                        <AlertDialogAction className="bg-emerald-500 hover:bg-emerald-600 rounded-2xl font-bold text-white" onClick={handleClose}>
                            Entendido, já copiei
                        </AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function formatBytes(bytes: number | bigint) {
    const b = Number(bytes);
    if (b === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function VpnSetupModal({ serverId }: { serverId: string }) {
    const [script, setScript] = useState<string | null>(null);

    const handleOpen = async () => {
        const res = await getVpnServerSetupScript(serverId);
        if (res.error) {
            toast.error(res.error);
            setScript("Erro ao gerar script. Verifique os logs.");
            return;
        }
        if (res.data) setScript(res.data);
    };

    const copy = () => {
        if (script) {
            navigator.clipboard.writeText(script);
            toast.success("Script copiado!");
        }
    };

    return (
        <Dialog onOpenChange={(open) => open && handleOpen()}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl font-bold h-10 gap-2 border-slate-200">
                    <Terminal className="h-4 w-4" /> Script
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl rounded-[2.5rem] border-none bg-slate-950 p-0 text-white overflow-hidden">
                <DialogHeader className="p-8 pb-0">
                    <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-3">
                        <Terminal className="h-6 w-6 text-blue-500" /> Comando de Configuração Linux
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 font-bold space-y-1">
                        <p>Execute este script no seu servidor VPN remoto para habilitar a sincronização automática.</p>
                        <div className="flex gap-4 mt-2 p-3 bg-white/5 rounded-xl border border-white/10 text-[10px] font-mono">
                            <span className="text-blue-400">ID_DO_NODO: {serverId}</span>
                            <span className="text-emerald-400">SEGREDO_DO_NODO: Gerado Automaticamente</span>
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <div className="p-8 space-y-6">
                    <div className="relative">
                        <pre className="bg-black/50 p-6 rounded-3xl border border-slate-800 font-mono text-sm overflow-x-auto text-emerald-400 max-h-[400px]">
                            {script || "Gerando script de instalação..."}
                        </pre>
                        {script && (
                            <Button size="icon" onClick={copy} className="absolute top-4 right-4 h-10 w-10 bg-white/10 hover:bg-white/20 rounded-xl">
                                <Copy className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-4 p-5 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                        <CheckCircle2 className="h-6 w-6 text-blue-500 shrink-0" />
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-blue-300 leading-relaxed">
                                IMPORTANTE: Atualize o script se você já instalou uma versão antiga.
                            </p>
                            <p className="text-xs text-blue-400/70">
                                Esta nova versão coleta métricas de CPU/RAM em tempo real.
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function EditServerModal({ server, open, setOpen }: { server: VpnServerWithCount, open: boolean, setOpen: (o: boolean) => void }) {
    const queryClient = useQueryClient();
    const [name, setName] = useState(server.name);
    const [endpoint, setEndpoint] = useState(server.publicEndpoint);
    const [capacity, setCapacity] = useState(server.capacityLimit);

    const mutation = useMutation({
        mutationFn: updateVpnServerAction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["saas-servers"] });
            toast.success("Servidor atualizado!");
            setOpen(false);
        },
        onError: (err: any) => toast.error(err.message || "Erro ao atualizar")
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle>Editar Servidor VPN</DialogTitle>
                    <DialogDescription>Ajuste as configurações deste nodo.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Nome do Servidor</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Endpoint Público (IP)</Label>
                        <Input value={endpoint} onChange={e => setEndpoint(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Capacidade de Túneis</Label>
                        <Input type="number" value={capacity} onChange={e => setCapacity(Number(e.target.value))} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={() => mutation.mutate({ id: server.id, name, publicEndpoint: endpoint, capacityLimit: capacity })} disabled={mutation.isPending}>
                        {mutation.isPending && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                        Salvar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function TunnelManagementModal({ server }: { server: VpnServerWithCount }) {
    const queryClient = useQueryClient();
    const [editingTunnel, setEditingTunnel] = useState<string | null>(null);
    const [newName, setNewName] = useState("");
    const [deletingTunnel, setDeletingTunnel] = useState<string | null>(null);

    const [deletePassword, setDeletePassword] = useState("");

    const updateMutation = useMutation({
        mutationFn: updateVpnTunnelAction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["saas-servers"] });
            toast.success("Túnel atualizado!");
            setEditingTunnel(null);
        },
        onError: (err: any) => toast.error(err.message || "Erro ao atualizar")
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteVpnTunnelAction({ tunnelId: id, password: deletePassword }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["saas-servers"] });
            toast.success("Túnel removido!");
            setDeletingTunnel(null);
            setDeletePassword("");
        },
        onError: (err: any) => {
            toast.error(err.message || "Erro ao remover");
            setDeletePassword("");
        }
    });

    const handleToggle = (id: string, current: boolean) => {
        updateMutation.mutate({ tunnelId: id, isActive: !current });
    };

    const handleSaveName = (id: string) => {
        if (!newName.trim()) return;
        updateMutation.mutate({ tunnelId: id, name: newName });
    };

    return (
        <>
            <Dialog>
                <DialogTrigger asChild>
                    <Button size="icon" className="h-12 w-12 rounded-2xl bg-slate-900 hover:bg-black text-white shadow-xl shadow-slate-900/10">
                        <ArrowUpRight className="h-5 w-5" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl rounded-[2.5rem] border-none bg-white p-0 overflow-hidden">
                    <DialogHeader className="p-8 bg-slate-50 border-b border-slate-100">
                        <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-3">
                            <ArrowUpRight className="h-6 w-6 text-blue-600" /> Gerenciar Túneis: {server.name}
                        </DialogTitle>
                        <DialogDescription className="font-bold text-slate-500">
                            Visualize métricas em tempo real e gerencie conexões deste nodo.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-0 max-h-[60vh] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white shadow-sm z-10">
                                <tr className="border-b border-slate-100">
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500">Cliente / ISP</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500">IP Interno</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500">Handshake</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500">Tráfego (RX/TX)</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {server.tunnels?.map((tunnel) => (
                                    <tr key={tunnel.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                {editingTunnel === tunnel.id ? (
                                                    <div className="flex gap-2 items-center">
                                                        <Input
                                                            value={newName}
                                                            onChange={(e) => setNewName(e.target.value)}
                                                            className="h-8 text-xs font-bold rounded-lg"
                                                            autoFocus
                                                        />
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500" onClick={() => handleSaveName(tunnel.id)}>
                                                            <CheckCircle2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-slate-900">{tunnel.name}</span>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => { setEditingTunnel(tunnel.id); setNewName(tunnel.name); }}>
                                                            <Edit2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                                <span className="text-[10px] font-bold text-slate-500">{tunnel.tenant?.name || "ADMINISTRATIVO"} ({tunnel.tenant?.slug || "sys"})</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <Badge variant="secondary" className="font-mono text-[10px] bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">{tunnel.internalIp}</Badge>
                                        </td>
                                        <td className="p-4">
                                            {tunnel.lastHandshake ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Wifi className="h-3 w-3 text-emerald-500" />
                                                    <span className="text-[10px] font-bold text-slate-600">
                                                        {formatDistanceToNow(new Date(tunnel.lastHandshake), { addSuffix: true, locale: ptBR })}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 opacity-40">
                                                    <WifiOff className="h-3 w-3" />
                                                    <span className="text-[10px] font-bold italic">Nunca conectou</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600">
                                                    <HardDriveDownload className="h-3 w-3" /> {formatBytes(tunnel.totalBytesRx)}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                                                    <HardDriveUpload className="h-3 w-3" /> {formatBytes(tunnel.totalBytesTx)}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl"><MoreVertical className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 shadow-xl">
                                                    <DropdownMenuItem className="gap-2 font-bold text-xs" onClick={() => handleToggle(tunnel.id, tunnel.isActive)}>
                                                        <Power className={`h-3.5 w-3.5 ${tunnel.isActive ? 'text-red-500' : 'text-emerald-500'}`} />
                                                        {tunnel.isActive ? 'Desativar Túnel' : 'Ativar Túnel'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="gap-2 font-bold text-xs text-red-600" onClick={() => setDeletingTunnel(tunnel.id)}>
                                                        <Trash2 className="h-3.5 w-3.5" /> Excluir Túnel
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                                {(!server.tunnels || server.tunnels.length === 0) && (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center">
                                            <AlertCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                            <p className="text-sm font-bold text-slate-400 italic">Nenhum túnel ativo neste servidor.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deletingTunnel} onOpenChange={(open) => !open && setDeletingTunnel(null)}>
                <AlertDialogContent className="rounded-[2.5rem] border-none">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black uppercase">Excluir Túnel VPN?</AlertDialogTitle>
                        <AlertDialogDescription className="font-bold text-slate-500">
                            Esta ação é irreversível e realizará a **limpeza total** (Radius NAS incluso).
                            O ISP perderá a conexão WireGuard imediatamente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-2">
                        <Label className="text-xs font-bold uppercase text-slate-400">Senha do SaaS Admin para Confirmar</Label>
                        <Input
                            type="password"
                            placeholder="Sua senha de administrador"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            className="rounded-xl border-slate-200"
                        />
                    </div>
                    <AlertDialogFooter className="gap-2 mt-4">
                        <AlertDialogCancel className="rounded-2xl font-bold">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={!deletePassword || deleteMutation.isPending}
                            className="bg-red-600 hover:bg-red-700 rounded-2xl font-bold gap-2"
                            onClick={() => deletingTunnel && deleteMutation.mutate(deletingTunnel)}
                        >
                            {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Sim, Excluir Tudo
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

interface VpnServerWithCount {
    id: string;
    name: string;
    publicEndpoint: string;
    capacityLimit: number;
    isActive: boolean;
    _count: {
        tunnels: number;
    };
    // Include Stats Record
    stats?: {
        cpuUsage: number;
        memoryTotal: bigint;
        memoryUsed: bigint;
        diskTotal: bigint;
        diskUsed: bigint;
        measuredAt: Date | string;
    }[];
    tunnels?: {
        id: string;
        name: string;
        isActive: boolean;
        internalIp: string;
        lastHandshake?: string | Date;
        totalBytesRx: number | bigint;
        totalBytesTx: number | bigint;
        tenant: { name: string; slug: string; status: string } | null;
    }[];
}

export default function VpnServersPage() {
    const queryClient = useQueryClient();
    const { data: servers = [], isLoading, refetch } = useQuery<VpnServerWithCount[]>({
        queryKey: ["saas-servers"],
        queryFn: async () => {
            const res = await getServerMetricsAction();
            return (res.data || []) as unknown as VpnServerWithCount[];
        }
    });

    const [deleteServerId, setDeleteServerId] = useState<string | null>(null);
    const [editServer, setEditServer] = useState<VpnServerWithCount | null>(null);

    const deleteServerMutation = useMutation({
        mutationFn: (id: string) => deleteVpnServerAction({ id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["saas-servers"] });
            toast.success("Servidor removido!");
            setDeleteServerId(null);
        },
        onError: (e: any) => toast.error("Erro ao remover: " + e.message)
    });

    return (
        <div className="p-8 space-y-8 max-w-[1400px] mx-auto animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <ShieldCheck className="h-8 w-8 text-blue-600" /> Servidores VPN
                    </h1>
                    <p className="text-muted-foreground mt-1 font-medium">Infraestrutura global de túneis WireGuard para conectividade ISP.</p>
                </div>
                <div className="flex gap-2">
                    <NetworkDiagnosticsModal />
                    <Button asChild className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 gap-2">
                        <Link href="/saas-admin/vpn-servers/new">
                            <Zap className="h-4 w-4" /> Provisionar Novo Nodo
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {isLoading && (
                    <div className="flex items-center justify-center p-20">
                        <Loader2 className="h-10 w-10 animate-spin text-slate-300" />
                    </div>
                )}
                {servers.map((server) => {
                    // Check if server is "Verified" (stats received recently)
                    const latestStat = server.stats?.[0];
                    const isVerified = latestStat &&
                        (new Date().getTime() - new Date(latestStat.measuredAt).getTime() < 1000 * 60 * 5); // 5 min 

                    const cpu = latestStat ? latestStat.cpuUsage : 0;
                    // Use tunnel count proxy if stats missing
                    const tunnelLoad = Math.round((server._count.tunnels / server.capacityLimit) * 100);

                    return (
                        <Card key={server.id} className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white dark:bg-slate-900 group">
                            <div className="flex flex-col md:flex-row">
                                {/* Indicator Bar */}
                                <div className={`w-full md:w-3 h-3 md:h-auto ${isVerified ? 'bg-emerald-500' : 'bg-slate-300'}`} />

                                <CardContent className="flex-1 p-8 grid md:grid-cols-4 gap-8">
                                    {/* Info */}
                                    <div className="md:col-span-2 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{server.name}</h3>
                                            {isVerified ? (
                                                <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-none font-bold">
                                                    (Auto-Sync) ATIVO
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] font-mono border-slate-200 text-slate-400 uppercase">
                                                    Não Verificado
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 flex items-center gap-2">
                                                <GlobeIcon className="h-3.5 w-3.5 text-slate-400" />
                                                <span className="text-xs font-mono font-bold text-slate-600">{server.publicEndpoint}</span>
                                            </div>
                                            <div className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 flex items-center gap-2">
                                                <Unplug className="h-3.5 w-3.5 text-blue-400" />
                                                <span className="text-xs font-bold text-blue-600">{server._count.tunnels} Túneis / {server.capacityLimit} Limite</span>
                                            </div>
                                        </div>

                                        {/* Connected ISPs List */}
                                        <div className="space-y-2 pt-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ISPs Conectados</p>
                                            <div className="flex flex-wrap gap-2">
                                                {server.tunnels && server.tunnels.length > 0 ? (
                                                    server.tunnels.map((t) => (
                                                        <div key={t.id} className="flex items-center gap-2 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${t.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{t.tenant?.name || "ADMIN"}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 font-medium italic">Nenhum provedor alocado</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Metrics */}
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-[11px] font-bold text-slate-500 tracking-tighter uppercase">
                                                <span className="flex items-center gap-1.5"><Cpu className="h-3 w-3" /> Carga de CPU</span>
                                                <span className={cpu > 80 ? 'text-red-500' : ''}>{Math.round(cpu)}%</span>
                                            </div>
                                            <Progress value={cpu} className={`h-1.5 ${cpu > 80 ? 'bg-red-100 [&>div]:bg-red-500' : 'bg-slate-100'}`} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-[11px] font-bold text-slate-500 tracking-tighter uppercase">
                                                <span className="flex items-center gap-1.5"><Database className="h-3 w-3" /> Carga de Túneis</span>
                                                <span>{tunnelLoad}%</span>
                                            </div>
                                            <Progress value={tunnelLoad} className="h-1.5 bg-slate-100" />
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-end gap-2">
                                        <VpnSetupModal serverId={server.id} />
                                        <RegenerateKeysModal serverId={server.id} />

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-slate-50 border-2 border-transparent hover:border-slate-100">
                                                    <Settings2 className="h-5 w-5 text-slate-400" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-xl p-2 min-w-[180px]">
                                                <DropdownMenuItem className="gap-2 font-bold text-xs p-2 rounded-lg" onClick={() => setEditServer(server)}>
                                                    <Edit2 className="h-3.5 w-3.5" /> Editar Nodo
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="gap-2 font-bold text-xs p-2 rounded-lg text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => setDeleteServerId(server.id)}>
                                                    <Trash2 className="h-3.5 w-3.5" /> Excluir Nodo
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <TunnelManagementModal server={server} />
                                    </div>
                                </CardContent>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Global Traffic Insight */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-xl shadow-slate-200/30 rounded-3xl bg-blue-600 text-white p-6 md:col-span-2">
                    <div className="flex justify-between items-start">
                        <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Tráfego Agregado SaaS</p>
                            <h2 className="text-4xl font-extrabold tracking-tighter">4.2 TB / dia</h2>
                            <p className="text-sm font-medium opacity-70">Aumento de 22% em relação a semana passada.</p>
                        </div>
                        <Activity className="h-12 w-12 opacity-20" />
                    </div>
                </Card>
                <Card className="border-none shadow-xl shadow-slate-200/30 rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Capacidade Restante</p>
                    <div className="relative h-20 flex items-end">
                        {servers.map((s, i) => (
                            <div
                                key={s.id}
                                className={`flex-1 rounded-t-lg mx-0.5 transition-all duration-1000`}
                                style={{
                                    height: `${Math.max(10, 100 - (s._count.tunnels / s.capacityLimit * 100))}%`,
                                    backgroundColor: i % 2 === 0 ? '#10b981' : '#3b82f6'
                                }}
                            />
                        ))}
                    </div>
                    <p className="text-[10px] font-bold text-center mt-3 text-slate-500 uppercase">
                        Capacidade Livre: {servers.reduce((acc, s) => acc + (s.capacityLimit - s._count.tunnels), 0)} Túneis
                    </p>
                </Card>
            </div>

            {/* Edit Modal */}
            {editServer && <EditServerModal server={editServer} open={!!editServer} setOpen={(o) => !o && setEditServer(null)} />}

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteServerId} onOpenChange={(o) => !o && setDeleteServerId(null)}>
                <AlertDialogContent className="rounded-[2.5rem] border-none">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-500 flex items-center gap-2">
                            <XCircle className="h-5 w-5" /> Deletar Servidor VPN?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Isso derrubará **TODAS** as conexões neste nodo. Os ISPs perderão acesso imediatamente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700 font-bold" onClick={() => deleteServerId && deleteServerMutation.mutate(deleteServerId)}>
                            Confirmar Exclusão
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
