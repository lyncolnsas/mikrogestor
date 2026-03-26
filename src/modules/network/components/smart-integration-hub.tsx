"use client"

import { useState } from "react"
import { CheckCircle2, Circle, ShieldCheck, Zap, Terminal, Activity, ChevronRight, AlertCircle, PlayCircle, Ticket, Shuffle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { VpnConfigWizard } from "./vpn-config-wizard"
import { HotspotVoucherManager } from "./hotspot-voucher-manager"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { saveNas } from "@/modules/network/actions/nas.actions"
import { provisionMikrotikAction } from "@/modules/network/actions/mk-provisioning.actions"
import { provisionHotspotAction } from "@/modules/saas/actions/hotspot.actions"
import { toast } from "sonner"

interface SmartHubProps {
    status: {
        vpnConnected: boolean;
        nasRegistered: boolean;
        radiusAuthOk: boolean;
        servicesInjected: boolean;
    };
    tunnelData: any;
    nasData: any;
    configScripts: any;
}

export function SmartIntegrationHub({ status, tunnelData, nasData, configScripts }: SmartHubProps) {
    const queryClient = useQueryClient();
    const [activeLayer, setActiveLayer] = useState<number>(
        !status.vpnConnected ? 1 : 
        !status.nasRegistered ? 2 : 
        !status.radiusAuthOk ? 3 : 4
    );

    // MUTATIONS
    const activateIdentity = useMutation({
        mutationFn: async () => {
            if (!tunnelData?.internalIp) throw new Error("IP interno do túnel não identificado.");
            return await saveNas({
                name: tunnelData.name || "MikroTik Remote",
                connectionType: "VPN_TUNNEL",
                ipAddress: tunnelData.internalIp,
                secret: "radius123", // Default secret for auto-provisioning
                apiUser: "admin",
                apiPassword: "",
                apiPort: 8728,
                vpnProtocol: tunnelData.protocol || "WIREGUARD",
                mikrotikVersion: "v7", // Most common for new setups
            });
        },
        onSuccess: (res: any) => {
            if (res.success) {
                toast.success("Identidade NAS registrada com sucesso!");
                queryClient.invalidateQueries();
                setActiveLayer(3);
            } else {
                toast.error(res.error || "Erro ao registrar identidade.");
            }
        }
    });

    const injectProvisioning = useMutation({
        mutationFn: async () => {
            if (!nasData?.id) throw new Error("ID do concentrador não identificado.");
            return await provisionMikrotikAction({
                nasId: String(nasData.id),
                interfaceName: "ether1",
                radiusSecret: nasData.secret || "radius123",
                serverIp: "10.255.0.1",
                localAddress: "10.0.0.1",
                dnsPrimary: "8.8.8.8"
            });
        },
        onSuccess: (res: any) => {
            if (res.success) {
                toast.success("Provisionamento Radius concluído!");
                queryClient.invalidateQueries();
                setActiveLayer(4);
            } else {
                toast.error(res.error || "Erro no provisionamento.");
            }
        }
    });

    const injectHotspot = useMutation({
        mutationFn: async () => {
            if (!nasData?.id) throw new Error("Selecione um concentrador primeiro.");
            return await provisionHotspotAction(nasData.id, {
                interface: "ether3",
                hotspotAddress: "192.168.88.1/24",
                dnsName: "wifi.mikrogestor.com"
            });
        },
        onSuccess: () => {
            toast.success("Serviços de Hotspot configurados via API!");
            queryClient.invalidateQueries();
        },
        onError: (err: any) => {
            toast.error(err.message || "Erro na injeção de Hotspot.");
        }
    });

    const layers = [
        {
            id: 1,
            title: "Transporte (VPN Bridge)",
            description: "Conecta seu hardware à nossa rede segura.",
            status: status.vpnConnected ? "DONE" : "PENDING",
            icon: <Zap className="h-6 w-6" />,
            content: (
                <div className="mt-8">
                   <VpnConfigWizard 
                        protocol={tunnelData?.protocol || "WIREGUARD"}
                        tunnelId={tunnelData?.id}
                        internalIp={tunnelData?.internalIp}
                        config={configScripts}
                        nasVersion="v7"
                        nasProtocol={tunnelData?.protocol}
                   />
                </div>
            )
        },
        {
            id: 2,
            title: "Identidade (NAS Sync)",
            description: "Vincula o túnel VPN ao servidor Radius central.",
            status: status.nasRegistered ? "DONE" : (status.vpnConnected ? "PENDING" : "LOCKED"),
            icon: <ShieldCheck className="h-6 w-6" />,
            content: (
                <div className="mt-8 space-y-6 animate-in slide-in-from-right-4">
                    <div className="p-8 bg-slate-950/60 rounded-3xl border border-white/5 space-y-6">
                         <div className="flex items-center gap-4">
                             <div className="p-4 bg-primary/20 rounded-2xl text-primary">
                                 <Activity className="h-7 w-7" />
                             </div>
                             <div>
                                 <h4 className="text-xl font-bold tracking-tight text-white">Sincronização de Identidade</h4>
                                 <p className="text-sm text-slate-500 font-medium">Vincule o IP {tunnelData?.internalIp} como um servidor confiável.</p>
                             </div>
                         </div>
                         <Button 
                            disabled={activateIdentity.isPending}
                            onClick={() => activateIdentity.mutate()}
                            className="w-full h-14 rounded-2xl bg-white text-slate-950 font-bold uppercase text-sm shadow-xl shadow-white/5"
                         >
                            {activateIdentity.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                            Ativar Identidade NAS Agora
                         </Button>
                    </div>
                </div>
            )
        },
        {
            id: 3,
            title: "Autenticação (Radius Cloud)",
            description: "Valida se as portas de autenticação estão abertas.",
            status: status.radiusAuthOk ? "DONE" : (status.nasRegistered ? "PENDING" : "LOCKED"),
            icon: <CheckCircle2 className="h-6 w-6" />,
            content: (
                <div className={cn(
                    "mt-8 p-10 rounded-3xl border text-center animate-in zoom-in-95 backdrop-blur-sm",
                    status.radiusAuthOk ? "bg-emerald-500/10 border-emerald-500/20" : "bg-slate-950/40 border-white/5"
                )}>
                    <div className="mb-6 flex justify-center">
                        <div className={cn(
                            "h-16 w-16 rounded-full flex items-center justify-center transition-all",
                            status.radiusAuthOk ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-900 text-slate-600"
                        )}>
                            {status.radiusAuthOk ? <CheckCircle2 className="h-8 w-8" /> : <PlayCircle className="h-8 w-8 opacity-50" />}
                        </div>
                    </div>
                    {status.radiusAuthOk ? (
                        <>
                            <h3 className="text-2xl font-bold text-white tracking-tight mb-2">Autenticação Ativa!</h3>
                            <p className="text-slate-400 text-sm mb-6">O servidor Radius central está conversando com sua MikroTik.</p>
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-none rounded-full px-5 py-1 text-[10px] font-bold">STATUS: ONLINE • PORTA 1812</Badge>
                        </>
                    ) : (
                        <>
                            <h3 className="text-2xl font-bold text-white tracking-tight mb-2">Configurar Radius</h3>
                            <p className="text-slate-400 text-sm mb-8 max-w-sm mx-auto">Injete os parâmetros de autenticação via API para validar o canal Radius.</p>
                            <Button 
                                disabled={injectProvisioning.isPending}
                                onClick={() => injectProvisioning.mutate()}
                                className="h-12 px-8 rounded-xl bg-primary text-slate-950 font-bold uppercase text-[11px] tracking-wider transition-all"
                            >
                                {injectProvisioning.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                                Validar Autenticação Cloud
                            </Button>
                        </>
                    )}
                </div>
            )
        },
        {
            id: 4,
            title: "Serviços Digital",
            description: "Ativa as regras comerciais e vinhos de firewall.",
            status: status.servicesInjected ? "DONE" : (status.radiusAuthOk ? "PENDING" : "LOCKED"),
            icon: <Terminal className="h-6 w-6" />,
            content: (
                 <div className="mt-8 space-y-8 animate-in slide-in-from-bottom-8 duration-700">
                    <Tabs defaultValue="vouchers" className="w-full">
                        <div className="flex items-center justify-between mb-8 bg-slate-950/60 p-1.5 rounded-2xl border border-white/5">
                            <TabsList className="bg-transparent h-10 w-full">
                                <TabsTrigger value="vouchers" className="flex-1 rounded-xl h-8 data-[state=active]:bg-primary data-[state=active]:text-slate-950 font-bold text-[11px] uppercase tracking-wider transition-all">
                                    <Ticket className="mr-2 h-4 w-4" /> Vouchers
                                </TabsTrigger>
                                <TabsTrigger value="config" className="flex-1 rounded-xl h-8 data-[state=active]:bg-primary data-[state=active]:text-slate-950 font-bold text-[11px] uppercase tracking-wider transition-all">
                                    <Zap className="mr-2 h-4 w-4" /> Regras Hotspot
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="vouchers" className="mt-0 focus-visible:ring-0">
                            <div className="bg-slate-950/40 rounded-[2.5rem] border border-white/5 p-1 overflow-hidden">
                                <HotspotVoucherManager />
                            </div>
                        </TabsContent>

                        <TabsContent value="config" className="mt-0 focus-visible:ring-0">
                            <div className="p-10 bg-slate-950/40 rounded-3xl border border-white/5 space-y-8">
                                <div className="flex items-center gap-6">
                                    <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-white/5">
                                        <Shuffle className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold tracking-tight text-white">Injeção de Perfil Hotspot</h4>
                                        <p className="text-sm text-slate-500 font-medium">Configuração de redirecionamento e Walled Garden Pro.</p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-4">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">DNS: wifi.mikrogestor.com</span>
                                    </div>
                                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-4">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Portal Captive</span>
                                    </div>
                                </div>

                                <Button 
                                    disabled={injectHotspot.isPending}
                                    onClick={() => injectHotspot.mutate()}
                                    className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase text-base shadow-lg shadow-indigo-600/10 active:scale-95 transition-all"
                                >
                                    {injectHotspot.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Activity className="mr-2 h-5 w-5" />} 
                                    Injetar Regras de Firewall
                                </Button>
                                <p className="text-[10px] font-medium text-center text-slate-500 uppercase tracking-widest">Ação instantânea via API no roteador.</p>
                            </div>
                        </TabsContent>
                    </Tabs>
                 </div>
            )
        }
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 min-h-[600px] animate-in fade-in duration-700">
            {/* Sidebar Hub Checklist */}
            <div className="lg:col-span-4 space-y-4">
                <div className="p-4">
                    <h3 className="text-xl font-bold tracking-tight text-white mb-1">Integration Hub</h3>
                    <p className="text-[13px] font-medium text-slate-500 leading-relaxed">
                        Mantenha todas as camadas ativas para o faturamento do ISP.
                    </p>
                </div>
                
                <div className="space-y-3 relative">
                    {layers.map((layer) => (
                        <div 
                            key={layer.id}
                            onClick={() => layer.status !== "LOCKED" && setActiveLayer(layer.id)}
                            className={cn(
                                "relative group flex items-center gap-5 p-5 rounded-3xl transition-all cursor-pointer border",
                                activeLayer === layer.id 
                                    ? "bg-slate-900/80 border-white/10 shadow-2xl shadow-primary/5 ring-1 ring-white/5" 
                                    : "bg-transparent border-transparent hover:bg-white/[0.02]"
                            )}
                        >
                            <div className={cn(
                                "relative z-10 h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-inner",
                                layer.status === "DONE" ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20" :
                                activeLayer === layer.id ? "bg-primary text-slate-950 shadow-lg shadow-primary/20" : "bg-slate-950 border border-white/5 text-slate-500"
                            )}>
                                {layer.status === "DONE" ? <CheckCircle2 className="h-5 w-5" /> : layer.icon}
                            </div>

                            <div className="flex-1">
                                <p className={cn(
                                    "text-sm font-bold tracking-tight transition-colors",
                                    activeLayer === layer.id ? "text-white" : "text-slate-500"
                                )}>{layer.title}</p>
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-none mt-1.5">{layer.description}</p>
                            </div>

                            {activeLayer === layer.id ? (
                                <ChevronRight className="h-4 w-4 text-primary animate-pulse" />
                            ) : layer.status === "LOCKED" ? (
                                <Circle className="h-3 w-3 text-slate-800" />
                            ) : null}
                        </div>
                    ))}
                </div>

                {/* Integration Health Card */}
                <div className="mt-8 p-8 rounded-[2.5rem] bg-slate-900/40 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Activity className="h-12 w-12 text-primary" />
                    </div>
                    <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-4">Maturidade da Rede</p>
                    <div className="flex items-end gap-2 mb-4">
                        <span className="text-5xl font-bold text-white tracking-tighter leading-none">
                            {layers.filter(l => l.status === "DONE").length * 25}%
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-1.5">Completo</span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 p-0.5">
                        <div 
                            className="h-full bg-primary transition-all duration-1000 shadow-[0_0_12px_rgba(var(--primary),0.6)] rounded-full"
                            style={{ width: `${layers.filter(l => l.status === "DONE").length * 25}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Main Action Content Area */}
            <div className="lg:col-span-8">
                 <div className="h-full min-h-[600px] bg-slate-900/40 rounded-3xl border border-white/5 p-10 relative overflow-hidden">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                        <div>
                             <Badge className="bg-primary/10 text-primary border-primary/20 rounded-lg px-3 mb-2 font-bold text-[10px]">LAYER 0{activeLayer}</Badge>
                             <h2 className="text-3xl font-bold tracking-tight text-white leading-none">
                                {layers[activeLayer-1].title}
                             </h2>
                        </div>
                        
                        {layers[activeLayer-1].status === "DONE" && (
                            <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500 text-[11px] font-bold uppercase animate-in fade-in scale-in-95">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Camada Ativa
                            </div>
                        )}
                    </div>

                    <div className="relative z-10">
                        {layers[activeLayer-1].content}
                    </div>

                    {/* Pro Tip/Alert Info */}
                    <div className="mt-12 p-5 bg-white/[0.02] rounded-2xl border border-white/5 flex items-center gap-4">
                        <div className="h-9 w-9 flex-shrink-0 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400">
                            <AlertCircle className="h-4.5 w-4.5" />
                        </div>
                        <p className="text-[13px] font-medium text-slate-500 leading-relaxed italic">
                            O status das camadas é verificado em tempo real. Se sua RB desconectar, a camada de transporte voltará para o status de alerta automaticamente.
                        </p>
                    </div>
                 </div>
            </div>
        </div>
    )
}
