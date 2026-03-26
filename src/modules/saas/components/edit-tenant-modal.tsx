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
    DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Building2, ShieldCheck, Coins, Percent, CalendarDays, Server, AlertCircle, X } from "lucide-react"
import { updateTenantAction } from "../actions/tenant-management.actions"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface Plan {
    id: string;
    name: string;
    monthlyPrice: string | number | { toString(): string };
}

export interface TenantData {
    id: string;
    name: string;
    extraVpns: number;
    subscription?: {
        planId: string;
        plan?: {
            vpnLimit?: number;
        };
        downgradeScheduledAt?: Date | null;
        downgradeTargetPlan?: {
            id: string;
            name: string;
            vpnLimit?: number;
        } | null;
    };
    financialConfig?: {
        interestRate: number;
        penaltyAmount: number;
        gracePeriod: number;
        autoBlock: boolean;
        autoUnblock: boolean;
    };
    _count?: {
        vpnTunnels?: number;
    };
}

const tenantSchema = z.object({
    tenantId: z.string().uuid(),
    name: z.string().min(3, "Nome do Provedor é obrigatório"),
    planId: z.string().min(1, "Selecione um plano"),
    interestRate: z.coerce.number().min(0, "Mínimo 0%"),
    penaltyAmount: z.coerce.number().min(0, "Mínimo R$ 0"),
    gracePeriod: z.coerce.number().int().min(0, "Mínimo 0 dias"),
    autoBlock: z.boolean().default(true),
    autoUnblock: z.boolean().default(true),
    extraVpns: z.coerce.number().int().min(0, "Mínimo 0"),
});

interface EditTenantModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tenant: TenantData;
    plans: Plan[];
}

