"use client"

import Link from "next/link";
import {
    Network, Server, Globe, Zap, Download, Upload, FileArchive,
    MonitorSmartphone, Settings2, Type, MousePointer2, Eye, Plus,
    CheckCircle2, Save, Layout, Edit3, Palette, RefreshCw, Users,
    Wifi, Loader2, ShieldCheck, Activity, Trash2, AlertCircle,
    Terminal, Copy, ArrowRight, Search, Filter, RefreshCcw,
    UserPlus, Settings, Cpu, HardDrive, Database, Layers,
    Radio, Cloud, Lock, ChevronRight, Edit, ExternalLink,
    MoreVertical, ShieldAlert, Key, Smartphone, ClipboardCheck,
    BarChart, Box, Globe2, Ticket, X, MessageCircle, PlayCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMikrotikVpnConfigAction, getVpnTunnelStatusAction } from "@/modules/saas/actions/vpn-export.actions";
import { getVpnQuotaAction } from "@/modules/saas/actions/vpn-quota.actions";
import { provisionMikrotikAction, syncAllRadiusAccountsAction } from "@/modules/network/actions/mk-provisioning.actions";
import { getTenantNasList, deleteNasAction } from "@/modules/network/actions/nas.actions";
import { getHotspotConfigAction, saveHotspotConfigAction, provisionHotspotAction, getHotspotLeadsAction, uploadHotspotAssetAction } from "@/modules/saas/actions/hotspot.actions";
import { getTenantVpnTunnelsAction } from "@/modules/saas/actions/vpn-setup.actions";
import { uploadHotspotZipAction, toggleHotspotCustomPageAction } from "@/modules/saas/actions/hotspot-custom.actions";
import { VpnConfigWizard } from "@/modules/network/components/vpn-config-wizard";
import { SmartIntegrationHub } from "@/modules/network/components/smart-integration-hub";
import { AddVpnDeviceModal } from "@/modules/network/components/add-vpn-device-modal";
import { IpPoolManager } from "@/modules/network/components/ip-pool-manager";
import { HotspotVoucherManager } from "@/modules/network/components/hotspot-voucher-manager";
import { NeonCard, NeonCardContent, NeonCardHeader, NeonCardTitle, NeonCardDescription } from "@/components/ui/neon-card";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// --- Internal Helper Components ---

