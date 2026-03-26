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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, Loader2, Wifi, Upload, Download, KeyRound, Mail, Phone, CreditCard, User, MapPin, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { createCustomerAction } from "../actions/customer-actions"
import { getPlans } from "@/modules/financial/actions/plan.actions"
import { getTenantNasList } from "@/modules/network/actions/nas.actions"
import { getIspSubscriptionAction } from "@/app/(isp-panel)/overview/dashboard-actions"
import { toast } from "sonner"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { validateCpf } from "@/lib/generators"

const customerSchema = z.object({
    name: z.string().min(3, "Nome completo é obrigatório"),
    cpfCnpj: z.string().optional().refine((val) => {
        if (!val || val.trim() === "") return true;
        const clean = val.replace(/\D/g, "");
        if (clean.length !== 11) return false;
        return validateCpf(clean);
    }, "CPF inválido"),
    phone: z.string().min(10, "Telefone é obrigatório (mínimo 10 dígitos)"),
    email: z.string().optional().or(z.literal("")).or(z.null()),
    planName: z.string().min(1, "O plano é obrigatório"),
    downloadSpeed: z.number().positive(),
    uploadSpeed: z.number().positive(),
    password: z.string().optional().or(z.literal("")).or(z.null()),
    // Address fields
    zipCode: z.string().optional().or(z.literal("")).or(z.null()),
    street: z.string().optional().or(z.literal("")).or(z.null()),
    number: z.string().optional().or(z.literal("")).or(z.null()),
    neighborhood: z.string().optional().or(z.literal("")).or(z.null()),
    city: z.string().optional().or(z.literal("")).or(z.null()),
    state: z.string().optional().or(z.literal("")).or(z.null()),
    complement: z.string().optional().or(z.literal("")).or(z.null()),
    nasId: z.coerce.number().optional().or(z.null()),
});

interface CreateCustomerModalProps {
    trigger?: React.ReactNode;
    onSuccess?: () => void;
}

interface Plan {
    id: string;
    name: string;
    download: number;
    upload: number;
}

