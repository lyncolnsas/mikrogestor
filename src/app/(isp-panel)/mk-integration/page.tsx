"use client"

import Link from "next/link";
import {
    Network,
    Server,
    Globe,
    Zap,
    Download,
    Upload,
    FileArchive,
    MonitorSmartphone,
    Settings2,
    Type,
    MousePointer2,
    Eye,
    Plus,
    CheckCircle2,
    Save,
    Layout,
    Edit3,
    Palette,
    RefreshCw,
    Users,
    Wifi,
    Loader2,
    ShieldCheck,
    Activity,
    Trash2,
    AlertCircle,
    Terminal,
    Copy,
    ArrowRight,
    Search,
    Filter,
    RefreshCcw,
    UserPlus,
    Settings,
    Cpu,
    HardDrive,
    Database,
    Layers,
    Radio,
    Cloud,
    Lock,
    ChevronRight,
    Edit,
    ExternalLink,
    MoreVertical
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMikrotikVpnConfigAction, getVpnTunnelStatusAction } from "@/modules/saas/actions/vpn-export.actions";
import { getVpnQuotaAction } from "@/modules/saas/actions/vpn-quota.actions";
import { provisionMikrotikAction, syncAllRadiusAccountsAction } from "@/modules/network/actions/mk-provisioning.actions";
import { getTenantNasList, deleteNasAction } from "@/modules/network/actions/nas.actions";
import { getHotspotConfigAction, saveHotspotConfigAction, provisionHotspotAction, getHotspotLeadsAction } from "@/modules/saas/actions/hotspot.actions";
import { getTenantVpnTunnelsAction } from "@/modules/saas/actions/vpn-setup.actions";
import { uploadHotspotZipAction, toggleHotspotCustomPageAction } from "@/modules/saas/actions/hotspot-custom.actions";
import { VpnIntegrationCard } from "@/modules/network/components/vpn-integration-card";
import { AddVpnDeviceModal } from "@/modules/network/components/add-vpn-device-modal";
import { IpPoolManager } from "@/modules/network/components/ip-pool-manager";
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
    const [isHotspotProvisioning, setIsHotspotProvisioning] = useState(false);
    const queryClient = useQueryClient();

    // Hotspot Preview State
    const [hotspotState, setHotspotState] = useState({
        title: "Wi-Fi Grátis",
        subtitle: "Conecte-se agora",
        primaryColor: "#2563eb",
        collectName: true,
        collectEmail: true,
        collectPhone: true,
        collectCpf: false,
        logoUrl: "",
        bannerUrl: "",
        sessionTime: 60,
        redirectUrl: "",
    });

    // Hotspot Config Query
    const { data: hotspotConfig, isLoading: isLoadingHotspot } = useQuery({
        queryKey: ["hotspot-config"],
        queryFn: async () => {
            return await getHotspotConfigAction();
        }
    });

    // Sync preview with database data
    useEffect(() => {
        if (hotspotConfig) {
            setHotspotState({
                title: hotspotConfig.title || "Wi-Fi Grátis",
                subtitle: hotspotConfig.subtitle || "Conecte-se agora",
                primaryColor: hotspotConfig.primaryColor || "#2563eb",
                collectName: hotspotConfig.collectName !== false,
                collectEmail: hotspotConfig.collectEmail !== false,
                collectPhone: hotspotConfig.collectPhone !== false,
                collectCpf: !!hotspotConfig.collectCpf,
                logoUrl: hotspotConfig.logoUrl || "",
                bannerUrl: hotspotConfig.bannerUrl || "",
                sessionTime: hotspotConfig.sessionTime || 60,
                redirectUrl: hotspotConfig.redirectUrl || "",
            });
        }
    }, [hotspotConfig]);

    const updateHotspotState = (field: string, value: any) => {
        setHotspotState(prev => ({ ...prev, [field]: value }));
    };

    // Hotspot Leads Query
    const { data: hotspotLeads } = useQuery({
        queryKey: ["hotspot-leads"],
        queryFn: async () => {
            return await getHotspotLeadsAction();
        }
    });

    const [selectedTunnelId, setSelectedTunnelId] = useState<string | null>(null);
    const [pppoeInterface, setPppoeInterface] = useState("ether2");
    const [hotspotInterface, setHotspotInterface] = useState("ether3");

    // VPN Config Query
    const { data: vpnConfig, isLoading: isLoadingVpn } = useQuery({
        queryKey: ["network-vpn-config", selectedTunnelId, pppoeInterface, hotspotInterface, hotspotState.title],
        queryFn: async () => {
            const res = await getMikrotikVpnConfigAction({
                tunnelId: selectedTunnelId,
                pppoeInterface,
                hotspotInterface,
                hotspotDnsName: "wifi.mikrogestor.com"
            });
            if (res.error) throw new Error(res.error);
            return res.data;
        }
    });

    // VPN Tunnel List Query
    const { data: vpnTunnels } = useQuery({
        queryKey: ["vpn-tunnels-list"],
        queryFn: async () => {
            const res = await getTenantVpnTunnelsAction(null);
            if (res.error) return [];
            return res.data;
        }
    });

    // VPN Tunnel Status Query (for sync tracking)
    const { data: vpnStatus } = useQuery({
        queryKey: ["vpn-tunnel-status", selectedTunnelId],
        queryFn: async () => {
            // Updated to use specific tunnel if selected
            const res = await getVpnTunnelStatusAction(selectedTunnelId);
            if (res.error) return null;
            return res.data;
        }
    });

    // VPN Quota Query
    const { data: vpnQuota } = useQuery({
        queryKey: ["network-vpn-quota"],
        queryFn: async () => {
            const res = await getVpnQuotaAction();
            if (res.error) throw new Error(res.error);
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

    const handleHotspotSave = async (formData: FormData) => {
        setIsSaving(true);
        try {
            // Merge current state with formData to ensure all settings are preserved across tabs
            const data = {
                title: (formData.get('title') as string) || hotspotState.title,
                subtitle: (formData.get('subtitle') as string) || hotspotState.subtitle,
                primaryColor: (formData.get('primaryColor') as string) || hotspotState.primaryColor,
                collectName: formData.has('collectName') ? formData.get('collectName') === 'true' : hotspotState.collectName,
                collectEmail: formData.has('collectEmail') ? formData.get('collectEmail') === 'true' : hotspotState.collectEmail,
                collectPhone: formData.has('collectPhone') ? formData.get('collectPhone') === 'true' : hotspotState.collectPhone,
                collectCpf: formData.has('collectCpf') ? formData.get('collectCpf') === 'true' : hotspotState.collectCpf,
                logoUrl: (formData.get('logoUrl') as string) || hotspotState.logoUrl,
                bannerUrl: (formData.get('bannerUrl') as string) || hotspotState.bannerUrl,
                sessionTime: Number(formData.get('sessionTime') || hotspotState.sessionTime),
                redirectUrl: (formData.get('redirectUrl') as string) || hotspotState.redirectUrl,
            };

            const res = await saveHotspotConfigAction(data);
            if (res.success) {
                toast.success("Configuração do Hotspot salva!");
                queryClient.invalidateQueries({ queryKey: ["hotspot-config"] });
            }
        } catch (err: any) {
            toast.error(err.message || "Erro ao salvar");
        } finally {
            setIsSaving(false);
        }
    };

    const handleHotspotProvision = async (formData: FormData) => {
        setIsHotspotProvisioning(true);
        try {
            const nasId = Number(formData.get('hsNasId'));
            const options = {
                interface: formData.get('hsInterface') as string,
                hotspotAddress: formData.get('hsAddress') as string,
                dnsName: formData.get('hsDnsName') as string,
            };

            const res = await provisionHotspotAction(nasId, options);
            if (res.success) {
                toast.success("Hotspot provisionado com sucesso!");
            }
        } catch (err: any) {
            toast.error(err.message || "Erro no provisionamento");
        } finally {
            setIsHotspotProvisioning(false);
        }
    };

    const handleDownloadHotspotScript = async (formData: FormData) => {
        try {
            const nasId = Number(formData.get('hsNasId'));
            if (!nasId) return toast.error("Selecione um concentrador");
            
            const options = {
                interface: formData.get('hsInterface') as string,
                dnsName: formData.get('hsDnsName') as string,
                hotspotAddress: formData.get('hsAddress') as string,
            };

            const { generateHotspotScriptAction } = await import("@/modules/saas/actions/hotspot.actions");
            const res = await generateHotspotScriptAction(nasId, options);
            
            if (res.success && res.script) {
                const blob = new Blob([res.script], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `config_hotspot_${nasId}.rsc`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success("Script gerado com sucesso!");
            }
        } catch (err: any) {
            toast.error(err.message || "Erro ao gerar script");
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
                        

                        <TabsTrigger
                            value="hotspot"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-black text-[10px] uppercase tracking-[0.15em] px-0 pb-4 transition-all"
                        >
                            Hotspot & Leads
                        </TabsTrigger>
                        <TabsTrigger
                            value="pools"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-black text-[10px] uppercase tracking-[0.15em] px-0 pb-4 transition-all"
                        >
                            Pools de IP (RADIUS)
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
                                nasList?.map((nas: any) => (
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
                                                                <div className="space-y-3">
                                                                    <Label className="uppercase text-[10px] font-black tracking-widest text-muted-foreground ml-1">Selecione o Concentrador (Mikrotik)</Label>
                                                                    <Select value={selectedTunnelId || ""} onValueChange={setSelectedTunnelId}>
                                                                        <SelectTrigger className="h-14 rounded-2xl bg-background/50 border-border/50 font-bold">
                                                                            <SelectValue placeholder="Túnel Automático (Padrão)" />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="rounded-3xl bg-slate-950 text-white p-2">
                                                                            {vpnTunnels?.map((t: any) => (
                                                                                <SelectItem key={t.id} value={t.id} className="font-bold p-4 rounded-2xl">
                                                                                    {t.name} ({t.internalIp})
                                                                                </SelectItem>
                                                                            ))}
                                                                            {(!vpnTunnels || vpnTunnels.length === 0) && (
                                                                                <SelectItem value="none" disabled>Nenhum concentrador encontrado</SelectItem>
                                                                            )}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label className="uppercase text-[9px] font-black tracking-widest text-muted-foreground ml-1">Interface PPPoE</Label>
                                                                        <Input 
                                                                            value={pppoeInterface} 
                                                                            onChange={(e) => setPppoeInterface(e.target.value)}
                                                                            className="h-12 bg-background/50 rounded-xl border-border/50 font-mono text-xs font-bold text-center"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label className="uppercase text-[9px] font-black tracking-widest text-muted-foreground ml-1">Interface Hotspot</Label>
                                                                        <Input 
                                                                            value={hotspotInterface} 
                                                                            onChange={(e) => setHotspotInterface(e.target.value)}
                                                                            className="h-12 bg-background/50 rounded-xl border-border/50 font-mono text-xs font-bold text-center"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="space-y-2">
                                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Gateway Interno</p>
                                                                    <div className="bg-background/80 rounded-xl p-3 border border-border/50 font-mono text-xs font-bold text-primary flex items-center justify-between">
                                                                        {vpnConfig?.part1?.match(/address="([^"]+)\//)?.[1] || "Detectando..."}
                                                                        <Network className="h-3 w-3 opacity-30" />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <Separator className="bg-border/50" />

                                                            <div className="space-y-3">
                                                                <Button 
                                                                    onClick={() => {
                                                                        const blob = new Blob([vpnConfig.fullScript], { type: 'text/plain' });
                                                                        const url = window.URL.createObjectURL(blob);
                                                                        const a = document.createElement('a');
                                                                        a.href = url;
                                                                        a.download = `mikrogestor-${vpnConfig.part1.match(/address="([^"]+)\//)?.[1] || 'config'}.rsc`;
                                                                        a.click();
                                                                        window.URL.revokeObjectURL(url);
                                                                    }}
                                                                    className="w-full rounded-2xl font-black gap-3 bg-foreground hover:bg-foreground/90 text-background py-6 h-auto transition-transform active:scale-95 shadow-lg"
                                                                >
                                                                    <Download className="h-5 w-5" /> Exportar .rsc Unificado
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

                                        {/* PART 3 CARD */}
                                        <Card className="border-none shadow-xl rounded-[2rem] bg-slate-950 text-white overflow-hidden border border-white/5 group">
                                            <CardHeader className="bg-slate-950/50 p-6 flex flex-row items-center justify-between border-b border-white/5 backdrop-blur-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-500/20">
                                                        <Network className="h-4 w-4 text-purple-400" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-sm font-black italic tracking-tighter uppercase">PASSO 3: RADIUS & PPPOE</CardTitle>
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Autenticação e Bloqueio</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => copyToClipboard(vpnConfig?.part3, 'part3')}
                                                    className="rounded-xl h-9 gap-2 font-black px-4 bg-white text-slate-950 hover:bg-white/90 shadow-xl transition-all active:scale-95"
                                                >
                                                    {copied === 'part3' ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                                    {copied === 'part3' ? "Copiado" : "Copiar Comando 3"}
                                                </Button>
                                            </CardHeader>
                                            <CardContent className="p-0 bg-slate-900/10">
                                                <pre className="p-6 font-mono text-[12px] text-purple-200/70 leading-relaxed whitespace-pre overflow-x-auto selection:bg-purple-500/30">
                                                    {vpnConfig?.part3}
                                                </pre>
                                            </CardContent>
                                        </Card>

                                        {/* PART 4 CARD */}
                                        <Card className="border-none shadow-xl rounded-[2rem] bg-slate-950 text-white overflow-hidden border border-white/5 group">
                                            <CardHeader className="bg-slate-950/50 p-6 flex flex-row items-center justify-between border-b border-white/5 backdrop-blur-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/20">
                                                        <Wifi className="h-4 w-4 text-emerald-400" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-sm font-black italic tracking-tighter uppercase">PASSO 4: HOTSPOT</CardTitle>
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Portal Captivo & Walled Garden</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => copyToClipboard(vpnConfig?.part4, 'part4')}
                                                    className="rounded-xl h-9 gap-2 font-black px-4 bg-white text-slate-950 hover:bg-white/90 shadow-xl transition-all active:scale-95"
                                                >
                                                    {copied === 'part4' ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                                    {copied === 'part4' ? "Copiado" : "Copiar Comando 4"}
                                                </Button>
                                            </CardHeader>
                                            <CardContent className="p-0 bg-slate-900/10">
                                                <pre className="p-6 font-mono text-[12px] text-emerald-200/70 leading-relaxed whitespace-pre overflow-x-auto selection:bg-emerald-500/30">
                                                    {vpnConfig?.part4}
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
                                                     {nasList?.map((nas: any) => (
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

                    {/* HOTSPOT TAB */}
                    <TabsContent value="hotspot" className="m-0 focus-visible:ring-0 px-2 pb-20">
                        <div className="grid grid-cols-1 2xl:grid-cols-12 gap-10">
                            {/* MAIN EDITOR COLUMN */}
                            <div className="2xl:col-span-12 3xl:col-span-12 space-y-8">
                                <Card className="border-none shadow-2xl rounded-[3rem] bg-indigo-500/[0.03] border border-indigo-500/10 p-0 overflow-hidden">
                                    <Tabs defaultValue="config" className="w-full">
                                        <div className="px-10 pt-10 pb-6 border-b border-indigo-500/10 bg-indigo-500/[0.02]">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/10">
                                                        <Wifi className="h-6 w-6 text-indigo-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-black text-foreground italic uppercase tracking-tighter">Hotspot Pro Max</h3>
                                                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-60">Gestão de Portal Captivo & Leads</p>
                                                    </div>
                                                </div>
                                                <TabsList className="bg-background/50 p-1.5 rounded-2xl border border-border/40">
                                                    <TabsTrigger value="config" className="rounded-xl px-6 py-2.5 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2">
                                                        <Settings2 className="h-3 w-3" /> Geral
                                                    </TabsTrigger>
                                                    <TabsTrigger value="design" className="rounded-xl px-6 py-2.5 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2">
                                                        <Palette className="h-3 w-3" /> Design
                                                    </TabsTrigger>
                                                    <TabsTrigger value="custom" className="rounded-xl px-6 py-2.5 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2">
                                                        <FileArchive className="h-3 w-3" /> Customizado
                                                    </TabsTrigger>
                                                    <TabsTrigger value="leads" className="rounded-xl px-6 py-2.5 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2">
                                                        <Users className="h-3 w-3" /> Leads
                                                    </TabsTrigger>
                                                </TabsList>
                                            </div>
                                        </div>

                                        <div className="p-10">
                                            {/* TAB GERAL */}
                                            <TabsContent value="config" className="m-0 focus-visible:ring-0">
                                                <form action={handleHotspotSave} className="space-y-12">
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                                        {/* Provisioning Section */}
                                                        <div className="space-y-8">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                                                    <MonitorSmartphone className="h-4 w-4 text-orange-600" />
                                                                </div>
                                                                <h4 className="text-sm font-black uppercase text-foreground tracking-tighter">Provisionamento MikroTik</h4>
                                                            </div>
                                                            <div className="p-8 bg-orange-500/[0.03] border border-orange-500/10 rounded-[2rem] space-y-6">
                                                                <div className="space-y-3">
                                                                    <Label className="uppercase text-[9px] font-black tracking-widest text-muted-foreground ml-1">Hardware MikroTik (NAS)</Label>
                                                                    <Select name="hsNasId">
                                                                        <SelectTrigger className="h-14 rounded-2xl bg-background border-border/50 font-bold">
                                                                            <SelectValue placeholder="Selecione o NAS" />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="rounded-3xl bg-slate-950 text-white p-2">
                                                                            {nasList?.map((nas: any) => (
                                                                                <SelectItem key={nas.id} value={nas.id.toString()} className="font-bold p-4 rounded-2xl">
                                                                                    {nas.shortname} ({nas.nasname})
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-3">
                                                                        <Label className="uppercase text-[9px] font-black tracking-widest text-muted-foreground ml-1">IP do Hotspot</Label>
                                                                        <Input name="hsAddress" defaultValue="10.5.50.1/24" className="rounded-xl h-12 bg-background font-bold text-center" />
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <Label className="uppercase text-[9px] font-black tracking-widest text-muted-foreground ml-1">Interface</Label>
                                                                        <Input name="hsInterface" defaultValue="bridge-hotspot" className="rounded-xl h-12 bg-background font-bold text-center" />
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-3">
                                                                        <Label className="uppercase text-[9px] font-black tracking-widest text-muted-foreground ml-1">DNS Nome</Label>
                                                                        <Input name="hsDnsName" defaultValue="login.wifi" className="rounded-xl h-12 bg-background font-bold text-center" />
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <Label className="uppercase text-[9px] font-black tracking-widest text-muted-foreground ml-1">Tempo de Sessão (min)</Label>
                                                                        <Input name="sessionTime" type="number" value={hotspotState.sessionTime} onChange={(e) => updateHotspotState('sessionTime', Number(e.target.value))} className="rounded-xl h-12 bg-background font-bold text-center" />
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-3">
                                                                    <Label className="uppercase text-[9px] font-black tracking-widest text-muted-foreground ml-1">URL Pós-Login</Label>
                                                                    <Input name="redirectUrl" value={hotspotState.redirectUrl} onChange={(e) => updateHotspotState('redirectUrl', e.target.value)} placeholder="https://..." className="rounded-xl h-12 bg-background font-bold text-center" />
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-4 pt-4">
                                                                    <Button 
                                                                        onClick={(e: any) => { e.preventDefault(); handleHotspotProvision(new FormData(e.currentTarget.form)); }}
                                                                        disabled={isHotspotProvisioning}
                                                                        className="w-full h-14 rounded-2xl font-black bg-orange-600 hover:bg-orange-700 gap-3 uppercase text-[10px] tracking-widest shadow-lg shadow-orange-600/20"
                                                                    >
                                                                        {isHotspotProvisioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                                                                        Provisionar (API)
                                                                    </Button>
                                                                    <Button 
                                                                        variant="outline"
                                                                        onClick={(e: any) => { e.preventDefault(); handleDownloadHotspotScript(new FormData(e.currentTarget.form)); }}
                                                                        className="w-full h-14 rounded-2xl font-black border-orange-600/20 text-orange-600 hover:bg-orange-600 hover:text-white gap-3 uppercase text-[10px] tracking-widest"
                                                                    >
                                                                        <Download className="h-4 w-4" /> Script (.rsc)
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Lead Collection Section */}
                                                        <div className="space-y-8">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                                                    <MousePointer2 className="h-4 w-4 text-indigo-600" />
                                                                </div>
                                                                <h4 className="text-sm font-black uppercase text-foreground tracking-tighter">Campos de Cadastro</h4>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-4">
                                                                {[
                                                                    { id: 'collectName', label: 'Nome Completo', val: hotspotState.collectName },
                                                                    { id: 'collectEmail', label: 'E-mail', val: hotspotState.collectEmail },
                                                                    { id: 'collectPhone', label: 'WhatsApp', val: hotspotState.collectPhone },
                                                                    { id: 'collectCpf', label: 'CPF', val: hotspotState.collectCpf },
                                                                ].map((field) => (
                                                                    <div key={field.id} className="flex items-center justify-between p-5 bg-background/40 rounded-2xl border border-border/40">
                                                                        <span className="text-[10px] font-black uppercase tracking-widest">{field.label}</span>
                                                                        <Switch 
                                                                           checked={field.val} 
                                                                           onCheckedChange={(checked) => {
                                                                               updateHotspotState(field.id, checked);
                                                                               const input = document.getElementById(`input-${field.id}`) as HTMLInputElement;
                                                                               if (input) input.value = String(checked);
                                                                           }}
                                                                        />
                                                                        <input type="hidden" id={`input-${field.id}`} name={field.id} value={String(field.val)} />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button className="w-full h-16 rounded-3xl font-black bg-primary gap-3 shadow-xl uppercase text-xs tracking-widest italic">
                                                        <Save className="h-5 w-5" /> Salvar Configurações Gerais
                                                    </Button>
                                                </form>
                                            </TabsContent>

                                            {/* TAB DESIGN */}
                                            <TabsContent value="design" className="m-0 focus-visible:ring-0">
                                                <form action={handleHotspotSave} className="space-y-12">
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                                        <div className="space-y-8">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                                                    <Type className="h-4 w-4 text-purple-600" />
                                                                </div>
                                                                <h4 className="text-sm font-black uppercase text-foreground tracking-tighter">Textos & Cores</h4>
                                                            </div>
                                                            <div className="space-y-6 p-8 bg-purple-500/[0.02] border border-purple-500/10 rounded-[2rem]">
                                                                <div className="space-y-3">
                                                                    <Label className="uppercase text-[9px] font-black tracking-widest text-muted-foreground ml-1">Título do Portal</Label>
                                                                    <Input name="title" value={hotspotState.title} onChange={(e) => updateHotspotState('title', e.target.value)} className="h-14 rounded-2xl bg-background border-border/50 font-bold" />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <Label className="uppercase text-[9px] font-black tracking-widest text-muted-foreground ml-1">Subtítulo</Label>
                                                                    <Input name="subtitle" value={hotspotState.subtitle} onChange={(e) => updateHotspotState('subtitle', e.target.value)} className="h-14 rounded-2xl bg-background border-border/50 font-bold" />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <Label className="uppercase text-[9px] font-black tracking-widest text-muted-foreground ml-1">Cor da Marca</Label>
                                                                    <div className="flex gap-4">
                                                                        <Input type="color" name="primaryColor" value={hotspotState.primaryColor} onChange={(e) => updateHotspotState('primaryColor', e.target.value)} className="w-20 h-14 rounded-xl cursor-pointer bg-background" />
                                                                        <Input value={hotspotState.primaryColor} readOnly className="h-14 rounded-xl bg-background font-mono text-center" />
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-3">
                                                                        <Label className="uppercase text-[9px] font-black tracking-widest text-muted-foreground ml-1">Logo URL (opcional)</Label>
                                                                        <Input name="logoUrl" value={hotspotState.logoUrl} onChange={(e) => updateHotspotState('logoUrl', e.target.value)} placeholder="https://..." className="h-14 rounded-2xl bg-background border-border/50 font-bold" />
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <Label className="uppercase text-[9px] font-black tracking-widest text-muted-foreground ml-1">Banner URL (opcional)</Label>
                                                                        <Input name="bannerUrl" value={hotspotState.bannerUrl} onChange={(e) => updateHotspotState('bannerUrl', e.target.value)} placeholder="https://..." className="h-14 rounded-2xl bg-background border-border/50 font-bold" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Visual Preview (Mockup) */}
                                                        <div className="space-y-8 flex flex-col items-center justify-center">
                                                            <div className="w-72 h-[500px] border-[8px] border-slate-950 rounded-[3rem] bg-indigo-950 shadow-2xl relative overflow-hidden flex flex-col items-center p-8 text-center text-white scale-90 md:scale-100">
                                                                {hotspotState.bannerUrl && (
                                                                    <div className="absolute inset-0 bg-cover bg-center opacity-30 z-0" style={{ backgroundImage: `url(${hotspotState.bannerUrl})` }} />
                                                                )}
                                                                <div className="w-12 h-1 bg-white/20 rounded-full mb-8 z-10" />
                                                                <div className="h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-6 shadow-xl z-10 overflow-hidden" style={{ backgroundColor: hotspotState.primaryColor }}>
                                                                    {hotspotState.logoUrl ? (
                                                                        <img src={hotspotState.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                                                                    ) : (
                                                                        <Wifi className="h-8 w-8" />
                                                                    )}
                                                                </div>
                                                                <div className="font-black uppercase tracking-tighter text-2xl mb-2 leading-none z-10">{hotspotState.title}</div>
                                                                <div className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-10 z-10">{hotspotState.subtitle}</div>
                                                                <div className="w-full space-y-4 z-10">
                                                                    {hotspotState.collectName && <div className="h-10 w-full bg-white/5 rounded-xl border border-white/5" />}
                                                                    {hotspotState.collectPhone && <div className="h-10 w-full bg-white/5 rounded-xl border border-white/5" />}
                                                                    <div className="h-12 w-full bg-indigo-600 rounded-xl shadow-lg mt-6" style={{ backgroundColor: hotspotState.primaryColor }} />
                                                                </div>
                                                            </div>
                                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Prévia em tempo real</p>
                                                        </div>
                                                    </div>
                                                    <Button className="w-full h-16 rounded-3xl font-black bg-indigo-600 gap-3 shadow-xl uppercase text-xs tracking-widest italic">
                                                        <Save className="h-5 w-5" /> Salvar Design
                                                    </Button>
                                                </form>
                                            </TabsContent>

                                            {/* TAB CUSTOM PORTAL (ZIP) */}
                                            <TabsContent value="custom" className="m-0 focus-visible:ring-0">
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                                    <div className="space-y-10">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                                                <FileArchive className="h-4 w-4 text-amber-600" />
                                                            </div>
                                                            <h4 className="text-sm font-black uppercase text-foreground tracking-tighter">Portal Personalizado (ZIP)</h4>
                                                        </div>

                                                        <div className="space-y-8">
                                                            <div className="flex items-center justify-between p-6 bg-amber-500/[0.03] border border-amber-500/10 rounded-3xl">
                                                                <div>
                                                                    <h5 className="font-black uppercase text-xs italic text-amber-700">Usar HTML Personalizado</h5>
                                                                    <p className="text-[10px] font-bold text-muted-foreground">Prioriza o seu ZIP sobre o portal padrão.</p>
                                                                </div>
                                                                <Switch 
                                                                    checked={!!hotspotConfig?.useCustomPage} 
                                                                    onCheckedChange={async (val) => {
                                                                        if (!hotspotConfig?.tenantId) return;
                                                                        await toggleHotspotCustomPageAction(hotspotConfig.tenantId, val);
                                                                        toast.success(val ? "Portal customizado ativado!" : "Portal padrão reativado.");
                                                                    }}
                                                                />
                                                            </div>

                                                            <div className="p-10 border-2 border-dashed border-indigo-500/20 rounded-[2.5rem] bg-indigo-500/[0.01] text-center space-y-6 hover:border-indigo-600/40 transition-colors group relative overflow-hidden">
                                                                <div className="h-20 w-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                                                    <Upload className="h-10 w-10 text-indigo-600" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-black uppercase text-sm tracking-tighter italic">Upload do seu Hotspot (.zip)</p>
                                                                    <p className="text-[10px] font-bold text-muted-foreground mt-2 px-10">O arquivo deve conter um index.html na raiz e uma pasta assets (opcional).</p>
                                                                </div>
                                                                <Input 
                                                                    type="file" 
                                                                    accept=".zip" 
                                                                    className="absolute inset-0 opacity-0 cursor-pointer h-full" 
                                                                    onChange={async (e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (!file || !hotspotConfig?.tenantId) return;
                                                                        
                                                                        const formData = new FormData();
                                                                        formData.append('file', file);
                                                                        
                                                                        try {
                                                                            const res = await uploadHotspotZipAction(hotspotConfig.tenantId, formData);
                                                                            if (res.success) {
                                                                                toast.success("Portal customizado enviado!");
                                                                                queryClient.invalidateQueries({ queryKey: ["hotspot-config"] });
                                                                            }
                                                                        } catch (err: any) {
                                                                            toast.error(err.message || "Erro no upload");
                                                                        }
                                                                    }}
                                                                />
                                                                <Button variant="outline" className="rounded-xl font-black text-[10px] gap-2 border-indigo-600/20 text-indigo-600">
                                                                    <Plus className="h-3 w-3" /> Selecionar Arquivo
                                                                </Button>
                                                            </div>

                                                            <div className="p-8 bg-blue-500/[0.03] border border-blue-500/10 rounded-3xl flex items-center justify-between gap-6">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="p-3 bg-blue-500/10 rounded-xl">
                                                                        <Download className="h-5 w-5 text-blue-600" />
                                                                    </div>
                                                                    <div>
                                                                        <h6 className="font-black text-xs uppercase italic text-blue-700">Modelo Estrutural</h6>
                                                                        <p className="text-[10px] font-bold text-muted-foreground">Baixe o ZIP base para criar o seu.</p>
                                                                    </div>
                                                                </div>
                                                                <a href="/modelo-hotspot.zip" download className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] px-6 py-3 rounded-xl uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2">
                                                                     Baixar ZIP
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Custom Portal Status / Info */}
                                                    <div className="space-y-8">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                                                <Eye className="h-4 w-4 text-indigo-600" />
                                                            </div>
                                                            <h4 className="text-sm font-black uppercase text-foreground tracking-tighter">Status & Preview</h4>
                                                        </div>

                                                        {hotspotConfig?.useCustomPage ? (
                                                            <div className="space-y-6">
                                                                <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl flex items-center gap-4">
                                                                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                                                    <div>
                                                                        <p className="text-xs font-black uppercase italic text-emerald-600 tracking-tighter">Portal Customizado Ativo</p>
                                                                        <p className="text-[10px] font-bold text-muted-foreground mt-1">Servindo arquivos de: {hotspotConfig.customPagePath || 'Nenhum arquivo'}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="w-full h-[400px] border border-border/50 rounded-3xl bg-slate-900 overflow-hidden relative group">
                                                                   <iframe 
                                                                      src={hotspotConfig.customPagePath || undefined} 
                                                                      className="w-full h-full border-none pointer-events-none opacity-80"
                                                                   />
                                                                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                       <Button variant="secondary" className="rounded-xl font-black gap-2 uppercase text-[10px]" onClick={() => hotspotConfig.customPagePath && window.open(hotspotConfig.customPagePath, '_blank')}>
                                                                           Ver em nova aba <Globe className="h-3 w-3" />
                                                                       </Button>
                                                                   </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="py-20 text-center space-y-6 opacity-40">
                                                                <div className="p-8 bg-muted rounded-full inline-block">
                                                                    <MonitorSmartphone className="h-16 w-16" />
                                                                </div>
                                                                <p className="font-black uppercase tracking-widest text-xs">Aguardando ativação do portal personalizado.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TabsContent>

                                            {/* TAB LEADS (REUSED FROM OLD VIEW) */}
                                            <TabsContent value="leads" className="m-0 focus-visible:ring-0">
                                                 <div className="flex items-center justify-between mb-10">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-4 bg-primary/10 rounded-2xl border border-primary/10">
                                                            <Users className="h-6 w-6 text-primary" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-2xl font-black text-foreground italic uppercase tracking-tighter">Capturas Recentes</h3>
                                                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-60">Base de Marketing vinculada ao Radius</p>
                                                        </div>
                                                    </div>
                                                    <Badge className="bg-primary/20 text-primary border border-primary/10 font-black px-6 py-2.5 rounded-2xl text-[10px]">
                                                        {hotspotLeads?.length || 0} LEADS
                                                    </Badge>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {hotspotLeads?.length === 0 ? (
                                                        <div className="col-span-full py-40 text-center opacity-20">
                                                            <Users className="h-20 w-20 mx-auto mb-6" />
                                                            <p className="font-black uppercase tracking-widest italic">Aguardando primeira conexão...</p>
                                                        </div>
                                                    ) : (
                                                        hotspotLeads?.map((lead: any) => (
                                                            <div key={lead.id} className="p-8 bg-background/50 border border-border/50 rounded-[2.5rem] group hover:border-primary/40 transition-all hover:bg-background">
                                                                <h5 className="font-black italic uppercase text-lg tracking-tighter group-hover:text-primary transition-colors">{lead.name || 'Anônimo'}</h5>
                                                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-6 opacity-60">{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true, locale: ptBR })}</p>
                                                                
                                                                <div className="space-y-3 mb-8">
                                                                    <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-3">
                                                                        <Type className="h-3 w-3 opacity-40" /> {lead.phone || 'N/A'}
                                                                    </div>
                                                                    <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-3">
                                                                        <Globe className="h-3 w-3 opacity-40" /> {lead.email || 'N/A'}
                                                                    </div>
                                                                </div>

                                                                <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 text-center">
                                                                    <p className="text-[8px] font-black uppercase text-muted-foreground mb-1 tracking-widest opacity-60">MAC Address</p>
                                                                    <p className="text-xs font-mono font-black">{lead.macAddress}</p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </TabsContent>
                                        </div>
                                    </Tabs>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* IP POOLS TAB */}
                    <TabsContent value="pools" className="m-0 focus-visible:ring-0">
                        <IpPoolManager />
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
