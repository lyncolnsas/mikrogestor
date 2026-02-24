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
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Loader2, Building2, ShieldCheck, Server } from "lucide-react"
import { provisionTenantAction } from "../actions/saas-actions"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Coins, Percent, CalendarDays } from "lucide-react"

interface Plan {
    id: string;
    name: string;
    monthlyPrice: string | number | { toString(): string };
}

interface VpnServer {
    id: string;
    name: string;
    capacityLimit: number;
    _count: { tunnels: number };
}

const tenantSchema = z.object({
    name: z.string().min(3, "Nome do Provedor é obrigatório"),
    slug: z.string().min(3, "Slug inválido").regex(/^[a-z0-9-]+$/, "Slug deve ser minúsculo e sem espaços"),
    adminEmail: z.string().email("Email inválido"),
    adminPassword: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
    planId: z.string().optional(),
    vpnServerId: z.string().optional(),
    interestRate: z.coerce.number().min(0, "Mínimo 0%"),
    penaltyAmount: z.coerce.number().min(0, "Mínimo R$ 0"),
    gracePeriod: z.coerce.number().int().min(0, "Mínimo 0 dias"),
    autoBlock: z.boolean().default(true),
    autoUnblock: z.boolean().default(true),
});

export function CreateTenantModal({ plans, servers }: { plans: Plan[], servers: VpnServer[] }) {
    const [open, setOpen] = React.useState(false)
    const queryClient = useQueryClient()

    const form = useForm<z.infer<typeof tenantSchema>>({
        resolver: zodResolver(tenantSchema),
        defaultValues: {
            name: "",
            slug: "",
            adminEmail: "",
            adminPassword: "",
            planId: "",
            vpnServerId: "",
            interestRate: 1.0,
            penaltyAmount: 10.0,
            gracePeriod: 5,
            autoBlock: true,
            autoUnblock: true,
        }
    })

    const { isSubmitting } = form.formState

    async function onSubmit(formData: z.infer<typeof tenantSchema>) {
        // Transform "none" back to undefined for the action
        const dataToSend = {
            ...formData,
            planId: formData.planId === "none" ? undefined : formData.planId
        };
        const result = await provisionTenantAction(dataToSend);

        if (result.error) {
            if (result.error === "SLUG_ALREADY_EXISTS") {
                form.setError("slug", { message: "Este slug já está em uso por outro provedor." });
                toast.error("Erro de validação: Slug em uso.");
                return;
            }
            if (result.error === "EMAIL_ALREADY_EXISTS") {
                form.setError("adminEmail", { message: "Este email já está cadastrado no sistema." });
                toast.error("Erro de validação: Email em uso.");
                return;
            }
            toast.error(result.error);
            return;
        }

        if (result.data?.vpnProvisioned === false) {
            toast.warning("ISP Criado sem VPN", {
                description: "O cliente foi criado, mas não havia servidores VPN ativos. Gere um túnel manualmente quando um servidor estiver disponível."
            });
        } else {
            toast.success("Tenant Provisionado!", {
                description: "O provedor já pode acessar o painel e configurar o Radius."
            });
        }

        queryClient.invalidateQueries({ queryKey: ["saas-tenants"] });
        queryClient.invalidateQueries({ queryKey: ["saas-metrics"] });
        setOpen(false);
        form.reset();
    }

    // Auto-generate slug from name
    React.useEffect(() => {
        const subscription = form.watch((value, { name }) => {
            if (name === 'name' && value.name) {
                const slugified = value.name
                    .toLowerCase()
                    .trim()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/[\s_-]+/g, '-')
                    .replace(/^-+|-+$/g, '');
                form.setValue('slug', slugified);
            }
        });
        return () => subscription.unsubscribe();
    }, [form]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 gap-2">
                    <Plus className="h-4 w-4" /> Provisionar Novo Tenant
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl p-0">
                <DialogHeader className="p-8 bg-slate-900/50 border-b border-slate-800">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <Building2 className="h-6 w-6 text-blue-400" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-white">Criar ISP</DialogTitle>
                    </div>
                    <p className="text-sm text-slate-400 font-medium whitespace-pre-wrap">Configure a nova instância isolada para o provedor parceiro.</p>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6 bg-slate-950 overflow-y-auto max-h-[80vh] custom-scrollbar">
                    {/* Tenant Details */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="h-4 w-4 text-blue-400" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-blue-400/80">Dados da Organização</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-xs font-bold uppercase text-slate-300">Nome Fantasia</Label>
                                <Input id="name" {...form.register("name")} placeholder="Ex: NetFast Telecom" className="rounded-xl h-12 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500 transition-all" />
                                {form.formState.errors.name && <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.name.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slug" className="text-xs font-bold uppercase text-slate-300">Slug da URL</Label>
                                <Input id="slug" {...form.register("slug")} placeholder="netfast-telecom" className="rounded-xl h-12 bg-slate-900 border-slate-800 font-mono text-blue-400 placeholder:text-slate-600 focus:border-blue-400 transition-all" />
                                {form.formState.errors.slug && <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.slug.message}</p>}
                            </div>
                        </div>

                        {/* Admin Credentials */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="adminEmail" className="text-xs font-bold uppercase text-slate-300">Email do Administrador</Label>
                                <Input id="adminEmail" type="email" {...form.register("adminEmail")} placeholder="admin@provedor.com" className="rounded-xl h-12 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500 transition-all" />
                                {form.formState.errors.adminEmail && <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.adminEmail.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="adminPassword" className="text-xs font-bold uppercase text-slate-300">Senha Padrão</Label>
                                <Input id="adminPassword" type="password" {...form.register("adminPassword")} placeholder="********" className="rounded-xl h-12 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500 transition-all" />
                                {form.formState.errors.adminPassword && <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.adminPassword.message}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-800" />

                    {/* Subscription & Finance */}
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
                                        <SelectItem value="none" className="focus:bg-slate-800 focus:text-blue-400 font-bold italic">
                                            Nenhum (Sem Plano)
                                        </SelectItem>
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
                                {form.formState.errors.planId && <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.planId.message}</p>}
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="interestRate" className="text-xs font-bold uppercase flex items-center gap-1 text-slate-300" title="Juros cobrados por dia de atraso">
                                        <Percent className="h-3 w-3" /> Juros/Dia
                                    </Label>
                                    <div className="relative">
                                        <Input id="interestRate" type="number" step="0.1" {...form.register("interestRate")} className="rounded-xl h-12 bg-slate-900 border-slate-800 text-white pr-8 focus:border-blue-500 transition-all" />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">%</span>
                                    </div>
                                    {form.formState.errors.interestRate && <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.interestRate.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="penaltyAmount" className="text-xs font-bold uppercase flex items-center gap-1 text-slate-300" title="Multa fixa por atraso">
                                        <Coins className="h-3 w-3" /> Multa Fixa
                                    </Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">R$</span>
                                        <Input id="penaltyAmount" type="number" step="0.5" {...form.register("penaltyAmount")} className="rounded-xl h-12 bg-slate-900 border-slate-800 text-white pl-8 focus:border-blue-500 transition-all" />
                                    </div>
                                    {form.formState.errors.penaltyAmount && <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.penaltyAmount.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gracePeriod" className="text-xs font-bold uppercase flex items-center gap-1 text-slate-300" title="Dias após o vencimento antes de bloquear">
                                        <CalendarDays className="h-3 w-3" /> Carência
                                    </Label>
                                    <div className="relative">
                                        <Input id="gracePeriod" type="number" {...form.register("gracePeriod")} className="rounded-xl h-12 bg-slate-900 border-slate-800 text-white pr-10 focus:border-blue-500 transition-all" />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">dias</span>
                                    </div>
                                    {form.formState.errors.gracePeriod && <p className="text-[10px] text-red-500 font-bold">{form.formState.errors.gracePeriod.message}</p>}
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

                    <div className="h-px bg-slate-800" />

                    {/* VPN Configuration */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Server className="h-4 w-4 text-blue-400" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-blue-400/80">Configuração VPN</h3>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-300">Servidor VPN</Label>
                            <Select onValueChange={(value) => form.setValue("vpnServerId", value === "auto" ? "" : value)} defaultValue="auto">
                                <SelectTrigger className="rounded-xl h-12 bg-slate-900 border-slate-800 text-white focus:ring-blue-500 transition-all">
                                    <SelectValue placeholder="Selecione o servidor VPN" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    <SelectItem value="auto" className="focus:bg-slate-800 focus:text-blue-400">
                                        <div className="flex flex-col">
                                            <span className="font-bold">🤖 Automático (Menor Carga)</span>
                                            <span className="text-[10px] text-slate-400">Sistema seleciona o servidor com menor uso</span>
                                        </div>
                                    </SelectItem>
                                    {servers.map((server) => {
                                        const currentLoad = server._count.tunnels;
                                        const loadPercent = ((currentLoad / server.capacityLimit) * 100).toFixed(1);
                                        const isNearCapacity = currentLoad >= server.capacityLimit * 0.8;
                                        const isFull = currentLoad >= server.capacityLimit;

                                        return (
                                            <SelectItem
                                                key={server.id}
                                                value={server.id}
                                                disabled={isFull}
                                                className="focus:bg-slate-800 focus:text-blue-400"
                                            >
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold">{server.name}</span>
                                                        {isFull && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">CHEIO</span>}
                                                        {isNearCapacity && !isFull && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">QUASE CHEIO</span>}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400">
                                                        {currentLoad} / {server.capacityLimit} túneis • {loadPercent}% de uso
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-slate-500 font-medium">💡 Deixe em "Automático" para o sistema escolher o servidor com menor carga</p>
                        </div>
                    </div>

                    <DialogFooter className="pt-6 border-t border-slate-800 flex items-center justify-end gap-3">
                        <Button variant="ghost" type="button" onClick={() => setOpen(false)} className="rounded-xl font-bold h-12 px-8 text-slate-400 hover:text-white hover:bg-slate-900 transition-all">Cancelar</Button>
                        <Button type="submit" disabled={isSubmitting} className="rounded-xl font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-900/40 h-12 px-10 gap-2 border-0 transition-all active:scale-95">
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Salvando...</span>
                                </>
                            ) : (
                                "Salvar & Criar ISP"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
