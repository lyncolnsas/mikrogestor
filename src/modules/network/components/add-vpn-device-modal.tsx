"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Smartphone, Monitor, Router, Server, Zap, History, ShieldCheck, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { createVpnTunnelAction } from "@/modules/saas/actions/vpn-create.actions"
import { toast } from "sonner"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const deviceSchema = z.object({
    name: z.string().min(2, "Nome muito curto").max(30, "Nome muito longo"),
    type: z.enum(["MOBILE", "PC", "MIKROTIK"]),
    protocol: z.enum(["WIREGUARD", "L2TP", "SSTP"]).default("WIREGUARD"),
});

interface AddVpnDeviceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    quota?: {
        used: number;
        limit: number;
        available: number;
    };
}

export function AddVpnDeviceModal({ open, onOpenChange, onSuccess, quota }: AddVpnDeviceModalProps) {
    const form = useForm<z.infer<typeof deviceSchema>>({
        resolver: zodResolver(deviceSchema),
        defaultValues: {
            name: "",
            type: "MIKROTIK",
            protocol: "WIREGUARD",
        }
    });

    const { isSubmitting } = form.formState;

    async function onSubmit(data: z.infer<typeof deviceSchema>) {
        try {
            // Check quota before submitting
            if (quota && quota.available <= 0) {
                toast.error(
                    `Limite de VPNs atingido. Seu plano permite ${quota.limit} VPN(s) ativa(s). ` +
                    `Faça upgrade do seu plano ou delete uma VPN existente.`
                );
                return;
            }

            const result = await createVpnTunnelAction(data);

            if (result.error) {
                toast.error(result.error);
                return;
            }

            toast.success(`Dispositivo VPN "${data.name}" criado com sucesso!`);
            form.reset();
            onOpenChange(false);
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.message || "Erro ao criar dispositivo VPN");
        }
    }

    const getDeviceIcon = (type: string) => {
        switch (type) {
            case "MIKROTIK": return <Router className="h-5 w-5" />;
            case "MOBILE": return <Smartphone className="h-5 w-5" />;
            case "PC": return <Monitor className="h-5 w-5" />;
            default: return <Server className="h-5 w-5" />;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl p-0">
                <DialogHeader className="p-8 bg-slate-900/50 border-b border-slate-800">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Server className="h-6 w-6 text-primary" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-white">Adicionar Dispositivo VPN</DialogTitle>
                    </div>
                    <DialogDescription className="text-sm text-slate-400 font-medium">
                        Crie um novo túnel VPN para conectar dispositivos adicionais à sua infraestrutura.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6 bg-slate-950">
                    {/* Quota Display */}
                    {quota && (
                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-black uppercase tracking-widest text-primary/80">Uso de VPN</h4>
                                <span className="text-sm font-mono font-bold text-primary">
                                    {quota.used}/{quota.limit} VPNs
                                </span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                                <div
                                    className={`h-full transition-all ${quota.available <= 0 ? 'bg-red-500' :
                                        quota.used / quota.limit > 0.8 ? 'bg-orange-500' :
                                            'bg-primary'
                                        }`}
                                    style={{ width: `${Math.min((quota.used / quota.limit) * 100, 100)}%` }}
                                />
                            </div>
                            {quota.available <= 0 && (
                                <p className="text-xs text-red-400 mt-2 font-medium">
                                    ⚠️ Limite atingido. Delete VPNs existentes ou faça upgrade do plano.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-bold uppercase text-slate-300">Nome do Dispositivo</Label>
                            <Input
                                id="name"
                                {...form.register("name")}
                                placeholder="Ex: MikroTik Filial 2, iPhone Admin, Notebook Técnico"
                                className="rounded-xl h-12 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:border-primary transition-all"
                            />
                            {form.formState.errors.name && (
                                <p className="text-xs text-red-400">{form.formState.errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-300">Tipo de Dispositivo</Label>
                            <Select onValueChange={(value) => form.setValue("type", value as any)} defaultValue={form.getValues("type")}>
                                <SelectTrigger className="rounded-xl h-12 bg-slate-900 border-slate-800 text-white focus:ring-primary transition-all">
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    <SelectItem value="MIKROTIK" className="focus:bg-slate-800 focus:text-primary">
                                        <div className="flex items-center gap-3">
                                            <Router className="h-4 w-4" />
                                            <div className="flex flex-col">
                                                <span className="font-bold">MikroTik Router</span>
                                                <span className="text-[10px] text-slate-400">Roteador ou concentrador adicional</span>
                                            </div>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="MOBILE" className="focus:bg-slate-800 focus:text-primary">
                                        <div className="flex items-center gap-3">
                                            <Smartphone className="h-4 w-4" />
                                            <div className="flex flex-col">
                                                <span className="font-bold">Dispositivo Móvel</span>
                                                <span className="text-[10px] text-slate-400">Smartphone ou tablet</span>
                                            </div>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="PC" className="focus:bg-slate-800 focus:text-primary">
                                        <div className="flex items-center gap-3">
                                            <Monitor className="h-4 w-4" />
                                            <div className="flex flex-col">
                                                <span className="font-bold">Computador</span>
                                                <span className="text-[10px] text-slate-400">Desktop ou notebook</span>
                                            </div>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {form.watch("type") === "MIKROTIK" && (
                            <div className="space-y-4">
                                <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Tecnologia VPN (Hardware)</Label>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Option 1: WIREGUARD (ROS v7) */}
                                    <div 
                                        onClick={() => form.setValue("protocol", "WIREGUARD")}
                                        className={`cursor-pointer rounded-2xl p-5 border-2 transition-all flex flex-col gap-3 group ${
                                            form.watch("protocol") === "WIREGUARD" 
                                            ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]" 
                                            : "border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900"
                                        }`}
                                    >
                                        <div className={`p-2 rounded-xl border w-fit ${
                                            form.watch("protocol") === "WIREGUARD" ? "bg-primary text-white" : "bg-slate-800 text-slate-400 group-hover:text-slate-200"
                                        }`}>
                                            <Zap className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h5 className="font-black text-sm uppercase italic tracking-tight">Moderna (v7.x+)</h5>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase leading-snug mt-1">
                                                Recomendado para RB com RouterOS v7 ou superior.
                                            </p>
                                        </div>
                                        <div className="mt-auto pt-2 flex items-center gap-1.5 overflow-hidden">
                                            <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-500 border-none px-1.5 py-0 h-4">WIREGUARD</Badge>
                                            <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-500 border-none px-1.5 py-0 h-4">ULTRA-LOW LATENCY</Badge>
                                        </div>
                                    </div>

                                    {/* Option 2: L2TP (ROS v4-v6) */}
                                    <div 
                                        onClick={() => form.setValue("protocol", "L2TP")}
                                        className={`cursor-pointer rounded-2xl p-5 border-2 transition-all flex flex-col gap-3 group ${
                                            form.watch("protocol") === "L2TP" 
                                            ? "border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                                            : "border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900"
                                        }`}
                                    >
                                        <div className={`p-2 rounded-xl border w-fit ${
                                            form.watch("protocol") === "L2TP" ? "bg-amber-500 text-white" : "bg-slate-800 text-slate-400 group-hover:text-slate-200"
                                        }`}>
                                            <History className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h5 className="font-black text-sm uppercase italic tracking-tight">Legada (v4-v6)</h5>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase leading-snug mt-1">
                                                L2TP/IPsec para RBs antigas ou sem suporte WireGuard.
                                            </p>
                                        </div>
                                        <div className="mt-auto pt-2 flex items-center gap-1.5 overflow-hidden">
                                            <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-500 border-none px-1.5 py-0 h-4">L2TP/IPSEC</Badge>
                                            <Badge variant="outline" className="text-[9px] bg-slate-500/10 text-slate-500 border-none px-1.5 py-0 h-4">PLANO B</Badge>
                                        </div>
                                    </div>
                                </div>
                                
                                <p className="text-[10px] text-center font-bold text-slate-500 bg-slate-900/50 p-3 rounded-xl border border-dashed border-slate-800 italic">
                                    Não sabe sua versão? Use <code className="text-primary">/system resource print</code> no terminal do WinBox.
                                </p>
                            </div>
                        )}

                        {form.watch("type") !== "MIKROTIK" && (
                            <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-4">
                                <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
                                <p className="text-xs font-bold text-slate-400 leading-relaxed italic">
                                    Dispositivos móveis e computadores utilizam automaticamente o protocolo 
                                    <strong className="text-primary italic"> WireGuard 3.0</strong> para máxima compatibilidade e segurança.
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-6 border-t border-slate-800 flex items-center justify-end gap-3">
                        <Button
                            variant="ghost"
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="rounded-xl font-bold h-12 px-8 text-slate-400 hover:text-white hover:bg-slate-900 transition-all"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || (quota && quota.available <= 0)}
                            className="rounded-xl font-black bg-primary hover:bg-primary/90 shadow-xl shadow-primary/40 h-12 px-10 border-0 transition-all active:scale-95"
                        >
                            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Criar Dispositivo VPN"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