function OnboardingWizard({ vpnCount, nasCount, onAddVpn }: { vpnCount: number, nasCount: number, onAddVpn: () => void }) {
    const steps = [
        { 
            id: 1, 
            label: "Ponte de Conexão", 
            title: "Criar Túnel VPN", 
            desc: "Cria um túnel seguro para o SaaS acessar sua RB atrás de NAT.", 
            status: vpnCount > 0 ? "complete" : "pending",
            action: vpnCount > 0 ? null : { label: "Criar Agora", onClick: onAddVpn }
        },
        { 
            id: 2, 
            label: "Identificação", 
            title: "Registrar NAS", 
            desc: "Vincula o IP do túnel ao Radius para autorizar conexões.", 
            status: nasCount > 0 ? "complete" : (vpnCount > 0 ? "pending" : "locked")
        },
        { 
            id: 3, 
            label: "Automação", 
            title: "Provisionar RB", 
            desc: "Gera o script final para configurar sua MikroTik automaticamente.", 
            status: nasCount > 0 ? "pending" : "locked"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {steps.map((step, idx) => (
                <div key={step.id} className={cn(
                    "relative p-8 rounded-3xl border transition-all duration-500 overflow-hidden group h-full flex flex-col justify-between",
                    step.status === "complete" ? "bg-emerald-500/[0.02] border-emerald-500/20 shadow-sm" : 
                    step.status === "pending" ? "bg-primary/[0.02] border-primary/20 shadow-lg shadow-primary/5" :
                    "bg-slate-900/40 border-white/5 opacity-50"
                )}>
                    {/* Step Number Badge */}
                    <div className="flex items-center justify-between mb-6">
                        <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs border transition-all",
                            step.status === "complete" ? "bg-emerald-500 text-slate-950 border-emerald-400" :
                            step.status === "pending" ? "bg-primary text-slate-950 border-white/20 shadow-sm" :
                            "bg-slate-800 text-slate-500 border-white/5"
                        )}>
                            {step.status === "complete" ? <CheckCircle2 className="h-5 w-5" /> : `0${step.id}`}
                        </div>
                        <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider",
                            step.status === "complete" ? "text-emerald-500/80" : "text-slate-500"
                        )}>{step.label}</span>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-lg font-bold tracking-tight transition-colors group-hover:text-primary">{step.title}</h4>
                        <p className="text-[13px] font-medium leading-relaxed text-slate-500 min-h-[40px]">{step.desc}</p>
                    </div>

                    <div className="mt-8">
                        {step.status === "complete" ? (
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-emerald-500">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Concluído
                            </div>
                        ) : step.action ? (
                            <Button onClick={step.action.onClick} variant="neon" className="w-full h-11 text-[10px] font-bold uppercase tracking-wider rounded-xl">
                                {step.action.label}
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-600">
                                {step.status === "locked" ? <Lock className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5 animate-pulse" />} 
                                {step.status === "locked" ? "Aguardando item anterior" : "Próximo Passo"}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function StatusCard({ icon, label, status, color }: { icon: React.ReactNode, label: string, status: string, color: string }) {
    const colorVariants: Record<string, string> = {
        emerald: "border-emerald-500/10 bg-emerald-500/[0.02]",
        primary: "border-primary/10 bg-primary/[0.02]",
        amber: "border-amber-500/10 bg-amber-500/[0.02]",
        muted: "border-white/5 bg-white/[0.02]"
    };

    const iconBgVariants: Record<string, string> = {
        emerald: "bg-emerald-500/10 text-emerald-500",
        primary: "bg-primary/10 text-primary",
        amber: "bg-amber-500/10 text-amber-500",
        muted: "bg-slate-800 text-slate-400"
    };

    return (
        <div className={cn(
            "border rounded-xl p-5 flex items-center gap-4 transition-all duration-300",
            colorVariants[color] || colorVariants.muted
        )}>
            <div className={cn(
                "h-11 w-11 rounded-lg flex items-center justify-center border border-white/5",
                iconBgVariants[color] || iconBgVariants.muted
            )}>
                {icon}
            </div>
            <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                <div className="text-[14px] font-bold text-white flex items-center gap-2">
                    {status}
                    {(status === "Ativo" || status === "Conectado" || status === "ONLINE") && (
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                </div>
            </div>
        </div>
    )
}

function DeleteVpnButton({ tunnelId, onDeleted }: { tunnelId: string, onDeleted?: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const queryClient = useQueryClient();

    const handleDelete = async () => {
        const password = prompt("Para confirmar a exclusão deste túnel e liberar sua cota, digite sua SENHA DE ADMINISTRADOR:");
        if (!password) return;

        setIsLoading(true);
        try {
            const { deleteVpnTunnelAction } = await import("@/modules/saas/actions/vpn-access.actions");
            const res = await deleteVpnTunnelAction({ tunnelId, password });

            if (res.data?.success) {
                toast.success("Túnel VPN removido. Cota liberada.");
                queryClient.invalidateQueries();
                onDeleted?.();
            } else {
                toast.error(res.error || "Senha incorreta ou erro no servidor.");
            }
        } catch (err) {
            toast.error("Erro crítico ao tentar remover.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            onClick={handleDelete}
            disabled={isLoading}
            variant="outline"
            className="rounded-xl font-bold bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-500 gap-2 h-14 px-6"
        >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Remover Definitivamente
        </Button>
    );
}

// --- Main Page Component ---

export default function NetworkSettingsPage() {
    const [isSaving, setIsSaving] = useState(false);
    const [isProvisioning, setIsProvisioning] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isAddVpnModalOpen, setIsAddVpnModalOpen] = useState(false);
    const [isHotspotProvisioning, setIsHotspotProvisioning] = useState(false);
    const [selectedTunnelId, setSelectedTunnelId] = useState<string | null>(null);
    const [pppoeInterface, setPppoeInterface] = useState("ether2");
    const [hotspotInterface, setHotspotInterface] = useState("ether3");

    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("dashboard");

    const handleDeleteNas = async (id: number) => {
        if (!confirm("Tem certeza que deseja excluir este concentrador?")) return;
        
        try {
            const result = await deleteNasAction(id);
            if (result.success) {
                toast.success("Concentrador excluído com sucesso!");
                queryClient.invalidateQueries({ queryKey: ["nas-list"] });
            } else {
                toast.error(result.error as string);
            }
        } catch (error) {
            console.error("Delete NAS error:", error);
            toast.error("Erro ao processar exclusão.");
        }
    };

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
        walledGarden: [] as string[],
        videoUrl: "",
        bgType: "IMAGE",
        welcomeEmailActive: false,
        welcomeEmailSubject: "",
        welcomeEmailBody: "",
        welcomeWhatsappActive: false,
        welcomeWhatsappBody: "",
        npsActive: false,
        npsQuestion: "Como você avalia nossa conexão hoje?",
        npsTimeout: 60,
        useCustomPage: false,
    });

    // Queries
    const { data: vpnQuotaRes } = useQuery({ queryKey: ["vpn-quota"], queryFn: () => getVpnQuotaAction() });
    const vpnQuota = vpnQuotaRes?.data;

    const { data: vpnStatusRes, isLoading: isLoadingVpnStatus } = useQuery({ 
        queryKey: ["vpn-tunnel-status", selectedTunnelId], 
        queryFn: () => getVpnTunnelStatusAction(selectedTunnelId) 
    });
    const vpnStatus = vpnStatusRes?.data;
    
    const { data: vpnConfig, isLoading: isLoadingVpnConfig } = useQuery({
        queryKey: ["network-vpn-config", vpnStatus ? (vpnStatus as any).id : null, pppoeInterface, hotspotInterface],
        queryFn: async () => {
            const id = vpnStatus ? (vpnStatus as any).id : null;
            if (!id) return null;
            const res = await getMikrotikVpnConfigAction({
                tunnelId: id,
                pppoeInterface,
                hotspotInterface,
                hotspotDnsName: "wifi.mikrogestor.com"
            });
            return res.data;
        },
        enabled: !!(vpnStatus && (vpnStatus as any).id)
    });

    const { data: vpnTunnelsRes } = useQuery({ queryKey: ["vpn-tunnels-list"], queryFn: () => getTenantVpnTunnelsAction(null) });
    const vpnTunnels = vpnTunnelsRes?.data;

    const { data: nasList } = useQuery({ queryKey: ["nas-list"], queryFn: () => getTenantNasList() });
    const { data: hotspotConfig } = useQuery({ queryKey: ["hotspot-config"], queryFn: () => getHotspotConfigAction() });
    const { data: hotspotLeads } = useQuery({ queryKey: ["hotspot-leads"], queryFn: () => getHotspotLeadsAction() });
    const { data: systemStatus, isLoading: isLoadingSystem } = useQuery({
        queryKey: ["system-status"],
        queryFn: async () => {
            const { getSystemStatusAction } = await import("@/modules/network/actions/system-status.actions");
            const res = await getSystemStatusAction();
            return res.data;
        },
        refetchInterval: 30000
    });

    // Sync hotspot state
    useEffect(() => {
        if (hotspotConfig) {
            const config = hotspotConfig as any;
            setHotspotState({
                title: config.title || "Wi-Fi Grátis",
                subtitle: config.subtitle || "Conecte-se agora",
                primaryColor: config.primaryColor || "#2563eb",
                collectName: config.collectName !== false,
                collectEmail: config.collectEmail !== false,
                collectPhone: config.collectPhone !== false,
                collectCpf: !!config.collectCpf,
                logoUrl: config.logoUrl || "",
                bannerUrl: config.bannerUrl || "",
                sessionTime: config.sessionTime || 60,
                redirectUrl: config.redirectUrl || "",
                walledGarden: config.walledGarden || [],
                videoUrl: config.videoUrl || "",
                bgType: config.bgType || "IMAGE",
                welcomeEmailActive: !!config.welcomeEmailActive,
                welcomeEmailSubject: config.welcomeEmailSubject || "",
                welcomeEmailBody: config.welcomeEmailBody || "",
                welcomeWhatsappActive: !!config.welcomeWhatsappActive,
                welcomeWhatsappBody: config.welcomeWhatsappBody || "",
                npsActive: !!config.npsActive,
                npsQuestion: config.npsQuestion || "Como você avalia nossa conexão hoje?",
                npsTimeout: config.npsTimeout || 60,
                useCustomPage: !!config.useCustomPage,
            });
        }
    }, [hotspotConfig]);

    // Handlers
    const handleSyncAll = async () => {
        setIsSyncing(true);
        try {
            const res = await syncAllRadiusAccountsAction();
            if (res.success) toast.success(res.message);
            else toast.error("Erro ao sincronizar");
        } catch (err) {
            toast.error("Erro crítico na sincronização");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleProvision = async (formData: FormData) => {
        setIsProvisioning(true);
        try {
            const data = {
                interfaceName: (formData.get('interfaceName') as string) || 'ether1',
                radiusSecret: (formData.get('radiusSecret') as string),
                serverIp: (formData.get('serverIp') as string),
                localAddress: (formData.get('localAddress') as string) || '10.0.0.1',
                dnsPrimary: (formData.get('dnsPrimary') as string) || '8.8.8.8',
                nasId: (formData.get('nasId') as string) || undefined,
            };
            const res = await provisionMikrotikAction(data);
            if (res.success) toast.success(res.message);
            else toast.error(res.error);
        } catch (err) {
            toast.error("Erro ao provisionar");
        } finally {
            setIsProvisioning(false);
        }
    };

    const handleHotspotSave = async (formData?: FormData | any, overrideState?: any) => {
        setIsSaving(true);
        const stateToSave = overrideState || hotspotState;
        try {
            const data = {
                title: stateToSave.title,
                subtitle: stateToSave.subtitle,
                primaryColor: stateToSave.primaryColor,
                collectName: stateToSave.collectName,
                collectEmail: stateToSave.collectEmail,
                collectPhone: stateToSave.collectPhone,
                collectCpf: stateToSave.collectCpf,
                logoUrl: stateToSave.logoUrl,
                bannerUrl: stateToSave.bannerUrl,
                videoUrl: stateToSave.videoUrl,
                bgType: stateToSave.bgType,
                sessionTime: Number(stateToSave.sessionTime),
                redirectUrl: stateToSave.redirectUrl,
                walledGarden: stateToSave.walledGarden,
                welcomeEmailActive: stateToSave.welcomeEmailActive,
                welcomeEmailSubject: stateToSave.welcomeEmailSubject,
                welcomeEmailBody: stateToSave.welcomeEmailBody,
                welcomeWhatsappActive: stateToSave.welcomeWhatsappActive,
                welcomeWhatsappBody: stateToSave.welcomeWhatsappBody,
                npsActive: stateToSave.npsActive,
                npsQuestion: stateToSave.npsQuestion,
                npsTimeout: Number(stateToSave.npsTimeout),
                useCustomPage: stateToSave.useCustomPage,
            };
            const res = await saveHotspotConfigAction(data);
            if (res.success) {
                toast.success("Configuração salva!");
                queryClient.invalidateQueries({ queryKey: ["hotspot-config"] });
            } else {
                toast.error(res.error || "Erro ao salvar no servidor.");
            }
        } catch (err: any) {
            toast.error(err.message || "Erro crítico ao salvar");
        } finally {
            setIsSaving(false);
        }
    };

    const NavItem = ({ value, label, icon: Icon, badge }: { value: string, label: string, icon: any, badge?: string | number }) => {
        const isActive = activeTab === value;
        return (
            <TabsTrigger
                value={value}
                onClick={() => setActiveTab(value)}
                className={cn(
                    "relative flex items-center h-11 px-6 rounded-xl font-bold text-xs tracking-tight transition-all shrink-0 border border-transparent overflow-hidden group",
                    isActive 
                        ? "text-slate-950 z-10" 
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
                )}
            >
                <div className="relative z-10 flex items-center gap-3">
                    <Icon className={cn("h-4 w-4 transition-transform duration-500", isActive ? "text-slate-950" : "text-slate-500 group-hover:scale-105")} />
                    <span>{label}</span>
                    {badge !== undefined && (
                        <span className={cn(
                            "ml-1.5 flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-bold leading-none",
                            isActive ? "bg-slate-950/10 text-slate-950" : "bg-white/5 text-slate-500 border border-white/5"
                        )}>
                            {badge}
                        </span>
                    )}
                </div>

                {isActive && (
                    <motion.div 
                        layoutId="active-nav-pill" 
                        className="absolute inset-0 bg-primary shadow-sm shadow-primary/20"
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                )}
            </TabsTrigger>
        );
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-primary/30">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
                
                {/* UNIFIED PREMIUM HEADER */}
                <header className="sticky top-0 z-50 w-full bg-slate-950/60 backdrop-blur-3xl border-b border-white/5 px-6 py-6 md:px-12">
                    <div className="max-w-[1600px] mx-auto space-y-6">
                        
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-slate-900 border border-white/10 rounded-xl">
                                    <Network className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold tracking-tight text-white leading-none mb-1.5">
                                        Mikrogestor <span className="text-slate-500 font-semibold">Network</span>
                                    </h1>
                                    <div className="flex items-center gap-3">
                                        <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5">
                                            Smart Integration
                                        </Badge>
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cloud Auth</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-8 xl:pl-8 xl:border-l xl:border-white/5">
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Cota de Túneis</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-primary">{(vpnQuota?.used || 0)} / {vpnQuota?.limit || 0}</span>
                                        <div className="h-1 w-20 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                            <div className="h-full bg-primary" style={{ width: `${(Number(vpnQuota?.used || 0) / Number(vpnQuota?.limit || 1)) * 100}%` }} />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Status Cloud</span>
                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-none font-bold text-[9px] uppercase">
                                        Online & Stable
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <div className="w-full">
                            <div className="bg-slate-900/60 p-1 rounded-2xl border border-white/10">
                                <TabsList className="bg-transparent h-auto p-0 flex flex-wrap lg:flex-nowrap gap-1 w-full lg:justify-center">
                                    <NavItem value="dashboard" label="Visão Geral" icon={Layout} />
                                    <NavItem value="hotspot" label="Serviços Digital" icon={Wifi} />
                                    <NavItem value="leads" label="Auto Cadastro (Leads)" icon={Users} />
                                    <NavItem value="infra" label="Rede & Infra" icon={Layers} />
                                </TabsList>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 p-6 md:p-12 max-w-[1750px] mx-auto w-full">
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                        
                        {/* GLOBAL HARDWARE SIDEBAR */}
                        <aside className="xl:col-span-3 space-y-6">
                            <Card className="border-none bg-slate-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl backdrop-blur-md">
                                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                            <Server className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold uppercase tracking-tight text-white mb-0.5">Hardware</h3>
                                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-none">Concentradores</p>
                                        </div>
                                    </div>
                                    <Link href="/mk-integration/nas/new">
                                        <Button size="sm" variant="outline" className="h-10 w-10 p-0 rounded-xl border-white/10 hover:bg-white/10 transition-all">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </div>
                                <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
                                    {nasList?.length === 0 && (
                                        <div className="py-12 text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">Nenhum hardware</div>
                                    )}
                                    {nasList?.map((nas: any) => {
                                        const tunnel = vpnTunnels?.find((t: any) => t.internalIp === nas.nasname);
                                        const isSelected = tunnel?.id === selectedTunnelId;
                                        const isOnline = nas.nasname === vpnStatus?.internalIp;

                                        return (
                                            <div
                                                key={nas.id}
                                                className={cn(
                                                    "p-4 rounded-2xl border transition-all cursor-pointer group/item flex items-center justify-between",
                                                    isSelected ? "bg-primary text-slate-950 border-primary shadow-xl shadow-primary/10" : "bg-slate-950/40 border-transparent hover:border-white/10"
                                                )}
                                            >
                                                <div className="flex items-center gap-4 flex-1" onClick={() => setSelectedTunnelId(tunnel?.id || null)}>
                                                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border transition-all duration-300", isSelected ? "bg-slate-950 text-primary border-white/10 scale-95" : "bg-slate-900 border-white/5 text-slate-500")}>
                                                        <HardDrive className="h-4.5 w-4.5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className={cn("text-xs font-bold tracking-tight mb-1", isSelected ? "text-slate-950" : "text-white")}>{nas.shortname}</p>
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-700")} />
                                                            <p className={cn("text-[9px] font-mono font-medium", isSelected ? "text-slate-950/70" : "text-slate-500")}>{nas.nasname}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-all">
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:bg-red-500/10 hover:text-red-500" onClick={(e) => { e.stopPropagation(); if(confirm('Excluir hardware?')) deleteNasAction(nas.id); }}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>

                            <Card className="p-8 bg-slate-900/40 border-white/5 rounded-[2.5rem] shadow-xl relative overflow-hidden group transition-all hover:bg-slate-900/60 backdrop-blur-md">
                                <div className="flex items-center gap-4 relative z-10 mb-6">
                                    <div className="h-10 w-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                        <ShieldAlert className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-[11px] font-bold uppercase tracking-tight text-white leading-none">Security Ops</h4>
                                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">Status: Protegido</p>
                                    </div>
                                </div>
                                <Button variant="outline" className="w-full border-white/5 bg-transparent text-slate-500 text-[9px] font-bold uppercase tracking-widest h-10 rounded-xl transition-all active:scale-95 shadow-md hover:bg-white/5 hover:text-white" onClick={() => toast.info("Radius Token Reset iniciado...")}>
                                    Resetar Tokens RADIUS
                                </Button>
                            </Card>
                        </aside>

                        {/* MAIN WRAPPER */}
                        <main className="xl:col-span-9 space-y-10">
                            
                            {/* DASHBOARD TAB */}
                            <TabsContent value="dashboard" className="m-0 space-y-10 focus-visible:ring-0">
                                {selectedTunnelId ? (
                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                        <SmartIntegrationHub 
                                            status={{
                                                vpnConnected: vpnStatus?.internalIp === nasList?.find((n:any) => n.nasname === vpnStatus?.internalIp)?.nasname,
                                                nasRegistered: !!nasList?.find((n:any) => vpnTunnels?.find((t:any) => t.id === selectedTunnelId)?.internalIp === n.nasname),
                                                radiusAuthOk: vpnStatus?.internalIp === nasList?.find((n:any) => n.nasname === vpnStatus?.internalIp)?.nasname,
                                                servicesInjected: true
                                            }}
                                            tunnelData={vpnTunnels?.find((t:any) => t.id === selectedTunnelId)}
                                            nasData={nasList?.find((n:any) => vpnTunnels?.find((t:any) => t.id === selectedTunnelId)?.internalIp === n.nasname)}
                                            configScripts={vpnConfig}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-12 animate-in fade-in duration-700">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            <StatusCard icon={<ShieldCheck className="text-emerald-500" />} label="Núcleo Radius" status={systemStatus?.radiusStatus || "Consultando..."} color="emerald" />
                                            <StatusCard icon={<Activity className="text-primary" />} label="Latência" status={systemStatus?.latency || "--"} color="primary" />
                                            <StatusCard icon={<Wifi className="text-amber-500" />} label="Túnel VPN" status={vpnStatus ? "Conectado" : "Offline"} color={vpnStatus ? "amber" : "muted"} />
                                        </div>
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Caminho de Integração Mikrogestor</span>
                                                <Badge variant="outline" className="rounded-lg bg-primary/5 border-primary/20 text-primary font-bold text-[9px] uppercase tracking-wider px-3 py-1">Fluxo de Implantação</Badge>
                                            </div>
                                            <OnboardingWizard vpnCount={vpnTunnels?.length || 0} nasCount={nasList?.length || 0} onAddVpn={() => setIsAddVpnModalOpen(true)} />
                                        </div>
                                    </div>
                                )}
                            </TabsContent>

                            {/* HOTSPOT TAB */}
                            <TabsContent value="hotspot" className="m-0 space-y-10 focus-visible:ring-0">
                                <Card className="border-none shadow-2xl rounded-[2.5rem] bg-slate-900/40 border border-white/5 overflow-hidden backdrop-blur-xl">
                                    <Tabs defaultValue="marketing">
                                        <div className="px-10 py-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/[0.02]">
                                            <div className="flex items-center gap-4">
                                                <Wifi className="h-6 w-6 text-primary" />
                                                <h3 className="text-xl font-bold uppercase tracking-tight">Gestão Digital Pro</h3>
                                            </div>
                                            <TabsList className="bg-slate-950/60 p-1 rounded-2xl border border-white/5 h-auto">
                                                <TabsTrigger value="marketing" className="rounded-xl px-6 py-2.5 font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-slate-950 transition-all">Marketing & Visual</TabsTrigger>
                                                <TabsTrigger value="network" className="rounded-xl px-6 py-2.5 font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-slate-950 transition-all">Infra & RADIUS</TabsTrigger>
                                                <TabsTrigger value="vouchers" className="rounded-xl px-6 py-2.5 font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-slate-950 transition-all">Vouchers</TabsTrigger>
                                                <TabsTrigger value="leads" className="rounded-xl px-6 py-2.5 font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-slate-950 transition-all">Leads</TabsTrigger>
                                            </TabsList>
                                        </div>
                                        {/* Original content placeholder - keeping the logic intact */}
                                        <TabsContent value="marketing" className="p-10 m-0 animate-in fade-in duration-500">
                                            <form action={handleHotspotSave} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                                <div className="space-y-8">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-3">
                                                            <Label className="uppercase text-[10px] font-bold tracking-widest text-primary">Título Principal</Label>
                                                            <Input name="title" value={hotspotState.title} onChange={(e) => setHotspotState(s => ({...s, title: e.target.value}))} className="h-12 bg-white/5 rounded-xl border-white/10 font-bold" />
                                                        </div>
                                                        <div className="space-y-3">
                                                            <Label className="uppercase text-[10px] font-bold tracking-widest text-primary">Subtítulo</Label>
                                                            <Input name="subtitle" value={hotspotState.subtitle} onChange={(e) => setHotspotState(s => ({...s, subtitle: e.target.value}))} className="h-12 bg-white/5 rounded-xl border-white/10 font-bold" />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-3">
                                                            <Label className="uppercase text-[10px] font-bold tracking-widest text-primary">Tipo de Fundo</Label>
                                                            <Select value={hotspotState.bgType} onValueChange={(v) => setHotspotState(s => ({...s, bgType: v as any}))}>
                                                                <SelectTrigger className="h-12 bg-white/5 rounded-xl border-white/10 font-bold uppercase text-[10px] tracking-widest">
                                                                     <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                                     <SelectItem value="IMAGE">Imagem Estática</SelectItem>
                                                                     <SelectItem value="VIDEO">Vídeo Background</SelectItem>
                                                                     <SelectItem value="COLOR">Cor Sólida</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <Label className="uppercase text-[10px] font-bold tracking-widest text-primary">Media do Portal</Label>
                                                                <span className="text-[9px] font-bold text-slate-500 uppercase">{hotspotState.bgType === "VIDEO" ? 'Max 10MB' : 'Max 500KB'}</span>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <div className="relative flex-1">
                                                                    <Input 
                                                                        name="mediaUrl" 
                                                                        value={hotspotState.bgType === "VIDEO" ? hotspotState.videoUrl : hotspotState.bannerUrl} 
                                                                        onChange={(e) => setHotspotState(s => ({...s, [hotspotState.bgType === "VIDEO" ? 'videoUrl' : 'bannerUrl']: e.target.value}))} 
                                                                        placeholder="URL ou Upload..." 
                                                                        className="h-12 bg-white/5 rounded-xl border-white/10 font-bold text-xs" 
                                                                    />
                                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                                        <label className="cursor-pointer h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 hover:bg-primary/20 transition-all">
                                                                            <Upload className="h-4 w-4" />
                                                                            <input 
                                                                                type="file" 
                                                                                className="hidden" 
                                                                                accept={hotspotState.bgType === "VIDEO" ? "video/*" : "image/*"} 
                                                                                onChange={async (e) => {
                                                                                    const file = e.target.files?.[0];
                                                                                    if (!file) return;
                                                                                    
                                                                                    const toastId = toast.loading(`Enviando ${hotspotState.bgType === "VIDEO" ? "vídeo" : "imagem"}...`);
                                                                                    const formData = new FormData();
                                                                                    formData.append("file", file);
                                                                                    
                                                                                    try {
                                                                                        const res = await uploadHotspotAssetAction(formData);
                                                                                        if (res.url) {
                                                                                            setHotspotState(s => ({...s, [hotspotState.bgType === "VIDEO" ? 'videoUrl' : 'bannerUrl']: res.url}));
                                                                                            toast.success("Upload concluído!", { id: toastId });
                                                                                        }
                                                                                    } catch (err: any) {
                                                                                        toast.error(err.message, { id: toastId });
                                                                                    }
                                                                                }} 
                                                                            />
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-3">
                                                            <Label className="uppercase text-[10px] font-bold tracking-widest text-primary">Cor Principal</Label>
                                                            <div className="flex gap-3">
                                                                <Input type="color" name="primaryColor" value={hotspotState.primaryColor} onChange={(e) => setHotspotState(s => ({...s, primaryColor: e.target.value}))} className="h-12 w-20 p-1 bg-white/5 rounded-xl border-white/10" />
                                                                <Input value={hotspotState.primaryColor} onChange={(e) => setHotspotState(s => ({...s, primaryColor: e.target.value}))} className="h-12 flex-1 bg-white/5 rounded-xl border-white/10 font-mono text-xs" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <Label className="uppercase text-[10px] font-bold tracking-widest text-primary">Tempo de Sessão (min)</Label>
                                                            <Input type="number" name="sessionTime" value={hotspotState.sessionTime} onChange={(e) => setHotspotState(s => ({...s, sessionTime: parseInt(e.target.value)}))} className="h-12 bg-white/5 rounded-xl border-white/10 font-bold" />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <Label className="uppercase text-[10px] font-bold tracking-widest text-primary">URL de Redirecionamento</Label>
                                                        <Input name="redirectUrl" value={hotspotState.redirectUrl} onChange={(e) => setHotspotState(s => ({...s, redirectUrl: e.target.value}))} placeholder="https://seu-site.com" className="h-12 bg-white/5 rounded-xl border-white/10 font-bold text-sm" />
                                                    </div>

                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-3">
                                                            <span className="text-[10px] font-bold uppercase text-slate-400">WhatsApp</span>
                                                            <Switch name="collectPhone" checked={hotspotState.collectPhone} onCheckedChange={(v) => setHotspotState(s => ({...s, collectPhone: v}))} />
                                                        </div>
                                                        <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-3">
                                                            <span className="text-[10px] font-bold uppercase text-slate-400">E-mail</span>
                                                            <Switch name="collectEmail" checked={hotspotState.collectEmail} onCheckedChange={(v) => setHotspotState(s => ({...s, collectEmail: v}))} />
                                                        </div>
                                                        {/* (Add other fields similarly) */}
                                                    </div>

                                                    <div className="p-6 bg-slate-900/60 rounded-3xl border border-white/5 space-y-6">
                                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary border-b border-white/5 pb-4 flex items-center gap-2">
                                                            <Zap className="h-3 w-3" /> Automação de Boas-vindas
                                                        </h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                            <div className="space-y-4">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <Globe className="h-4 w-4 text-slate-400" />
                                                                        <span className="text-[11px] font-bold uppercase tracking-tight">E-mail de Boas-vindas</span>
                                                                    </div>
                                                                    <Switch 
                                                                        checked={hotspotState.welcomeEmailActive} 
                                                                        onCheckedChange={(v) => {
                                                                            const ns = {...hotspotState, welcomeEmailActive: v};
                                                                            setHotspotState(ns);
                                                                            handleHotspotSave(undefined, ns);
                                                                        }} 
                                                                    />
                                                                </div>
                                                                <Input 
                                                                    placeholder="Assunto do E-mail" 
                                                                    value={hotspotState.welcomeEmailSubject} 
                                                                    onChange={(e) => setHotspotState(s => ({...s, welcomeEmailSubject: e.target.value}))} 
                                                                    onBlur={() => handleHotspotSave()}
                                                                    className="h-10 bg-white/5 border-white/5 text-xs" 
                                                                />
                                                                <textarea 
                                                                    placeholder="Corpo do E-mail (HTML permitido)..." 
                                                                    value={hotspotState.welcomeEmailBody} 
                                                                    onChange={(e) => setHotspotState(s => ({...s, welcomeEmailBody: e.target.value}))} 
                                                                    onBlur={() => handleHotspotSave()}
                                                                    className="w-full h-20 bg-white/5 border border-white/5 rounded-xl p-3 text-xs resize-none focus:ring-1 focus:ring-primary outline-none" 
                                                                />
                                                            </div>
                                                            <div className="space-y-4">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <MessageCircle className="h-4 w-4 text-emerald-500" />
                                                                        <span className="text-[11px] font-bold uppercase tracking-tight">Marketing no WhatsApp</span>
                                                                    </div>
                                                                    <Switch 
                                                                        checked={hotspotState.welcomeWhatsappActive} 
                                                                        onCheckedChange={(v) => {
                                                                            const ns = {...hotspotState, welcomeWhatsappActive: v};
                                                                            setHotspotState(ns);
                                                                            handleHotspotSave(undefined, ns);
                                                                        }} 
                                                                    />
                                                                </div>
                                                                <textarea 
                                                                    placeholder="Mensagem do WhatsApp..." 
                                                                    value={hotspotState.welcomeWhatsappBody} 
                                                                    onChange={(e) => setHotspotState(s => ({...s, welcomeWhatsappBody: e.target.value}))} 
                                                                    onBlur={() => handleHotspotSave()}
                                                                    className="w-full h-20 bg-white/5 border border-white/5 rounded-xl p-3 text-xs resize-none focus:ring-1 focus:ring-primary outline-none" 
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-8 bg-indigo-600/5 rounded-3xl border border-indigo-500/10 space-y-6 relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
                                                            <BarChart className="h-20 w-20 text-indigo-500" />
                                                        </div>
                                                        <div className="flex items-center justify-between relative z-10">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                                                                    <BarChart className="h-5 w-5" />
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">Pesquisa NPS & Feedback</h4>
                                                                    <p className="text-[9px] font-bold text-slate-500 uppercase mt-1 tracking-tight">Estratégia de Retenção de Clientes</p>
                                                                </div>
                                                            </div>
                                                            <Switch 
                                                                checked={hotspotState.npsActive} 
                                                                onCheckedChange={(v) => {
                                                                    const ns = {...hotspotState, npsActive: v};
                                                                    setHotspotState(ns);
                                                                    handleHotspotSave(undefined, ns);
                                                                }} 
                                                            />
                                                        </div>
                                                        
                                                        {hotspotState.npsActive && (
                                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in slide-in-from-top-4 duration-500 relative z-10">
                                                                <div className="md:col-span-8 space-y-3">
                                                                    <Label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Pergunta da Pesquisa (Pós-login)</Label>
                                                                    <Input 
                                                                        placeholder="Ex: Como você avalia nossa conexão hoje?" 
                                                                        value={hotspotState.npsQuestion}
                                                                        onChange={(e) => setHotspotState(s => ({...s, npsQuestion: e.target.value}))}
                                                                        className="h-12 bg-slate-950 border-white/5 rounded-xl font-bold text-xs focus:ring-1 focus:ring-indigo-500" 
                                                                    />
                                                                </div>
                                                                <div className="md:col-span-4 space-y-3">
                                                                    <Label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Timing (Seg)</Label>
                                                                    <Input 
                                                                        type="number" 
                                                                        placeholder="60" 
                                                                        value={hotspotState.npsTimeout}
                                                                        onChange={(e) => setHotspotState(s => ({...s, npsTimeout: parseInt(e.target.value)}))}
                                                                        className="h-12 bg-slate-950 border-white/5 rounded-xl font-bold text-xs" 
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="p-8 bg-slate-950 border border-white/5 rounded-3xl space-y-8 relative overflow-hidden group">
                                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <div className="flex items-center justify-between relative z-10">
                                                            <div className="flex items-center gap-4">
                                                                <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-primary border border-white/5">
                                                                    <Layout className="h-6 w-6" />
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-xs font-bold uppercase tracking-widest text-white">Domínio da Experiência (Personalização Total)</h4>
                                                                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-tight">Use seu próprio HTML/CSS em um arquivo .ZIP</p>
                                                                </div>
                                                            </div>
                                                            <Switch 
                                                                checked={hotspotState.useCustomPage} 
                                                                onCheckedChange={async (v) => {
                                                                    const toastId = toast.loading(`${v ? 'Ativando' : 'Desativando'} portal customizado...`);
                                                                    try {
                                                                        await toggleHotspotCustomPageAction(v);
                                                                        const ns = {...hotspotState, useCustomPage: v};
                                                                        setHotspotState(ns);
                                                                        toast.success(`Portal ${v ? 'Customizado Ativado' : 'Pro Max Restaurado'}!`, { id: toastId });
                                                                    } catch (err: any) {
                                                                        toast.error(err.message, { id: toastId });
                                                                    }
                                                                }} 
                                                            />
                                                        </div>

                                                        {hotspotState.useCustomPage && (
                                                            <div className="space-y-6 animate-in zoom-in-95 duration-500 relative z-10">
                                                                <div className="border-2 border-dashed border-white/10 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center space-y-4 hover:border-primary/40 transition-all bg-white/[0.01]">
                                                                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-all">
                                                                        <FileArchive className="h-8 w-8" />
                                                                    </div>
                                                                    <div>
                                                                        <h5 className="text-[11px] font-bold uppercase tracking-widest text-white mb-2">Upload de Template (.ZIP)</h5>
                                                                        <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed max-w-xs mx-auto">
                                                                            O arquivo deve conter um <span className="text-primary italic">index.html</span> na raiz.
                                                                        </p>
                                                                    </div>
                                                                    <label className="cursor-pointer">
                                                                        <Button variant="outline" asChild className="border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-[0.2em] h-12 px-10 rounded-xl hover:bg-primary hover:text-slate-950 transition-all">
                                                                            <span>Selecionar Arquivo</span>
                                                                        </Button>
                                                                        <input 
                                                                            type="file" 
                                                                            className="hidden" 
                                                                            accept=".zip" 
                                                                            onChange={async (e) => {
                                                                                const file = e.target.files?.[0];
                                                                                if (!file) return;
                                                                                
                                                                                const toastId = toast.loading("Enviando portal de alta performance...");
                                                                                const formData = new FormData();
                                                                                formData.append("file", file);
                                                                                
                                                                                try {
                                                                                    await uploadHotspotZipAction(formData);
                                                                                    toast.success("Portal carregado e sincronizado!", { id: toastId });
                                                                                } catch (err: any) {
                                                                                    toast.error(err.message, { id: toastId });
                                                                                }
                                                                            }} 
                                                                        />
                                                                    </label>
                                                                </div>
                                                                <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-4">
                                                                    <ShieldAlert className="h-5 w-5 text-primary mt-1" />
                                                                    <div>
                                                                        <p className="text-[10px] font-bold text-primary uppercase tracking-tight">Aviso de Performance</p>
                                                                        <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed mt-1">
                                                                            Ao usar HTML customizado, as automações visuais "Pro Max" serão substituídas pelo seu código.
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <Button disabled={isSaving} className="w-full h-14 rounded-2xl bg-white text-slate-950 hover:bg-white/90 font-bold uppercase text-sm tracking-wide active:scale-95 transition-all shadow-lg shadow-white/5">
                                                        {isSaving ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save className="h-5 w-5 mr-2" />} Aplicar Design & Automação
                                                    </Button>
                                                </div>
                                                <div className="flex justify-center items-center sticky top-10">
                                                    <div className="w-72 h-[580px] border-[12px] border-slate-950 rounded-[3rem] bg-slate-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col items-center ring-2 ring-white/10">
                                                        {/* SMARTPHONE STATUS BAR */}
                                                        <div className="absolute top-0 w-full h-8 flex items-center justify-between px-6 z-[60]">
                                                            <span className="text-[10px] font-bold text-white/90">9:41</span>
                                                            <div className="w-16 h-5 bg-black rounded-full absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
                                                                <div className="w-1 h-1 bg-white/10 rounded-full" />
                                                            </div>
                                                            <div className="flex items-center gap-1.5 grayscale opacity-80 scale-75 origin-right">
                                                                <Activity className="h-3 w-3 text-white" />
                                                                <Wifi className="h-3 w-3 text-white" />
                                                                <div className="w-4 h-2 border border-white/50 rounded-sm relative">
                                                                    <div className="absolute left-[0.5px] top-[0.5px] bottom-[0.5px] bg-white w-[70%]" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* BACKGROUND LAYER */}
                                                        <div className="absolute inset-0 z-0">
                                                            {hotspotState.bgType === "IMAGE" && hotspotState.bannerUrl ? (
                                                                <img src={hotspotState.bannerUrl} className="w-full h-full object-cover" alt="Preview bg" />
                                                            ) : hotspotState.bgType === "VIDEO" ? (
                                                                <div className="w-full h-full bg-slate-950 relative overflow-hidden">
                                                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/80 z-10" />
                                                                    <div className="w-full h-full bg-indigo-900/20 animate-pulse" />
                                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20">
                                                                        <PlayCircle className="h-20 w-20 text-white animate-soft-pulse" />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="w-full h-full bg-slate-900" style={{ backgroundColor: hotspotState.primaryColor + '20' }} />
                                                            )}
                                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent z-[5]" />
                                                        </div>

                                                        {/* CONTENT BOX (GLASSMORPHISM) */}
                                                        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8 mt-4">
                                                            <div className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-500">
                                                                <div className="flex justify-center mb-6">
                                                                    <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg transform rotate-3 overflow-hidden" style={{backgroundColor: hotspotState.primaryColor}}>
                                                                        {hotspotState.logoUrl ? (
                                                                            <img src={hotspotState.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                                                                        ) : (
                                                                            <Wifi className="h-7 w-7 text-slate-950" />
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <h2 className="text-2xl font-bold text-white tracking-tighter text-center leading-none mb-2">{hotspotState.title}</h2>
                                                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center mb-8">{hotspotState.subtitle}</p>

                                                                <div className="space-y-4 mb-10">
                                                                    {hotspotState.collectName && (
                                                                        <div className="space-y-1">
                                                                            <div className="h-12 w-full bg-slate-950/60 rounded-2xl border border-white/5 flex items-center px-5 shadow-inner">
                                                                                <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Nome Completo</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {hotspotState.collectPhone && (
                                                                        <div className="h-12 w-full bg-slate-950/60 rounded-2xl border border-white/5 flex items-center px-5 shadow-inner">
                                                                            <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">WhatsApp</span>
                                                                        </div>
                                                                    )}
                                                                    {hotspotState.collectEmail && (
                                                                        <div className="h-12 w-full bg-slate-950/60 rounded-2xl border border-white/5 flex items-center px-5 shadow-inner">
                                                                            <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Seu melhor E-mail</span>
                                                                        </div>
                                                                    )}
                                                                    {hotspotState.collectCpf && (
                                                                        <div className="h-12 w-full bg-slate-950/60 rounded-2xl border border-white/5 flex items-center px-5 shadow-inner">
                                                                            <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">CPF</span>
                                                                        </div>
                                                                    )}
                                                                    {!hotspotState.collectName && !hotspotState.collectPhone && !hotspotState.collectEmail && !hotspotState.collectCpf && (
                                                                        <div className="text-[9px] font-bold text-emerald-400/50 text-center uppercase tracking-widest py-6 border-2 border-dashed border-emerald-500/10 rounded-3xl bg-emerald-500/[0.02]">Acesso em 1 Clique</div>
                                                                    )}
                                                                </div>

                                                                <Button className="w-full h-14 rounded-2xl shadow-xl font-bold uppercase text-[11px] tracking-widest transition-all active:scale-95 text-slate-950" style={{backgroundColor: hotspotState.primaryColor}}>
                                                                    Conectar agora
                                                                </Button>

                                                                <div className="mt-6 flex justify-center gap-4 opacity-40">
                                                                    <div className="h-1 w-8 bg-white/20 rounded-full" />
                                                                    <div className="h-1 w-8 bg-white/20 rounded-full" />
                                                                </div>
                                                            </div>
                                                            <div className="absolute bottom-1 w-20 h-1 bg-white/20 rounded-full z-[60]" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </form>
                                        </TabsContent>
                                        <TabsContent value="network" className="p-10 m-0 animate-in fade-in duration-500">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                                <div className="space-y-8">
                                                    <div className="p-8 bg-white/[0.02] rounded-3xl border border-white/5 space-y-4">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Server className="h-5 w-5" /></div>
                                                            <h4 className="text-sm font-bold uppercase tracking-widest">RADIUS Infra</h4>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase">Servidor Auth</span>
                                                                <div className="h-12 bg-slate-950 rounded-xl flex items-center px-4 font-mono text-[11px] border border-white/5">10.255.0.1</div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase">Protocolo</span>
                                                                <div className="h-12 bg-slate-950 rounded-xl flex items-center px-4 font-mono text-[11px] border border-white/5">PAP / MS-CHAPv2</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-8 bg-white/[0.02] rounded-3xl border border-white/5 space-y-4">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><ShieldCheck className="h-5 w-5" /></div>
                                                                <h4 className="text-sm font-bold uppercase tracking-widest">Walled Garden Dynamic</h4>
                                                            </div>
                                                            <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl text-[10px] font-bold uppercase hover:bg-white/5" onClick={() => {
                                                                const host = prompt("Domínio para liberar (ex: google.com)");
                                                                if (host) setHotspotState(s => ({...s, walledGarden: [...(s.walledGarden || []), host]}))
                                                            }}>
                                                                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                                                            </Button>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {["mikrogestor.com", "gstatic.com", "googleapis.com", ...(hotspotState.walledGarden || [])].map((host, i) => (
                                                                <Badge key={i} variant="outline" className="bg-slate-950 border-white/10 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide gap-2 group/badge">
                                                                    {host}
                                                                    {i > 2 && <X className="h-3 w-3 cursor-pointer hover:text-red-500 transition-colors" onClick={() => setHotspotState(s => ({...s, walledGarden: (s.walledGarden || []).filter(h => h !== host)}))} />}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Script MikroTik Advanced (RADIUS)</h4>
                                                        <Button size="sm" variant="outline" className="h-10 px-5 rounded-xl font-bold text-[10px] uppercase gap-2 border-white/10 hover:bg-white/5 transition-all" onClick={() => {
                                                            const script = vpnConfig?.fullScript || "";
                                                            navigator.clipboard.writeText(script);
                                                            toast.success("Script de provisionamento copiado!");
                                                        }}>
                                                            <Copy className="h-3.5 w-3.5" /> Copiar para Terminal
                                                        </Button>
                                                    </div>
                                                    <div className="rounded-[2.5rem] bg-slate-950 border border-white/10 p-8 h-[440px] overflow-auto font-mono text-[11px] leading-relaxed text-slate-400 relative group custom-scrollbar">
                                                       <code className="whitespace-pre">{vpnConfig?.fullScript || "# Aguardando seleção de hardware..."}</code>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex justify-end p-8 border-t border-white/5 bg-white/[0.01] rounded-b-[2.5rem] mt-8">
                                                <Button onClick={() => handleHotspotSave(new FormData())} disabled={isSaving} className="rounded-2xl px-10 font-bold uppercase tracking-widest text-xs h-14 bg-primary text-slate-950 shadow-xl shadow-primary/10 gap-3 hover:scale-[1.02] transition-transform">
                                                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                                                  Sync via API Bridge
                                                </Button>
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="vouchers" className="p-10 m-0 animate-in fade-in duration-500">
                                            <div className="bg-slate-950/40 rounded-[2rem] border border-white/5 p-1 overflow-hidden">
                                                <HotspotVoucherManager />
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="leads" className="p-10 m-0 animate-in fade-in duration-500">
                                            <div className="rounded-[2.5rem] border border-white/5 overflow-hidden bg-slate-950/40 shadow-inner">
                                                <table className="w-full border-collapse">
                                                    <thead className="bg-white/[0.02] text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">
                                                        <tr>
                                                            <th className="p-8 border-b border-white/5">Visitante</th>
                                                            <th className="p-8 border-b border-white/5 text-right">Canal de Contato</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {hotspotLeads?.length === 0 && (
                                                            <tr>
                                                                <td colSpan={2} className="p-20 text-center text-[10px] font-bold uppercase text-slate-600 tracking-widest">Nenhum lead capturado ainda</td>
                                                            </tr>
                                                        )}
                                                        {hotspotLeads?.map((lead: any) => (
                                                            <tr key={lead.id} className="hover:bg-white/[0.01] transition-colors group">
                                                                <td className="p-8">
                                                                    <div className="font-bold text-sm text-white group-hover:text-primary transition-colors">{lead.name || "Acesso Anônimo"}</div>
                                                                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">{lead.email || "---"}</div>
                                                                </td>
                                                                <td className="p-8 text-right">
                                                                    <Badge variant="outline" className="h-10 rounded-xl bg-slate-950 border-white/10 text-white font-mono font-bold px-4 tracking-tighter">
                                                                        {lead.phone || "VIA HOTSPOT"}
                                                                    </Badge>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </Card>
                            </TabsContent>

                            <TabsContent value="leads" className="m-0 space-y-10 focus-visible:ring-0">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                    <div className="space-y-4">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                                            <Users className="h-3 w-3 text-primary" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">CRM & Audiência Hotspot</span>
                                        </div>
                                        <h2 className="text-4xl font-bold tracking-tight text-white leading-tight underline decoration-primary/30 decoration-4 underline-offset-8">Clientes <span className="text-slate-500">Auto-cadastrados</span></h2>
                                        <p className="max-w-2xl text-[13px] font-medium leading-relaxed text-slate-500">Base de leads capturada no seu Hotspot Digital Pro Max. Seus clientes fiéis estão aqui.</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button variant="outline" className="h-11 border-white/5 bg-slate-900/60 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all outline-none focus:ring-1 focus:ring-primary" onClick={() => queryClient.invalidateQueries({ queryKey: ["hotspot-leads"] })}>
                                            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
                                        </Button>
                                        <Button variant="neon" className="h-11 text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-xl shadow-primary/10 transition-all hover:scale-105 active:scale-95">
                                            <Download className="mr-2 h-4 w-4" /> Exportar Leads
                                        </Button>
                                    </div>
                                </div>

                                <Card className="border-none bg-slate-900/40 rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-md relative overflow-hidden ring-1 ring-white/5">
                                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                                        <Users className="h-64 w-64 text-white" />
                                    </div>

                                    <div className="relative z-10 space-y-6">
                                        <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
                                            <div className="relative w-full md:w-96">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                                <Input 
                                                    placeholder="Buscar audiência..." 
                                                    className="w-full h-12 pl-12 bg-slate-950 border-white/10 rounded-xl text-xs font-bold placeholder:text-slate-600 focus:ring-1 focus:ring-primary/50 transition-all" 
                                                />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="h-10 border-white/5 bg-white/5 text-slate-400 font-bold uppercase tracking-widest px-6 rounded-xl">
                                                    Total: {hotspotLeads?.length || 0} Leads de Ouro
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto rounded-[2rem] border border-white/5 bg-slate-950/20 shadow-inner">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-white/[0.04] border-b border-white/5">
                                                        <th className="px-8 py-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">NOME DO CLIENTE</th>
                                                        <th className="px-8 py-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">CONTATO DIGITAL</th>
                                                        <th className="px-8 py-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">DOC (CPF)</th>
                                                        <th className="px-8 py-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">DATA DE CAPTURA</th>
                                                        <th className="px-8 py-6 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">INTERAÇÃO</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {hotspotLeads?.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={5} className="px-8 py-24 text-center">
                                                                <div className="h-20 w-20 rounded-3xl bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-6 text-primary animate-bounce">
                                                                    <UserPlus className="h-10 w-10" />
                                                                </div>
                                                                <h4 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">Vazio, por enquanto!</h4>
                                                                <p className="max-w-xs mx-auto text-[11px] font-bold text-slate-600 uppercase tracking-widest leading-relaxed">Seus clientes aparecerão aqui assim que se conectarem ao Hotspot Wifi.</p>
                                                            </td>
                                                        </tr>
                                                    ) : hotspotLeads?.map((lead: any) => (
                                                        <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors group/row cursor-default">
                                                            <td className="px-8 py-6">
                                                                <div className="flex items-center gap-5">
                                                                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-primary/30 to-primary/10 flex items-center justify-center text-primary font-bold text-sm ring-1 ring-primary/30 group-hover/row:scale-110 transition-all">
                                                                        {lead.name?.charAt(0).toUpperCase() || <Users className="h-5 w-5" />}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-bold text-slate-200 tracking-tight group-hover/row:text-primary transition-colors">{lead.name || "Cliente Wifi"}</p>
                                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Visitante Verificado</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-2.5 text-xs font-medium text-slate-400 hover:text-white transition-colors">
                                                                        <Globe className="h-3.5 w-3.5 text-slate-500" /> {lead.email || "-"}
                                                                    </div>
                                                                    <div className="flex items-center gap-2.5 text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors">
                                                                        <MessageCircle className="h-3.5 w-3.5 text-emerald-500" /> {lead.phone || "-"}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <code className="bg-slate-900 px-3 py-1.5 rounded-lg border border-white/5 text-[10px] font-bold text-slate-400 tracking-tighter">
                                                                    {lead.cpf || "000.***.***-**"}
                                                                </code>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                                                    <Activity className="h-3 w-3" /> {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true, locale: ptBR })}
                                                                </p>
                                                            </td>
                                                            <td className="px-8 py-6 text-center">
                                                                <div className="flex items-center justify-center gap-3">
                                                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-emerald-500/10 hover:text-emerald-500 transition-all border border-transparent">
                                                                        <MessageCircle className="h-5 w-5" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-white/5 text-slate-500 hover:text-white transition-all border border-transparent">
                                                                        <ExternalLink className="h-4.5 w-4.5" />
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* INFRA TAB */}
                            <TabsContent value="infra" className="m-0 space-y-10 focus-visible:ring-0">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                    <div className="lg:col-span-8">
                                        <IpPoolManager />
                                    </div>
                                    <div className="lg:col-span-4 space-y-6">
                                        <Card className="p-10 bg-slate-900/60 border border-white/5 rounded-[2.5rem] shadow-xl backdrop-blur-md">
                                            <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                                                <ShieldCheck className="text-primary h-5 w-5" /> Radius Sync
                                            </h3>
                                            <p className="text-xs text-slate-500 leading-relaxed mb-8">
                                                Garante que o banco de dados Cloud esteja em sincronia perfeita com as permissões de acesso do Mikrogestor.
                                            </p>
                                            <Button onClick={() => syncAllRadiusAccountsAction()} className="w-full h-12 rounded-xl bg-white text-slate-950 font-bold uppercase text-[9px] tracking-widest shadow-lg shadow-white/5 hover:bg-white/90 active:scale-95 transition-all">
                                                Executar Sincronização Geral
                                            </Button>
                                        </Card>
                                        <Card className="p-8 bg-amber-500/5 border border-amber-500/10 rounded-[2rem]">
                                             <div className="flex items-center gap-3 mb-4">
                                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                                <h4 className="text-[10px] font-bold uppercase text-amber-500 tracking-wider">Lembrete Técnico</h4>
                                             </div>
                                             <p className="text-[10px] text-amber-500/70 font-medium leading-relaxed uppercase">
                                                Alterações em Pools IP requerem reinício dos serviços de autenticação para entrar em vigor nos clientes conectados.
                                             </p>
                                        </Card>
                                    </div>
                                </div>
                            </TabsContent>

                        </main>
                    </div>
                </div>
            </Tabs>

            <AddVpnDeviceModal
                open={isAddVpnModalOpen}
                onOpenChange={setIsAddVpnModalOpen}
                quota={vpnQuota ? {
                    used: Number((vpnQuota as any).used) || 0,
                    limit: Number((vpnQuota as any).limit) || 0,
                    available: Number((vpnQuota as any).available) || 0
                } : undefined}
                onSuccess={() => {
                    queryClient.invalidateQueries();
                    setIsAddVpnModalOpen(false);
                }}
            />
        </div>
    );
}

