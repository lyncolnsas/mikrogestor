"use client";

import { useState } from "react";
import {
    Smartphone,
    Search,
    Plus,
    MoreVertical,
    Power,
    Trash2,
    QrCode,
    Loader2,
    ShieldCheck,
    Signal,
    SignalLow,
    SignalZero,
    Monitor,
    Download
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import { updateVpnTunnelAction, deleteVpnTunnelAction } from "@/modules/saas/actions/vpn-access.actions";
import { getPcWireGuardConfigAction } from "@/modules/saas/actions/vpn-export.actions";
import { createVpnTunnelAction } from "@/modules/saas/actions/vpn-create.actions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { getTenantsAction } from "@/modules/saas/actions/tenant-management.actions";

export interface MobilePeer {
    id: string;
    name: string;
    internalIp: string;
    isActive: boolean;
    lastHandshake: string | Date | null;

    tenant: {
        id: string;
        name: string;
        slug: string;
    } | null;
    server: {
        publicEndpoint: string;
        listenPort: number;
        publicKey: string;
    };
    clientPrivateKey: string;
    type: "MOBILE" | "PC" | "ROUTER" | "MIKROTIK";
}

interface MobileVpnListProps {
    peers: MobilePeer[];
}

export function MobileVpnList({ peers }: MobileVpnListProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [qrPeer, setQrPeer] = useState<MobilePeer | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const router = useRouter();
    const queryClient = useQueryClient();

    // Filter peers
    const filteredPeers = peers.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.tenant?.name || "administrativo").toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.internalIp.includes(searchTerm)
    );

    const toggleMutation = useMutation({
        mutationFn: updateVpnTunnelAction,
        onSuccess: () => {
            router.refresh(); // Refresh Server Component
            toast.success("Status atualizado!");
        },
        onError: (err: any) => toast.error(err.message || "Erro ao atualizar")
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteVpnTunnelAction({ tunnelId: id, password: "CONFIRM_WITHOUT_PASSWORD_FLOW_FOR_NOW" }), // TODO: Add password prompt
        onSuccess: () => {
            router.refresh(); // Refresh Server Component
            toast.success("VPN removida!");
        },
        onError: (err: any) => toast.error(err.message || "Erro ao remover")
    });

    const handleDownloadConfig = async (peer: MobilePeer) => {
        try {
            const result = await getPcWireGuardConfigAction(peer.id);
            if (result.data) {
                const blob = new Blob([result.data.config], { type: "text/plain" });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = result.data.filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success("Download iniciado!");
            } else {
                toast.error(result.error || "Erro ao gerar arquivo");
            }
        } catch (error) {
            toast.error("Erro ao baixar configuração");
        }
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar por nome, provedor ou IP..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 rounded-2xl border-slate-200 bg-slate-50 dark:bg-slate-800"
                    />
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 w-full md:w-auto gap-2">
                    <Plus className="h-4 w-4" /> Novo Dispositivo
                </Button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPeers.map((peer) => {
                    const isOnline = peer.lastHandshake && (new Date().getTime() - new Date(peer.lastHandshake).getTime() < 1000 * 60 * 3); // 3 mins

                    return (
                        <div key={peer.id} className="group relative bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-2xl ${peer.isActive ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                                        {peer.type === 'PC' ? <Monitor className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate" title={peer.name}>{peer.name}</h3>
                                        <p className="text-[10px] font-medium text-slate-400 truncate">
                                            {peer.tenant?.name || "USO ADMINISTRATIVO"}
                                        </p>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl -mr-2 text-slate-300 hover:text-slate-600 relative z-20">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl">
                                        <DropdownMenuItem onClick={() => setQrPeer(peer)} className="gap-2 text-xs font-bold">
                                            <QrCode className="h-3.5 w-3.5" /> Ver QR Code
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDownloadConfig(peer)} className="gap-2 text-xs font-bold">
                                            <Download className="h-3.5 w-3.5" /> Baixar Config (.conf)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => toggleMutation.mutate({ tunnelId: peer.id, isActive: !peer.isActive })} className="gap-2 text-xs font-bold">
                                            <Power className={`h-3.5 w-3.5 ${peer.isActive ? 'text-red-500' : 'text-emerald-500'}`} />
                                            {peer.isActive ? 'Desativar' : 'Ativar'}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                            if (confirm("Tem certeza?")) deleteMutation.mutate(peer.id);
                                        }} className="gap-2 text-xs font-bold text-red-600">
                                            <Trash2 className="h-3.5 w-3.5" /> Excluir
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-[11px] font-medium p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    <span className="text-slate-500">IP Interno</span>
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{peer.internalIp}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {isOnline ? (
                                        <Signal className="h-3.5 w-3.5 text-emerald-500" />
                                    ) : (
                                        <SignalZero className="h-3.5 w-3.5 text-slate-300" />
                                    )}
                                    <span className={`text-[10px] font-bold ${isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {peer.lastHandshake
                                            ? formatDistanceToNow(new Date(peer.lastHandshake), { addSuffix: true, locale: ptBR })
                                            : 'Nunca conectou'}
                                    </span>
                                </div>
                            </div>

                            {!peer.isActive && (
                                <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[1px] rounded-3xl flex items-center justify-center z-10">
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold">Inativo</Badge>
                                </div>
                            )}
                        </div>
                    );
                })}

                {filteredPeers.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400">
                        <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="font-medium">Nenhum dispositivo encontrado.</p>
                    </div>
                )}
            </div>

            {/* QR Code Modal */}
            <Dialog open={!!qrPeer} onOpenChange={(o) => !o && setQrPeer(null)}>
                <DialogContent className="rounded-[2.5rem] sm:max-w-md border-none">
                    <DialogHeader className="text-center">
                        <DialogTitle>Conectar Dispositivo</DialogTitle>
                        <DialogDescription>Escaneie com o app WireGuard</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl">
                        {qrPeer && (() => {
                            const isKeyValid = qrPeer.clientPrivateKey.length === 44 && qrPeer.clientPrivateKey.endsWith('=');
                            const endpoint = qrPeer.server.publicEndpoint && qrPeer.server.publicEndpoint.includes(":")
                                ? qrPeer.server.publicEndpoint
                                : qrPeer.server.publicEndpoint
                                    ? `${qrPeer.server.publicEndpoint}:${qrPeer.server.listenPort}`
                                    : `IP_NAO_REPORTADO:${qrPeer.server.listenPort}`;

                            const wgConfig = `[Interface]
PrivateKey = ${qrPeer.clientPrivateKey}
Address = ${qrPeer.internalIp}/32
DNS = 1.1.1.1

[Peer]
PublicKey = ${qrPeer.server.publicKey}
Endpoint = ${endpoint}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25`;


                            return (
                                <div className="space-y-4 w-full">
                                    {!isKeyValid && (
                                        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-2xl text-[10px] font-bold text-center animate-pulse">
                                            ⚠️ CHAVE INVÁLIDA DETECTADA<br />
                                            Por favor, exclua e crie este acesso novamente para corrigir a criptografia.
                                        </div>
                                    )}
                                    <div className="flex justify-center">
                                        <QRCodeSVG value={wgConfig} size={256} level="H" />
                                    </div>
                                    <div className="text-center pt-4 w-full">
                                        <p className="text-[10px] text-slate-500 mb-2 uppercase font-bold tracking-wider">Configuração Manual</p>

                                        <textarea
                                            readOnly
                                            aria-label="Configuração WireGuard"
                                            title="Configuração WireGuard"
                                            className="w-full h-32 text-[10px] font-mono p-3 bg-slate-50 text-slate-900 rounded-2xl border border-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                            value={wgConfig}
                                            onClick={(e) => e.currentTarget.select()}
                                        />
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </DialogContent>
            </Dialog>

            <CreateMobilePeerModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
    );
}

function CreateMobilePeerModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
    const queryClient = useQueryClient();
    const router = useRouter();
    const [name, setName] = useState("");
    const [type, setType] = useState<"MOBILE" | "PC">("MOBILE");
    const [tenantId, setTenantId] = useState<string>("none"); // Use "none" as sentinel for optional
    const [bypassQuota, setBypassQuota] = useState(false);

    // Fetch tenants for selection
    const { data: tenants = [] } = useQuery({
        queryKey: ["tenants-list"],
        queryFn: async () => {
            const res = await getTenantsAction({}); // Fetch all
            return res.data?.tenants || [];
        },
        enabled: open
    });

    const mutation = useMutation({
        mutationFn: createVpnTunnelAction,
        onSuccess: (data) => {
            if (data.error) {
                toast.error(data.error);
                return;
            }
            router.refresh();
            queryClient.invalidateQueries({ queryKey: ["mobile-peers"] });
            toast.success("Dispositivo criado com sucesso!");
            onOpenChange(false);
            setName("");
            setTenantId("");
            setBypassQuota(false);
        },
        onError: (err: any) => toast.error(err.message)
    });

    const handleSubmit = () => {
        if (!name) return toast.error("Preencha o nome do dispositivo");

        mutation.mutate({
            name,
            type,
            targetTenantId: tenantId === "none" ? undefined : tenantId,
            bypassQuota
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle>Novo Dispositivo Móvel</DialogTitle>
                    <DialogDescription>Crie um acesso VPN para smartphones.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Nome do Dispositivo</label>
                        <Input placeholder="Ex: iPhone do João" value={name} onChange={e => setName(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Dispositivo</label>
                            <Select value={type} onValueChange={(v: any) => setType(v)}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MOBILE">Smartphone</SelectItem>
                                    <SelectItem value="PC">Computador / PC</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Provedor (ISP)</label>
                            <Select value={tenantId} onValueChange={setTenantId}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Opcional..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhum (Administrativo)</SelectItem>
                                    {tenants.map((t: any) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input
                            type="checkbox"
                            id="bypass"
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={bypassQuota}
                            onChange={(e) => setBypassQuota(e.target.checked)}
                        />
                        <label htmlFor="bypass" className="text-sm font-medium text-slate-700 cursor-pointer">
                            Ignorar Limite de Quota (Bônus)
                        </label>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={mutation.isPending}>
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Criar Acesso
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