export function CreateCustomerModal({ trigger, onSuccess }: CreateCustomerModalProps) {
    const [open, setOpen] = React.useState(false)
    const [isFetchingCep, setIsFetchingCep] = React.useState(false)
    const queryClient = useQueryClient()

    // Busca planos para seleção
    const { data: plans = [] } = useQuery<Plan[]>({
        queryKey: ['plans'],
        queryFn: async () => {
            const result = await getPlans();
            return Array.isArray(result) ? result as Plan[] : [];
        }
    });

    // Busca informações da assinatura para verificar limites
    const { data: subscription } = useQuery({
        queryKey: ['isp-subscription'],
        queryFn: () => getIspSubscriptionAction(),
        enabled: open
    });

    // Busca concentradores (NAS)
    const { data: nasList = [] } = useQuery({
        queryKey: ['nas-list'],
        queryFn: async () => {
            const result = await getTenantNasList();
            return result || [];
        },
        enabled: open
    });

    const isLimitReached = subscription && subscription.usedCustomers >= subscription.maxCustomers;

    const form = useForm<z.infer<typeof customerSchema>>({
        resolver: zodResolver(customerSchema),
        defaultValues: {
            name: "",
            cpfCnpj: "",
            phone: "",
            email: "",
            planName: "",
            downloadSpeed: 0,
            uploadSpeed: 0,
            password: "",
            zipCode: "",
            street: "",
            number: "",
            neighborhood: "",
            city: "",
            state: "",
            complement: "",
            nasId: null as any,
        }
    })

    const { isSubmitting } = form.formState

    // Função para buscar CEP
    const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cep = e.target.value.replace(/\D/g, "");
        if (cep.length === 8) {
            setIsFetchingCep(true);
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await response.json();
                
                if (!data.erro) {
                    form.setValue("street", data.logradouro);
                    form.setValue("neighborhood", data.bairro);
                    form.setValue("city", data.localidade);
                    form.setValue("state", data.uf);
                    form.setValue("complement", data.complemento);
                    
                    toast.success("Endereço localizado!");
                } else {
                    toast.error("CEP não encontrado.");
                }
            } catch (error) {
                toast.error("Erro ao buscar CEP.");
            } finally {
                setIsFetchingCep(false);
            }
        }
    }

    // Atualiza velocidades quando o plano muda
    const handlePlanChange = (planName: string) => {
        const selectedPlan = plans.find(p => p.name === planName);
        if (selectedPlan) {
            form.setValue("planName", planName);
            form.setValue("downloadSpeed", selectedPlan.download);
            form.setValue("uploadSpeed", selectedPlan.upload);
        }
    }

    async function onSubmit(data: z.infer<typeof customerSchema>) {
        const result = await createCustomerAction(data);

        if (result.error) {
            toast.error(result.error);
            return;
        }

        toast.success("Assinante criado!", {
            description: "Acesso Radius provisionado com sucesso."
        });

        queryClient.invalidateQueries({ queryKey: ["customers"] });
        if (onSuccess) {
            onSuccess();
        }
        setOpen(false);
        form.reset();
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]">
                        <UserPlus className="h-4 w-4" /> Novo Assinante
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border border-border shadow-2xl bg-card rounded-3xl">
                <DialogHeader className="p-6 bg-muted/10 border-b border-border">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <DialogTitle className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                    <UserPlus className="h-5 w-5" />
                                </div>
                                Novo Assinante
                            </DialogTitle>
                            <p className="text-sm text-muted-foreground font-medium">Cadastre o cliente e provisione o acesso.</p>
                        </div>
                        {subscription && (
                            <Badge variant="outline" className="flex flex-col items-end gap-0.5 py-1.5 px-3 bg-muted/20 border-border">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Plano</span>
                                <span className="text-xs font-black text-foreground">
                                    {subscription.usedCustomers} / {subscription.maxCustomers}
                                </span>
                            </Badge>
                        )}
                    </div>

                    {isLimitReached && (
                        <div className="mt-4 flex items-center gap-3 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 dark:bg-rose-900/20 dark:border-rose-900/30">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <p className="text-xs font-semibold">Limite de assinantes atingido. Faça upgrade para continuar.</p>
                        </div>
                    )}
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                    {/* Seção de Dados Pessoais */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground/60 flex items-center gap-2">
                            <User className="h-3 w-3" /> Dados Pessoais
                        </h4>
                        <div className="grid gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-xs font-bold text-foreground">Nome Completo</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input id="name" {...form.register("name")} className="rounded-xl pl-9 bg-muted/5 border-border focus:bg-muted/10 transition-all h-10" placeholder="Ex: João da Silva" />
                                </div>
                                {form.formState.errors.name && <p className="text-[10px] text-destructive font-bold">{form.formState.errors.name.message}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="cpfCnpj" className={cn("text-xs font-bold", form.formState.errors.cpfCnpj ? "text-destructive" : "text-foreground")}>CPF / CNPJ (Opcional)</Label>
                                    <div className="relative">
                                        <CreditCard className={cn("absolute left-3 top-2.5 h-4 w-4", form.formState.errors.cpfCnpj ? "text-destructive" : "text-muted-foreground")} />
                                        <Input
                                            id="cpfCnpj"
                                            {...form.register("cpfCnpj")}
                                            className={cn(
                                                "rounded-xl pl-9 bg-muted/5 focus:bg-muted/10 transition-all h-10 font-mono text-sm",
                                                form.formState.errors.cpfCnpj ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border"
                                            )}
                                            placeholder="000.000.000-00"
                                        />
                                    </div>
                                    {form.formState.errors.cpfCnpj && <p className="text-[10px] text-destructive font-bold flex items-center gap-1"><AlertCircle className="h-3 w-3" />{form.formState.errors.cpfCnpj.message}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="phone" className="text-xs font-bold text-foreground">Telefone</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input id="phone" {...form.register("phone")} className="rounded-xl pl-9 bg-muted/5 border-border focus:bg-muted/10 transition-all h-10 font-mono text-sm" placeholder="(00) 00000-0000" />
                                    </div>
                                    {form.formState.errors.phone && <p className="text-[10px] text-destructive font-bold">{form.formState.errors.phone.message}</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 dark:bg-slate-800" />

                    {/* Seção de Endereço */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground/60 flex items-center gap-2">
                            <MapPin className="h-3 w-3" /> Endereço do Assinante
                        </h4>
                        
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-4 grid gap-2">
                                <Label htmlFor="zipCode" className="text-xs font-bold text-foreground">CEP</Label>
                                <div className="relative">
                                    <Search className={cn("absolute left-3 top-2.5 h-4 w-4", isFetchingCep ? "animate-pulse text-primary" : "text-muted-foreground")} />
                                    <Input 
                                        id="zipCode" 
                                        {...form.register("zipCode")} 
                                        onBlur={handleCepBlur}
                                        className="rounded-xl pl-9 bg-muted/5 border-border focus:bg-muted/10 transition-all h-10 font-mono text-sm" 
                                        placeholder="00000-000" 
                                    />
                                    {isFetchingCep && (
                                        <div className="absolute right-3 top-2.5">
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="col-span-8 grid gap-2">
                                <Label htmlFor="street" className="text-xs font-bold text-foreground">Rua / Logradouro</Label>
                                <Input id="street" {...form.register("street")} className="rounded-xl bg-muted/5 border-border focus:bg-muted/10 transition-all h-10" placeholder="Nome da rua..." />
                            </div>

                            <div className="col-span-3 grid gap-2">
                                <Label htmlFor="number" className="text-xs font-bold text-foreground">Número</Label>
                                <Input id="number" {...form.register("number")} className="rounded-xl bg-muted/5 border-border focus:bg-muted/10 transition-all h-10" placeholder="123" />
                            </div>

                            <div className="col-span-5 grid gap-2">
                                <Label htmlFor="neighborhood" className="text-xs font-bold text-foreground">Bairro</Label>
                                <Input id="neighborhood" {...form.register("neighborhood")} className="rounded-xl bg-muted/5 border-border focus:bg-muted/10 transition-all h-10" placeholder="Bairro..." />
                            </div>

                            <div className="col-span-4 grid gap-2">
                                <Label htmlFor="complement" className="text-xs font-bold text-foreground">Complemento</Label>
                                <Input id="complement" {...form.register("complement")} className="rounded-xl bg-muted/5 border-border focus:bg-muted/10 transition-all h-10" placeholder="Apto, Bloco..." />
                            </div>

                            <div className="col-span-8 grid gap-2">
                                <Label htmlFor="city" className="text-xs font-bold text-foreground">Cidade</Label>
                                <Input id="city" {...form.register("city")} className="rounded-xl bg-muted/5 border-border focus:bg-muted/10 transition-all h-10" placeholder="Cidade..." />
                            </div>

                            <div className="col-span-4 grid gap-2">
                                <Label htmlFor="state" className="text-xs font-bold text-foreground">UF</Label>
                                <Input id="state" {...form.register("state")} maxLength={2} className="rounded-xl bg-muted/5 border-border focus:bg-muted/10 transition-all h-10 uppercase text-center font-bold" placeholder="SP" />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 dark:bg-slate-800" />

                    {/* Seção de Acesso & Plano */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground/60 flex items-center gap-2">
                            <Wifi className="h-3 w-3" /> Acesso & Plano
                        </h4>

                        <div className="grid gap-2">
                            <Label htmlFor="plan" className={cn("text-xs font-bold", form.formState.errors.planName ? "text-destructive" : "text-foreground")}>Plano de Acesso *</Label>
                            <Select onValueChange={handlePlanChange}>
                                <SelectTrigger className={cn(
                                    "rounded-xl bg-muted/5 h-11 focus:ring-primary/20",
                                    form.formState.errors.planName ? "border-destructive focus:border-destructive" : "border-border"
                                )}>
                                    <SelectValue placeholder="Selecione um plano..." />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    {plans.map((plan) => (
                                        <SelectItem key={plan.id} value={plan.name} className="focus:bg-primary/10">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center">
                                                    <Wifi className="h-3 w-3" />
                                                </div>
                                                <span className="font-bold text-foreground">{plan.name}</span>
                                                <Badge variant="secondary" className="text-[10px] h-5 bg-muted/50 border-none">{plan.download}M</Badge>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.planName && <p className="text-[10px] text-destructive font-bold flex items-center gap-1"><AlertCircle className="h-3 w-3" />{form.formState.errors.planName.message}</p>}
                        </div>

                        {/* Indicadores de Velocidade */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-2xl bg-muted/5 border border-border flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <Download className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Download</p>
                                    <p className="text-lg font-black text-foreground flex items-baseline gap-1">
                                        {form.watch('downloadSpeed') || 0} <span className="text-xs font-medium text-muted-foreground">Mbps</span>
                                    </p>
                                </div>
                            </div>
                            <div className="p-3 rounded-2xl bg-muted/5 border border-border flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                    <Upload className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Upload</p>
                                    <p className="text-lg font-black text-foreground flex items-baseline gap-1">
                                        {form.watch('uploadSpeed') || 0} <span className="text-xs font-medium text-muted-foreground">Mbps</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-xs font-bold text-foreground">Email (Opcional)</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input id="email" {...form.register("email")} className="rounded-xl pl-9 bg-muted/5 border-border focus:bg-muted/10 transition-all h-10 text-sm" placeholder="cliente@email.com" />
                                </div>
                                {form.formState.errors.email && <p className="text-[10px] text-destructive font-bold">{form.formState.errors.email.message}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="nasId" className="text-xs font-bold text-foreground italic uppercase flex items-center gap-1.5 opacity-70">
                                    Concentrador (Opcional)
                                </Label>
                                <Select 
                                    onValueChange={(val) => form.setValue("nasId", val === "0" ? null : parseInt(val))}
                                    defaultValue="0"
                                >
                                    <SelectTrigger className="rounded-xl bg-muted/5 h-10 border-border">
                                        <SelectValue placeholder="Qualquer Concentrador" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">Qualquer Concentrador</SelectItem>
                                        {nasList.map((nas: any) => (
                                            <SelectItem key={nas.id} value={nas.id.toString()}>
                                                {nas.shortname} ({nas.nasname})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password" className="text-xs font-bold text-foreground">Senha Radius (Opcional)</Label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input id="password" type="password" {...form.register("password")} className="rounded-xl pl-9 bg-muted/5 border-border focus:bg-muted/10 transition-all h-10 text-sm" placeholder="••••••" />
                                </div>
                                {form.formState.errors.password && <p className="text-[10px] text-destructive font-bold">{form.formState.errors.password.message}</p>}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button variant="ghost" type="button" onClick={() => setOpen(false)} className="rounded-xl font-bold h-11 text-muted-foreground hover:bg-muted/10 hover:text-foreground transition-all">Cancelar</Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || isLimitReached}
                            className={cn(
                                "rounded-xl font-bold h-11 min-w-[140px] transition-all",
                                isSubmitting ? "opacity-70" : "hover:scale-[1.02] shadow-lg shadow-primary/20"
                            )}
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                            Concluir Cadastro
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
