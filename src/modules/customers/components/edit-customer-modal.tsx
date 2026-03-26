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
import { UserCog, Loader2, Wifi, Upload, Download, KeyRound, Mail, Phone, CreditCard, User, MapPin, Search, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { updateCustomerAction } from "../actions/customer-actions"
import { getPlans } from "@/modules/financial/actions/plan.actions"
import { getTenantNasList } from "@/modules/network/actions/nas.actions"
import { toast } from "sonner"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"

const customerSchema = z.object({
    name: z.string().min(3, "Nome completo é obrigatório"),
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

interface EditCustomerModalProps {
    customer: {
        id: string
        name: string
        email: string
        phone: string
        radiusPassword: string
        zipCode?: string | null
        street?: string | null
        number?: string | null
        neighborhood?: string | null
        city?: string | null
        state?: string | null
        complement?: string | null
        plan?: {
            id: string
            name: string
            download: number
            upload: number
        } | null
        nasId?: number | null
    }
    trigger?: React.ReactNode
}

interface Plan {
    id: string;
    name: string;
    download: number;
    upload: number;
}

export function EditCustomerModal({ customer, trigger }: EditCustomerModalProps) {
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
    
    // Busca concentradores (NAS)
    const { data: nasList = [] } = useQuery({
        queryKey: ['nas-list'],
        queryFn: async () => {
            const result = await getTenantNasList();
            return result || [];
        },
        enabled: open
    });

    const form = useForm<z.infer<typeof customerSchema>>({
        resolver: zodResolver(customerSchema),
        defaultValues: {
            name: customer.name,
            phone: customer.phone || "",
            email: customer.email || "",
            planName: customer.plan?.name || "",
            downloadSpeed: customer.plan?.download || 0,
            uploadSpeed: customer.plan?.upload || 0,
            password: customer.radiusPassword || "",
            zipCode: customer.zipCode || "",
            street: customer.street || "",
            number: customer.number || "",
            neighborhood: customer.neighborhood || "",
            city: customer.city || "",
            state: customer.state || "",
            complement: customer.complement || "",
            nasId: customer.nasId || null as any,
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
                    
                    toast.success("Endereço atualizado!");
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
        const result = await updateCustomerAction({ id: customer.id, ...data });

        if (result.error) {
            toast.error(result.error);
            return;
        }

        toast.success("Assinante atualizado!", {
            description: "As alterações foram sincronizadas com o servidor."
        });

        queryClient.invalidateQueries({ queryKey: ["customers"] });
        queryClient.invalidateQueries({ queryKey: ["customer", customer.id] });
        
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline" size="sm">Editar Cadastro</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border border-border shadow-2xl bg-card rounded-3xl">
                <DialogHeader className="p-6 bg-muted/10 border-b border-border">
                    <div className="space-y-1">
                        <DialogTitle className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <UserCog className="h-5 w-5" />
                            </div>
                            Editar Assinante
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground font-medium">Modifique os dados cadastrais e o plano de acesso.</p>
                    </div>
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
                                    <Input id="name" {...form.register("name")} className="rounded-xl pl-9 bg-muted/5 border-border focus:bg-muted/10 transition-all h-10" />
                                </div>
                                {form.formState.errors.name && <p className="text-[10px] text-destructive font-bold">{form.formState.errors.name.message}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email" className="text-xs font-bold text-foreground">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input id="email" {...form.register("email")} className="rounded-xl pl-9 bg-muted/5 border-border focus:bg-muted/10 transition-all h-10 text-sm" />
                                    </div>
                                    {form.formState.errors.email && <p className="text-[10px] text-destructive font-bold">{form.formState.errors.email.message}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="phone" className="text-xs font-bold text-foreground">Telefone</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input id="phone" {...form.register("phone")} className="rounded-xl pl-9 bg-muted/5 border-border focus:bg-muted/10 transition-all h-10 font-mono text-sm" />
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
                            <Label htmlFor="plan" className="text-xs font-bold text-foreground">Plano de Acesso</Label>
                            <Select onValueChange={handlePlanChange} defaultValue={customer.plan?.name}>
                                <SelectTrigger className="rounded-xl bg-muted/5 h-11 focus:ring-primary/20">
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-2xl bg-muted/5 border border-border flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <Download className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Download</p>
                                    <p className="text-lg font-black text-foreground flex items-baseline gap-1">
                                        {form.watch('downloadSpeed')} <span className="text-xs font-medium text-muted-foreground">Mbps</span>
                                    </p>
                                </div>
                            </div>
                            <div className="p-3 rounded-2xl bg-muted/5 border border-border flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                    <Upload className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Upload</p>
                                    <p className="text-lg font-black text-foreground flex items-baseline gap-1">
                                        {form.watch('uploadSpeed')} <span className="text-xs font-medium text-muted-foreground">Mbps</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="nasId" className="text-xs font-bold text-foreground italic uppercase flex items-center gap-1.5 opacity-70">
                                    Concentrador (Opcional)
                                </Label>
                                <Select 
                                    onValueChange={(val) => form.setValue("nasId", val === "0" ? null : parseInt(val))}
                                    defaultValue={customer.nasId?.toString() || "0"}
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
                                <Label htmlFor="password" className="text-xs font-bold text-foreground">Senha Radius</Label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input id="password" type="password" {...form.register("password")} className="rounded-xl pl-9 bg-muted/5 border-border focus:bg-muted/10 transition-all h-10 text-sm" placeholder="••••••" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button variant="ghost" type="button" onClick={() => setOpen(false)} className="rounded-xl font-bold h-11 text-muted-foreground hover:bg-muted/10 transition-all">Cancelar</Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className={cn(
                                "rounded-xl font-bold h-11 min-w-[140px] transition-all",
                                isSubmitting ? "opacity-70" : "hover:scale-[1.02] shadow-lg shadow-primary/20"
                            )}
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserCog className="h-4 w-4 mr-2" />}
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