export function EditTenantModal({ open, onOpenChange, tenant, plans }: EditTenantModalProps) {
    const queryClient = useQueryClient()
    const [isCancelingDowngrade, setIsCancelingDowngrade] = React.useState(false)

    // VPN Quota Info
    const vpnLimit = tenant.subscription?.plan?.vpnLimit || 1;
    const vpnUsed = tenant._count?.vpnTunnels || 0;
    const hasScheduledDowngrade = !!tenant.subscription?.downgradeScheduledAt;
    const downgradeDate = tenant.subscription?.downgradeScheduledAt;
    const downgradeTargetLimit = tenant.subscription?.downgradeTargetPlan?.vpnLimit || 0;

    const form = useForm<z.infer<typeof tenantSchema>>({
        resolver: zodResolver(tenantSchema),
        defaultValues: {
            tenantId: tenant.id,
            name: tenant.name,
            planId: tenant.subscription?.planId || "",
            interestRate: tenant.financialConfig?.interestRate || 1.0,
            penaltyAmount: tenant.financialConfig?.penaltyAmount || 10.0,
            gracePeriod: tenant.financialConfig?.gracePeriod || 5,
            autoBlock: tenant.financialConfig?.autoBlock ?? true,
            autoUnblock: tenant.financialConfig?.autoUnblock ?? true,
            extraVpns: tenant.extraVpns || 0,
        }
    })

    const { isSubmitting } = form.formState

    async function onSubmit(data: z.infer<typeof tenantSchema>) {
        // Check if plan is changing and would cause downgrade
        const currentPlanId = tenant.subscription?.planId;
        const newPlanId = data.planId;

        if (currentPlanId !== newPlanId) {
            const newPlan = plans.find(p => p.id === newPlanId);
            const newLimit = (newPlan as any)?.vpnLimit || 1;

            if (vpnUsed > newLimit) {
                const downgradeDate = new Date();
                downgradeDate.setDate(downgradeDate.getDate() + 15);

                const confirmed = confirm(
                    `⚠️ ATENÇÃO: Downgrade Detectado\n\n` +
                    `Este ISP possui ${vpnUsed} VPN(s) ativa(s), mas o novo plano permite apenas ${newLimit}.\n\n` +
                    `O que acontecerá:\n` +
                    `• Período de graça de 15 dias (até ${downgradeDate.toLocaleDateString('pt-BR')})\n` +
                    `• Após este prazo, ${vpnUsed - newLimit} VPN(s) serão desativadas automaticamente\n` +
                    `• As VPNs mais antigas serão desativadas primeiro\n\n` +
                    `Deseja continuar com esta mudança de plano?`
                );

                if (!confirmed) {
                    return;
                }
            }
        }

        const result = await updateTenantAction(data);

        if (result.error) {
            toast.error(result.error);
            return;
        }

        toast.success("Configurações atualizadas!");
        queryClient.invalidateQueries({ queryKey: ["saas-tenants"] });
        onOpenChange(false);
    }

    async function handleCancelDowngrade() {
        if (!confirm(`Cancelar o downgrade agendado para ${tenant.name}?`)) return;

        setIsCancelingDowngrade(true);
        try {
            const { cancelScheduledDowngradeAction } = await import("@/modules/saas/actions/vpn-quota.actions");
            const result = await cancelScheduledDowngradeAction(tenant.id);

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Downgrade cancelado com sucesso!");
                queryClient.invalidateQueries({ queryKey: ["saas-tenants"] });
                onOpenChange(false);
            }
        } catch (error) {
            toast.error("Erro ao cancelar downgrade");
        } finally {
            setIsCancelingDowngrade(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl p-0">
                <DialogHeader className="p-8 bg-slate-900/50 border-b border-slate-800">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <Building2 className="h-6 w-6 text-blue-400" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-white">Editar Provedor</DialogTitle>
                    </div>
                    <p className="text-sm text-slate-400 font-medium">Atualize as configurações comerciais e financeiras do tenant.</p>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6 bg-slate-950">
                    {/* Downgrade Warning Banner */}
                    {hasScheduledDowngrade && downgradeDate && (
                        <div className="p-4 bg-orange-500/10 border-2 border-orange-500/30 rounded-xl flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                            <div className="flex-1 space-y-2">
                                <p className="text-sm font-bold text-orange-600">
                                    ⚠️ Downgrade Agendado
                                </p>
                                <p className="text-xs text-orange-600/80">
                                    Plano será alterado em {new Date(downgradeDate).toLocaleDateString('pt-BR')}.
                                    Limite de VPNs será reduzido para {downgradeTargetLimit}.
                                    {vpnUsed > downgradeTargetLimit && (
                                        <span className="block mt-1 font-semibold">
                                            {vpnUsed - downgradeTargetLimit} VPN(s) serão desativadas automaticamente.
                                        </span>
                                    )}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelDowngrade}
                                disabled={isCancelingDowngrade}
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-500/10"
                            >
                                {isCancelingDowngrade ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                            </Button>
                        </div>
                    )}

                    <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Server className="h-4 w-4 text-indigo-400" />
                                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400/80">Capacidade VPN</h4>
                            </div>
                            <span className="text-sm font-mono font-bold text-indigo-300">
                                {vpnUsed}/{vpnLimit + (tenant.extraVpns || 0)} Ativas
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="flex-1 bg-slate-900 rounded-full h-2 overflow-hidden">
                                <div
                                    className={`h-full transition-all ${vpnUsed >= (vpnLimit + (tenant.extraVpns || 0)) ? 'bg-red-500' :
                                            vpnUsed / (vpnLimit + (tenant.extraVpns || 0)) > 0.8 ? 'bg-orange-500' :
                                                'bg-indigo-500'
                                        }`}
                                    style={{ width: `${Math.min((vpnUsed / (vpnLimit + (tenant.extraVpns || 0))) * 100, 100)}%` }}
                                />
                            </div>
                            <div className="w-24 shrink-0">
                                <Label htmlFor="extraVpns" className="text-[10px] font-black uppercase text-indigo-400/60 block mb-1">Extras (SaaS)</Label>
                                <Input 
                                    id="extraVpns" 
                                    type="number" 
                                    {...form.register("extraVpns")} 
                                    className="h-10 text-xs bg-slate-900 border-indigo-500/20 text-indigo-300 font-bold rounded-lg text-center focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        {vpnUsed >= (vpnLimit + (tenant.extraVpns || 0)) && (
                            <p className="text-xs text-red-400 font-medium">
                                ⚠️ Limite atingido. Adicione capacidade extra ou faça upgrade do plano.
                            </p>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="h-4 w-4 text-blue-400" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-blue-400/80">Dados da Organização</h3>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-bold uppercase text-slate-300">Nome Fantasia</Label>
                            <Input id="name" {...form.register("name")} placeholder="Ex: NetFast Telecom" className="rounded-xl h-12 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500 transition-all" />
                        </div>
                    </div>

                    <div className="h-px bg-slate-800" />

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Coins className="h-4 w-4 text-blue-400" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-blue-400/80">Plano & Finanças</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-slate-300">Plano de Assinatura</Label>
                                <Select onValueChange={(value) => form.setValue("planId", value)} defaultValue={form.getValues("planId")}>
                                    <SelectTrigger className="rounded-xl h-12 bg-slate-900 border-slate-800 text-white focus:ring-blue-500 transition-all">
                                        <SelectValue placeholder="Selecione um plano comercial" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        {plans.map((plan) => (
                                            <SelectItem key={plan.id} value={plan.id} className="focus:bg-slate-800 focus:text-blue-400">
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{plan.name}</span>
                                                    <span className="text-[10px] text-slate-400">R$ {Number(plan.monthlyPrice).toFixed(2)} / mês</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="interestRate" className="text-xs font-bold uppercase flex items-center gap-1 text-slate-300">
                                        <Percent className="h-3 w-3" /> Juros/Dia
                                    </Label>
                                    <div className="relative">
                                        <Input id="interestRate" type="number" step="0.1" {...form.register("interestRate")} className="rounded-xl h-12 bg-slate-900 border-slate-800 text-white pr-8 focus:border-blue-500 transition-all" />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">%</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="penaltyAmount" className="text-xs font-bold uppercase flex items-center gap-1 text-slate-300">
                                        <Coins className="h-3 w-3" /> Multa Fixa
                                    </Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">R$</span>
                                        <Input id="penaltyAmount" type="number" step="0.5" {...form.register("penaltyAmount")} className="rounded-xl h-12 bg-slate-900 border-slate-800 text-white pl-8 focus:border-blue-500 transition-all" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gracePeriod" className="text-xs font-bold uppercase flex items-center gap-1 text-slate-300">
                                        <CalendarDays className="h-3 w-3" /> Carência
                                    </Label>
                                    <div className="relative">
                                        <Input id="gracePeriod" type="number" {...form.register("gracePeriod")} className="rounded-xl h-12 bg-slate-900 border-slate-800 text-white pr-10 focus:border-blue-500 transition-all" />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">dias</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-6 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input type="checkbox" {...form.register("autoBlock")} className="peer w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500/20 focus:ring-offset-0 transition-all" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 group-hover:text-blue-400 transition-colors uppercase select-none">Auto-Bloqueio</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input type="checkbox" {...form.register("autoUnblock")} className="peer w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500/20 focus:ring-offset-0 transition-all" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 group-hover:text-blue-400 transition-colors uppercase select-none">Auto-Desbloqueio</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-6 border-t border-slate-800 flex items-center justify-end gap-3">
                        <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="rounded-xl font-bold h-12 px-8 text-slate-400 hover:text-white hover:bg-slate-900 transition-all">Cancelar</Button>
                        <Button type="submit" disabled={isSubmitting} className="rounded-xl font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-900/40 h-12 px-10 border-0 transition-all active:scale-95">
                            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Salvar Alterações"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
