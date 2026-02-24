"use client"

import Link from "next/link";
import {
    Network,
    Server,
    Globe,
    Zap,
    Plus,
    Loader2,
    Save,
    ShieldCheck,
    Copy,
    Terminal,
    Download,
    CheckCircle2,
    AlertCircle,
    Activity,
    Wifi,
    Settings2,
    RefreshCw,
    Trash2,
    Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMikrotikVpnConfigAction, getVpnTunnelStatusAction } from "@/modules/saas/actions/vpn-export.actions";
import { getVpnQuotaAction } from "@/modules/saas/actions/vpn-quota.actions";
import { provisionMikrotikAction, syncAllRadiusAccountsAction } from "@/modules/network/actions/mk-provisioning.actions";
import { getTenantNasList, deleteNasAction } from "@/modules/network/actions/nas.actions";
import { VpnIntegrationCard } from "@/modules/network/components/vpn-integration-card";
import { AddVpnDeviceModal } from "@/modules/network/components/add-vpn-device-modal";
import { NeonCard, NeonCardContent, NeonCardHeader, NeonCardTitle, NeonCardDescription } from "@/components/ui/neon-card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function NetworkSettingsPage() {
    const [isSaving, setIsSaving] = useState(false);
    const [isProvisioning, setIsProvisioning] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [isAddVpnModalOpen, setIsAddVpnModalOpen] = useState(false);
    const queryClient = useQueryClient();

    // VPN Config Query
    const { data: vpnConfig, isLoading: isLoadingVpn } = useQuery({
        queryKey: ["network-vpn-config"],
        queryFn: async () => {
            const res = await getMikrotikVpnConfigAction(null as unknown as string);
            if (res.error) throw new Error(res.error);
            return res.data;
        }
    });

    // VPN Tunnel Status Query (for sync tracking)
    const { data: vpnStatus } = useQuery({
        queryKey: ["vpn-tunnel-status"],
        queryFn: async () => {
            const res = await getVpnTunnelStatusAction(null as unknown as string);
            if (res.error) return null;
            return res.data;
        }
    });

    // VPN Quota Query
    const { data: vpnQuota } = useQuery({
        queryKey: ["vpn-quota"],
        queryFn: async () => {
            const res = await getVpnQuotaAction();
            if (res.error) return null;
            return res.data;
        }
    });

    // System Status Query
    const { data: systemStatus, isLoading: isLoadingSystem } = useQuery({
        queryKey: ["system-status"],
        queryFn: async () => {
            const { getSystemStatusAction } = await import("@/modules/network/actions/system-status.actions");
            const res = await getSystemStatusAction();
            return res.data;
        },
        refetchInterval: 30000 // Update every 30s
    });

    // NAS List Query
    const { data: nasList, isLoading: isLoadingNas } = useQuery({
        queryKey: ["nas-list"],
        queryFn: async () => {
            return await getTenantNasList();
        }
    });

    const handleSave = async () => {
        setIsSaving(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        setIsSaving(false);
        toast.success("Configurações de rede salvas!");
    };

    const handleProvision = async (formData: FormData) => {
        setIsProvisioning(true);
        try {
            const data = {
                interfaceName: formData.get('interfaceName') as string,
                radiusSecret: formData.get('radiusSecret') as string,
                serverIp: formData.get('serverIp') as string,
                localAddress: formData.get('localAddress') as string,
                dnsPrimary: formData.get('dnsPrimary') as string,
                nasId: formData.get('nasId') as string,
            };

            const res = await provisionMikrotikAction(data);

            if (res.success) {
                toast.success(res.message);
            } else {
                toast.error(res.error);
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro ao provisionar");
        } finally {
            setIsProvisioning(false);
        }
    };

    const handleSyncAll = async () => {
        setIsSyncing(true);
        try {
            const res = await syncAllRadiusAccountsAction();
            if (res.success) {
                toast.success(res.message);
            } else {
                toast.error("Erro ao sincronizar contas");
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro crítico na sincronização");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDeleteNas = async (nasId: number, name: string) => {
        if (!confirm(`Tem certeza que deseja remover o concentrador "${name}"? Esta ação não pode ser desfeita.`)) return;

        try {
            const res = await deleteNasAction(nasId);
            if (res.success) {
                toast.success("Concentrador removido!");
                queryClient.invalidateQueries({ queryKey: ["nas-list"] });
            } else {
                toast.error(res.error || "Erro ao remover");
            }
        } catch (err) {
            toast.error("Erro crítico ao remover");
        }
    };

    const copyToClipboard = (text: string, key: string) => {
        if (text) {
            navigator.clipboard.writeText(text);
            setCopied(key);
            toast.success("Copiado!");
            setTimeout(() => setCopied(null), 2000);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-700">
            {/* Header Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                        <Network className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-foreground tracking-tighter italic uppercase">Integração MikroTik</h2>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-60 flex items-center gap-2">
                            <ShieldCheck className="h-3 w-3 text-emerald-500" /> Infraestrutura & Conectividade SaaS
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl font-bold gap-2 border-border/50"
                        onClick={() => queryClient.invalidateQueries()}
                    >
                        <RefreshCw className="h-3 w-3" /> Atualizar Info
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="rounded-xl font-black bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20 italic px-6 uppercase text-xs tracking-wider">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Salvar Configurações
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="dashboard" className="flex-1 flex flex-col p-0">
                <div className="px-8 pt-6 bg-muted/10 border-b border-border">
                    <TabsList className="bg-transparent border-none gap-10 h-10 p-0">
                        <TabsTrigger
                            value="dashboard"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-black text-[10px] uppercase tracking-[0.15em] px-0 pb-4 transition-all"
                        >
                            Painel de Controle
                        </TabsTrigger>
                        <TabsTrigger
                            value="nas"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-black text-[10px] uppercase tracking-[0.15em] px-0 pb-4 transition-all"
                        >
                            Concentradores (NAS)
                        </TabsTrigger>
                        <TabsTrigger
                            value="vpn-script"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-black text-[10px] uppercase tracking-[0.15em] px-0 pb-4 transition-all"
                        >
                            Túneis VPN
                        </TabsTrigger>
                        <TabsTrigger
                            value="provisioning"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-black text-[10px] uppercase tracking-[0.15em] px-0 pb-4 transition-all"
                        >
                            Auto Provisionamento
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-auto p-8 max-w-[1400px] mx-auto w-full">
                    {/* DASHBOARD TAB */}
                    <TabsContent value="dashboard" className="m-0 space-y-10 focus-visible:ring-0">
                        {/* Status Cards Row */}
                        {!isLoadingSystem && systemStatus ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <StatusCard
                                    icon={<ShieldCheck className="text-emerald-500" />}
                                    label="Núcleo Radius"
                                    status={systemStatus.radiusStatus}
                                    color={systemStatus.radiusStatus === "Ativo" ? "emerald" : "muted"}
                                />
                                <StatusCard
                                    icon={<Activity className="text-primary" />}
                                    label="Latência"
                                    status={systemStatus.latency}
                                    color="primary"
                                />
                                <StatusCard
                                    icon={<Server className="text-muted-foreground" />}
                                    label="Instância"
                                    status={systemStatus.instanceName}
                                    color="muted"
                                />
                                <StatusCard
                                    icon={<Wifi className="text-amber-500" />}
                                    label="Túnel VPN"
                                    status={vpnStatus ? "Conectado" : "Offline"}
                                    color={vpnStatus ? "amber" : "muted"}
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="h-24 bg-muted/20 rounded-[1.75rem] border border-border/50" />
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* VPN Integration Left Card */}
                            <div className="lg:col-span-12 xl:col-span-7">
                                <VpnIntegrationCard
                                    tunnelId={vpnStatus?.id || "N/A"}
                                    internalIp={vpnStatus?.internalIp || "N/A"}
                                    status={vpnConfig ? "connected" : "disconnected"}
                                    needsSync={vpnStatus?.needsSync || false}
                                    lastSyncedAt={vpnStatus?.lastSyncedAt}
                                    configScript={vpnConfig?.fullScript}
                                />
                            </div>

                            {/* Info Section Right */}
                            <div className="lg:col-span-12 xl:col-span-5 space-y-6">
                                <Card className="border-none bg-primary/5 rounded-[2rem] p-6 border border-primary/10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-primary/20 rounded-lg">
                                            <Zap className="h-4 w-4 text-primary" />
                                        </div>
                                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground italic">Destaques do Sistema</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-background/50 rounded-2xl border border-border/50">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Backup Automático</p>
                                            <p className="text-xs font-bold">Configurações sincronizadas em tempo real com Mikrogestor Cloud.</p>
                                        </div>
                                        <div className="p-4 bg-background/50 rounded-2xl border border-border/50">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Status do Radius</p>
                                            <p className="text-xs font-bold">Banco de dados replicado com FreeRADIUS local para contingência.</p>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="border-none bg-muted/30 rounded-[2rem] p-6 border border-border/10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-muted/50 rounded-lg">
                                            <RefreshCw className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground italic">Controle Centralizado</h3>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                        Toda a sua infraestrutura MikroTik agora é gerida a partir deste painel.
                                        Adicione concentradores, exporte scripts VPN e provisione autenticação de forma unificada.
                                    </p>
                                    <Button variant="link" className="p-0 h-auto text-[10px] font-black uppercase text-primary mt-4 tracking-widest">
                                        Visualizar Logs de Rede →
                                    </Button>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* NAS MANAGEMENT TAB */}
                    <TabsContent value="nas" className="m-0 space-y-6 focus-visible:ring-0">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="rounded-full bg-primary/10 text-primary border-primary/20 font-bold">NAS</Badge>
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Gestão de Concentradores</h3>
                            </div>
                            <Link href="/mk-integration/nas/new">
                                <Button size="sm" className="rounded-xl font-black bg-primary hover:bg-primary/90 gap-2 shadow-lg italic px-6 uppercase text-[10px] tracking-wider">
                                    <Plus className="h-4 w-4" /> Adicionar Novo
                                </Button>
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {isLoadingNas ? (
                                Array(3).fill(0).map((_, i) => (
                                    <Card key={i} className="animate-pulse bg-muted/20 h-[220px] rounded-3xl" />
                                ))
                            ) : nasList?.length === 0 ? (
                                <Card className="col-span-3 border-2 border-dashed border-border bg-muted/10 py-16 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mb-4">
                                        <Server className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h4 className="text-sm font-black text-foreground">Nenhum concentrador configurado</h4>
                                    <p className="text-xs text-muted-foreground max-w-xs mt-2 font-medium">
                                        Adicione seu MikroTik ou outro servidor RADIUS para começar a provisionar seus clientes.
                                    </p>
                                    <Link href="/mk-integration/nas/new" className="mt-6">
                                        <Button variant="outline" size="sm" className="rounded-xl font-bold border-primary/30 text-primary hover:bg-primary/5">
                                            Criar Primeiro Registro
                                        </Button>
                                    </Link>
                                </Card>
                            ) : (
                                nasList?.map((nas) => (
                                    <NeonCard key={nas.id} className="group overflow-hidden">
                                        <div className="h-1 bg-primary/30 group-hover:bg-primary transition-colors" />
                                        <NeonCardHeader className="pb-2">
                                            <div className="flex justify-between items-start">
                                                <div className="h-10 w-10 rounded-xl bg-muted/20 flex items-center justify-center border border-border group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors">
                                                    <Server className="h-5 w-5 text-primary" />
                                                </div>
                                                <Badge className={`${nas.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'} border-none font-bold text-[10px]`}>
                                                    {nas.status === 'ONLINE' ? 'ATIVO' : nas.status === 'DISABLED' ? 'DESATIVADO' : 'OFFLINE'}
                                                </Badge>
                                            </div>
                                            <NeonCardTitle className="text-lg font-black pt-4">{nas.shortname || nas.nasname}</NeonCardTitle>
                                            <NeonCardDescription className="font-mono text-xs">{nas.nasname}</NeonCardDescription>
                                        </NeonCardHeader>
                                        <NeonCardContent className="space-y-4 pt-0">
                                            <div className="grid grid-cols-2 gap-4 py-4 border-y border-border border-dashed">
                                                <div>
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Protocolo</p>
                                                    <p className="text-xs font-bold text-foreground">{nas.type}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Portas</p>
                                                    <p className="text-xs font-bold text-foreground">{nas.ports || '--'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-2">
                                                <div className="flex items-center gap-2">
                                                    <Activity className={`h-3 w-3 ${nas.status === 'ONLINE' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                                        {nas.lastHandshake
                                                            ? `Visto: ${formatDistanceToNow(new Date(nas.lastHandshake), { addSuffix: true, locale: ptBR })}`
                                                            : 'Nunca conectou'}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Link href={`/mk-integration/nas/${nas.id}`} passHref>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10"
                                                            title="Configurar"
                                                        >
                                                            <Edit3 className="h-4 w-4 text-primary" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 rounded-lg hover:bg-red-500/10 hover:text-red-500"
                                                        onClick={() => handleDeleteNas(nas.id, nas.shortname || nas.nasname)}
                                                        title="Remover"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </NeonCardContent>
                                    </NeonCard>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    {/* VPN SCRIPT TAB */}
                    <TabsContent value="vpn-script" className="m-0 focus-visible:ring-0">
                        {/* Add VPN Device Button */}
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="rounded-full bg-primary/10 text-primary border-primary/20 font-bold">VPN</Badge>
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Gestão de Túneis VPN</h3>
                            </div>
                            <Button
                                onClick={() => setIsAddVpnModalOpen(true)}
                                size="sm"
                                className="rounded-xl font-black bg-primary hover:bg-primary/90 gap-2 shadow-lg italic px-6 uppercase text-[10px] tracking-wider"
                            >
                                <Plus className="h-4 w-4" /> Adicionar Dispositivo VPN
                            </Button>
                        </div>

                        {isLoadingVpn ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-6">
                                <div className="relative">
                                    <Globe className="h-12 w-12 text-primary animate-pulse" />
                                    <RefreshCw className="h-12 w-12 text-primary/30 absolute inset-0 animate-spin" />
                                </div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Gerando Script WireGuard...</p>
                            </div>
                        ) : !vpnStatus ? (
                            /* CASE 1: NO TUNNEL AT ALL */
                            <div className="p-8">
                                <Card className="border-none shadow-xl rounded-[2.5rem] bg-amber-500/5 border border-amber-200/20 p-12 text-center max-w-3xl mx-auto">
                                    <div className="flex flex-col items-center gap-4 text-amber-500">
                                        <AlertCircle className="h-12 w-12" />
                                        <div>
                                            <h3 className="font-black text-xl italic uppercase tracking-tighter">Túnel VPN Indisponível</h3>
                                            <p className="text-sm font-medium mt-2 max-w-md mx-auto">
                                                Seu túnel de gerência ainda não foi provisionado.
                                                O Mikrogestor Cloud requer este túnel para enviar comandos e sincronizar dados com seu MikroTik de forma segura.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => setIsAddVpnModalOpen(true)}
                                            className="mt-8 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white italic"
                                        >
                                            Provisionar Túnel Agora
                                        </Button>
                                    </div>
                                </Card>
                            </div>
                        ) : !vpnConfig ? (
                            /* CASE 2: TUNNEL EXISTS IN DB BUT CONFIG FAILED (BROKEN STATE) */
                            <div className="p-8">
                                <Card className="border-none shadow-xl rounded-[2.5rem] bg-red-500/5 border border-red-200/20 p-12 text-center max-w-3xl mx-auto">
                                    <div className="flex flex-col items-center gap-4 text-red-500">
                                        <Activity className="h-12 w-12 animate-pulse" />
                                        <div>
                                            <h3 className="font-black text-xl italic uppercase tracking-tighter">Erro de Configuração no Túnel</h3>
                                            <p className="text-sm font-medium mt-2 max-w-md mx-auto text-red-600/80">
                                                Identificamos um túnel registrado ({vpnStatus.internalIp}), mas não conseguimos gerar o script de configuração.
                                                Isso geralmente ocorre quando o Servidor VPN foi alterado ou as chaves criptográficas estão inválidas.
                                            </p>
                                        </div>
                                        <div className="flex gap-4 mt-8">
                                            <Button
                                                variant="outline"
                                                onClick={() => queryClient.invalidateQueries({ queryKey: ["network-vpn-config"] })}
                                                className="rounded-xl font-bold border-red-200 text-red-600 hover:bg-red-50"
                                            >
                                                Tentar Novamente
                                            </Button>

                                            {/* We need a way to delete this broken tunnel. 
                                                Since we don't have the ID easily here without context, providing a direct server action wrapper or link to dedicated management might be needed.
                                                For now, let's suggest contacting support or adding a delete button if we can map the action. 
                                                Actually, vpnStatus DOES return the ID. We can use it.
                                            */}
                                            <DeleteBrokenTunnelButton tunnelId={vpnStatus.id} />
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        ) : (
                            /* CASE 3: TUNNEL EXISTS AND CONFIG IS READY */
                            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    <div className="lg:col-span-4 space-y-6">
                                        <Card className="border-none shadow-xl rounded-[2.5rem] bg-muted/30 border border-border/50 p-8 space-y-8">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-emerald-500/10 rounded-2xl">
                                                    <ShieldCheck className="h-6 w-6 text-emerald-500" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Status da Segurança</p>
                                                    <h4 className="text-lg font-black text-foreground italic">WireGuard v3 (Recomendado)</h4>
                                                    <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                                                        Protocolo de alta performance para RouterOS v7+. <br />
                                                        Use este script para menor latência e maior estabilidade.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Gateway Interno</p>
                                                    <div className="bg-background/80 rounded-xl p-3 border border-border/50 font-mono text-xs font-bold text-primary flex items-center justify-between">
                                                        {vpnConfig.part1.match(/address="([^"]+)\//)?.[1] || "10.255.0.x"}
                                                        <Network className="h-3 w-3 opacity-30" />
                                                    </div>
                                                </div>
                                            </div>

                                            <Separator className="bg-border/50" />

                                            <div className="space-y-3">
                                                <Button className="w-full rounded-2xl font-black gap-3 bg-foreground hover:bg-foreground/90 text-background py-6 h-auto transition-transform active:scale-95 shadow-lg">
                                                    <Download className="h-5 w-5" /> Exportar .rsc (Script)
                                                </Button>
                                                <p className="text-[9px] font-bold text-muted-foreground text-center leading-relaxed">
                                                    Importe este arquivo no Mikrotik usando o terminal: <br />
                                                    <code className="text-primary font-mono">/import file-name=vpn-mikrogestor.rsc</code>
                                                </p>
                                            </div>

                                            <div className="p-5 bg-orange-500/5 rounded-3xl border border-orange-500/10 flex items-start gap-4">
                                                <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                                                <p className="text-[10px] font-bold text-orange-600/70 leading-relaxed italic">
                                                    Opcional: Necessário para sincronização RADIUS offline e redirecionamento de tela de bloqueio HTTPS.
                                                </p>
                                            </div>
                                        </Card>
                                    </div>

                                    <div className="lg:col-span-8 h-full min-h-[500px] space-y-6">
                                        {/* PART 1 CARD */}
                                        <Card className="border-none shadow-xl rounded-[2rem] bg-slate-950 text-white overflow-hidden border border-white/5 group">
                                            <CardHeader className="bg-slate-950/50 p-6 flex flex-row items-center justify-between border-b border-white/5 backdrop-blur-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/20">
                                                        <Terminal className="h-4 w-4 text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-sm font-black italic tracking-tighter uppercase">PASSO 1: INTERFACE</CardTitle>
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Criação da Interface & IP</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => copyToClipboard(vpnConfig?.part1, 'part1')}
                                                    className="rounded-xl h-9 gap-2 font-black px-4 bg-white text-slate-950 hover:bg-white/90 shadow-xl transition-all active:scale-95"
                                                >
                                                    {copied === 'part1' ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                                    {copied === 'part1' ? "Copiado" : "Copiar Comando 1"}
                                                </Button>
                                            </CardHeader>
                                            <CardContent className="p-0 bg-slate-900/10">
                                                <pre className="p-6 font-mono text-[12px] text-blue-200/70 leading-relaxed whitespace-pre overflow-x-auto selection:bg-blue-500/30">
                                                    {vpnConfig?.part1}
                                                </pre>
                                            </CardContent>
                                        </Card>

                                        {/* PART 2 CARD */}
                                        <Card className="border-none shadow-xl rounded-[2rem] bg-slate-950 text-white overflow-hidden border border-white/5 group">
                                            <CardHeader className="bg-slate-950/50 p-6 flex flex-row items-center justify-between border-b border-white/5 backdrop-blur-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-orange-500/20 rounded-xl border border-orange-500/20">
                                                        <Terminal className="h-4 w-4 text-orange-400" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-sm font-black italic tracking-tighter uppercase">PASSO 2: PEER & ROTA</CardTitle>
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Conexão com Servidor</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => copyToClipboard(vpnConfig?.part2, 'part2')}
                                                    className="rounded-xl h-9 gap-2 font-black px-4 bg-white text-slate-950 hover:bg-white/90 shadow-xl transition-all active:scale-95"
                                                >
                                                    {copied === 'part2' ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                                    {copied === 'part2' ? "Copiado" : "Copiar Comando 2"}
                                                </Button>
                                            </CardHeader>
                                            <CardContent className="p-0 bg-slate-900/10">
                                                <pre className="p-6 font-mono text-[12px] text-orange-200/70 leading-relaxed whitespace-pre overflow-x-auto selection:bg-orange-500/30">
                                                    {vpnConfig?.part2}
                                                </pre>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* PROVISIONING TAB */}
                    <TabsContent value="provisioning" className="m-0 focus-visible:ring-0">
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                            <div className="xl:col-span-7">
                                <Card className="border-none shadow-xl rounded-[2.5rem] bg-indigo-500/[0.03] border border-indigo-500/10 p-10">
                                    <div className="flex items-center gap-4 mb-10">
                                        <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/10">
                                            <Zap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-foreground italic uppercase tracking-tighter">Auto Provisionamento</h3>
                                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-60">Configuração Automatizada do MikroTik</p>
                                        </div>
                                    </div>

                                    <form action={handleProvision} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                                        <div className="space-y-4 md:col-span-2">
                                            <Label className="uppercase text-[10px] font-black tracking-widest text-muted-foreground flex items-center gap-2">
                                                <Globe className="h-3 w-3" /> Endereço IP do Servidor Radius (Este Sistema)
                                            </Label>
                                            <Input
                                                name="serverIp"
                                                placeholder="Ex: 192.168.88.254"
                                                className="h-14 bg-background/50 rounded-2xl border-border/50 focus:border-indigo-500/50 focus:ring-indigo-500/10 text-base font-bold transition-all"
                                                required
                                            />
                                            <p className="text-[10px] text-muted-foreground italic font-medium">Endereço IP que seu MikroTik alcança o Radius Cloud/Local.</p>
                                        </div>

                                        <div className="space-y-4 md:col-span-1">
                                            <Label className="uppercase text-[10px] font-black tracking-widest text-indigo-500 flex items-center gap-2">
                                                <Server className="h-3 w-3" /> Destino (NAS)
                                            </Label>
                                            <Select name="nasId" required>
                                                <SelectTrigger className="h-14 bg-background/50 rounded-2xl border-border/50 focus:ring-indigo-500/10 font-bold transition-all">
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl border-border/50 shadow-2xl">
                                                    {nasList?.map((nas) => (
                                                        <SelectItem key={nas.id} value={String(nas.id)} className="font-bold py-3">
                                                            {nas.shortname} ({nas.nasname})
                                                        </SelectItem>
                                                    ))}
                                                    {(!nasList || nasList.length === 0) && (
                                                        <SelectItem value="none" disabled>Nenhum NAS ativo</SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-4 md:col-span-1">
                                            <Label className="uppercase text-[10px] font-black tracking-widest text-muted-foreground">Interface Wireless/Ether</Label>
                                            <Input
                                                name="interfaceName"
                                                defaultValue="ether1"
                                                className="h-14 bg-background/50 rounded-2xl border-border/50 transition-all font-bold"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-4 md:col-span-1">
                                            <Label className="uppercase text-[10px] font-black tracking-widest text-muted-foreground">Gateway PPP Local</Label>
                                            <Input
                                                name="localAddress"
                                                defaultValue="10.0.0.1"
                                                className="h-14 bg-background/50 rounded-2xl border-border/50 transition-all font-bold font-mono"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-4 md:col-span-1">
                                            <Label className="uppercase text-[10px] font-black tracking-widest text-muted-foreground">Radius Key (Secret)</Label>
                                            <Input
                                                name="radiusSecret"
                                                type="text"
                                                defaultValue="mikrogestor123"
                                                className="h-14 bg-background/50 rounded-2xl border-border/50 transition-all font-bold font-mono"
                                                required
                                            />
                                        </div>

                                        <div className="md:col-span-2 pt-6">
                                            <Button
                                                disabled={isProvisioning}
                                                className="w-full h-16 rounded-[1.5rem] font-black bg-indigo-600 hover:bg-indigo-700 text-white gap-3 shadow-xl shadow-indigo-600/20 italic uppercase tracking-tighter"
                                            >
                                                {isProvisioning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5 fill-white" />}
                                                Configurar MikroTik Remotamente
                                            </Button>
                                        </div>
                                    </form>
                                </Card>
                            </div>

                            <div className="xl:col-span-5 space-y-8">
                                <Card className="border-none shadow-xl rounded-[2.5rem] bg-emerald-500/5 p-10 border border-emerald-500/10">
                                    <div className="flex flex-col gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/10">
                                                <RefreshCw className="h-6 w-6 text-emerald-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-foreground italic uppercase tracking-tighter">Sincronismo Radius</h3>
                                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Base de Dados vs Protocolo AA</p>
                                            </div>
                                        </div>

                                        <p className="text-xs font-medium text-muted-foreground leading-relaxed italic">
                                            Garante que todos os assinantes, planos de velocidade e status de bloqueio atuais estejam
                                            corretamente configurados no banco de dados do servidor Radius central.
                                        </p>

                                        <Button
                                            onClick={handleSyncAll}
                                            disabled={isSyncing}
                                            className="h-14 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 text-white gap-3 shadow-lg shadow-emerald-600/20 uppercase text-[10px] tracking-widest"
                                        >
                                            {isSyncing ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                                            Forçar Sincronização de Clientes
                                        </Button>

                                        <div className="bg-background/40 rounded-3xl p-6 border border-emerald-500/10 space-y-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                                                <CheckCircle2 className="h-3 w-3" /> Impacto da Operação
                                            </h4>
                                            <ul className="space-y-3">
                                                <li className="flex items-start gap-4">
                                                    <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1 shadow-[0_0_8px_var(--color-emerald-500)]" />
                                                    <p className="text-[11px] font-bold text-muted-foreground">Atualiza senhas e perfis de velocidade no RouterOS.</p>
                                                </li>
                                                <li className="flex items-start gap-4">
                                                    <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1 shadow-[0_0_8px_var(--color-emerald-500)]" />
                                                    <p className="text-[11px] font-bold text-muted-foreground">Remove perfis antigos ou clientes cancelados.</p>
                                                </li>
                                                <li className="flex items-start gap-4">
                                                    <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1 shadow-[0_0_8px_var(--color-emerald-500)]" />
                                                    <p className="text-[11px] font-bold text-muted-foreground">Formata identidades Radius para o padrão do Mikrogestor.</p>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>

            {/* Add VPN Device Modal */}
            <AddVpnDeviceModal
                open={isAddVpnModalOpen}
                onOpenChange={setIsAddVpnModalOpen}
                quota={vpnQuota ? {
                    used: vpnQuota.used,
                    limit: vpnQuota.limit,
                    available: vpnQuota.available
                } : undefined}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["vpn-quota"] });
                    queryClient.invalidateQueries({ queryKey: ["vpn-tunnel-status"] });
                    queryClient.invalidateQueries({ queryKey: ["network-vpn-config"] });
                }}
            />
        </div>
    );
}

// Internal Helper Components
function StatusCard({ icon, label, status, color }: { icon: React.ReactNode, label: string, status: string, color: string }) {
    const colorVariants: Record<string, string> = {
        emerald: "border-emerald-500/20 group-hover:border-emerald-500/40 bg-emerald-500/5",
        primary: "border-primary/20 group-hover:border-primary/40 bg-primary/5",
        amber: "border-amber-500/20 group-hover:border-amber-500/40 bg-amber-500/5",
        muted: "border-border/50 group-hover:border-border bg-muted/20"
    };

    const iconBgVariants: Record<string, string> = {
        emerald: "bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/20",
        primary: "bg-primary/10 border-primary/20 group-hover:bg-primary/20",
        amber: "bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500/20",
        muted: "bg-muted border-border/50 group-hover:bg-muted/50"
    };

    return (
        <div className={`border rounded-[1.75rem] p-5 flex items-center gap-4 backdrop-blur-xl transition-all group ${colorVariants[color] || colorVariants.muted}`}>
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center border transition-all ${iconBgVariants[color] || iconBgVariants.muted}`}>
                <div className="transition-transform group-hover:scale-110">
                    {icon}
                </div>
            </div>
            <div>
                <p className="text-[9px] font-black text-muted-foreground uppercase leading-none tracking-[0.2em] opacity-80">{label}</p>
                <p className="text-sm font-black text-foreground mt-2 italic flex items-center gap-2">
                    {status}
                    {status === "Ativo" || status === "Conectado" ? <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> : null}
                </p>
            </div>
        </div>
    )
}

function DeleteBrokenTunnelButton({ tunnelId }: { tunnelId: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const queryClient = useQueryClient();

    const handleDelete = async () => {
        // Simple prompt for confirmation since this is a recovery action
        // Ideally we should use a proper nice modal but for a quick fix this works
        // However, the action requires password. We need a prompt for password.
        const password = prompt("Para confirmar a exclusão deste túnel corrompido, digite sua senha de ADMINISTRADOR:");

        if (!password) return;

        setIsLoading(true);
        try {
            const { deleteVpnTunnelAction } = await import("@/modules/saas/actions/vpn-access.actions");
            const res = await deleteVpnTunnelAction({ tunnelId, password });

            if (res.data?.success) {
                toast.success("Túnel removido com sucesso!");
                queryClient.invalidateQueries({ queryKey: ["network-vpn-config"] });
                queryClient.invalidateQueries({ queryKey: ["vpn-tunnel-status"] });
                queryClient.invalidateQueries({ queryKey: ["vpn-quota"] });
            } else {
                toast.error(res.error || "Erro ao remover túnel");
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro ao tentar remover. Verifique sua senha.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            onClick={handleDelete}
            disabled={isLoading}
            className="rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20"
        >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Excluir Túnel Corrompido
        </Button>
    );
}
