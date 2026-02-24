"use client"

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
    CircleDollarSign,
    Percent,
    Banknote,
    ShieldAlert,
    Save,
    Loader2,
    CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { NeonCard, NeonCardContent, NeonCardHeader, NeonCardTitle, NeonCardDescription } from "@/components/ui/neon-card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { getFinancialConfigAction, updateFinancialConfigAction } from "@/modules/financial/actions/billing.actions";
import { useEffect, useState } from "react";

// Helper for methods
const PAYMENT_METHODS = [
    { id: "PIX", label: "Pix", icon: "/icons/pix.svg" },
    { id: "BOLETO", label: "Boleto", icon: "/icons/boleto.svg" },
    { id: "CREDIT_CARD", label: "Cartão de Crédito", icon: "/icons/credit-card.svg" },
];

const gatewaySchema = z.object({
    enabled: z.boolean(),
    apiKey: z.string().optional(),
    webhookToken: z.string().optional(),
    token: z.string().optional(),
    accessToken: z.string().optional(),
    email: z.string().optional(),
    methods: z.array(z.string()).default([]),
});

const financialSettingsSchema = z.object({
    interestRate: z.number().min(0).max(10, "Taxa de juros máxima é 10%"),
    penaltyAmount: z.number().min(0, "Multa não pode ser negativa"),
    gracePeriod: z.number().min(0).max(30, "Prazo máximo de 30 dias"),
    autoBlock: z.boolean(),
    autoUnblock: z.boolean(),
    gatewayConfig: z.object({
        asaas: gatewaySchema.optional(),
        mercadopago: gatewaySchema.optional(),
        pagseguro: gatewaySchema.optional(),
    }).optional(),
});

type FinancialSettingsValues = z.infer<typeof financialSettingsSchema>;

export default function FinancialSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<FinancialSettingsValues>({
        resolver: zodResolver(financialSettingsSchema),
        defaultValues: {
            interestRate: 1,
            penaltyAmount: 5.00,
            gracePeriod: 5,
            autoBlock: true,
            autoUnblock: true,
            gatewayConfig: {
                asaas: { enabled: false, methods: [] },
                mercadopago: { enabled: false, methods: [] },
                pagseguro: { enabled: false, methods: [] },
            }
        },
    });

    useEffect(() => {
        async function loadConfig() {
            try {
                const res = await getFinancialConfigAction();
                if (res.data) {
                    // Safe mapping of incoming data
                    const config = res.data;
                    const gateways = (config.gatewayConfig as FinancialSettingsValues['gatewayConfig']) || {};

                    form.reset({
                        interestRate: config.interestRate,
                        penaltyAmount: config.penaltyAmount,
                        gracePeriod: config.gracePeriod,
                        autoBlock: config.autoBlock,
                        autoUnblock: config.autoUnblock,
                        gatewayConfig: {
                            asaas: { enabled: false, methods: [], ...gateways.asaas },
                            mercadopago: { enabled: false, methods: [], ...gateways.mercadopago },
                            pagseguro: { enabled: false, methods: [], ...gateways.pagseguro },
                        }
                    });
                }
            } catch (error) {
                console.error("Failed to load settings", error);
                toast.error("Erro ao carregar configurações");
            } finally {
                setIsLoading(false);
            }
        }
        loadConfig();
    }, [form]);

    const onSubmit = async (data: FinancialSettingsValues) => {
        setIsSaving(true);
        try {
            const res = await updateFinancialConfigAction(data);
            if (res.data) {
                toast.success("Configurações salvas!", {
                    description: "Regras financeiras e integrações atualizadas."
                });
            } else {
                toast.error("Erro ao salvar configurações");
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao processar requisição");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="px-8 py-6 flex items-center justify-between bg-card/50 backdrop-blur-xl border-b border-border sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_15px_-5px_var(--color-primary)]">
                        <CircleDollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-foreground uppercase tracking-tight italic">Regras Financeiras</h2>
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest opacity-70">Juros, Multas & Gateways de Pagamento</p>
                    </div>
                </div>
                <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving} variant="neon" className="gap-2 italic px-8 h-11 uppercase font-black tracking-tighter shadow-lg shadow-primary/20">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar Alterações
                </Button>
            </div>

            <form className="p-8 space-y-8 overflow-auto flex-1 max-w-5xl mx-auto w-full">
                {/* 1. Juros e Multas */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="rounded-lg h-8 w-8 p-0 flex items-center justify-center bg-primary/10 text-primary border-primary/20 font-black italic text-xs">01</Badge>
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground italic leading-none">Juros e Multas</h3>
                    </div>

                    <NeonCard className="border-border/50 bg-card/50" glow={false}>
                        <NeonCardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label htmlFor="interestRate" className="text-sm font-bold text-foreground">Juros Mensais (%)</Label>
                                <div className="relative group">
                                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="interestRate"
                                        type="number"
                                        step="0.1"
                                        className="pl-10 h-12 rounded-xl border-border bg-background focus:border-primary focus:ring-primary/20 transition-all font-mono text-lg"
                                        {...form.register("interestRate", { valueAsNumber: true })}
                                    />
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-tight">Valor cobrado proporcionalmente aos dias de atraso.</p>
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="penaltyAmount" className="text-sm font-bold text-foreground">Multa Fixa (R$)</Label>
                                <div className="relative group">
                                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="penaltyAmount"
                                        type="number"
                                        step="0.01"
                                        className="pl-10 h-12 rounded-xl border-border bg-background focus:border-primary focus:ring-primary/20 transition-all font-mono text-lg"
                                        {...form.register("penaltyAmount", { valueAsNumber: true })}
                                    />
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-tight">Valor único aplicado imediatamente após o vencimento.</p>
                            </div>
                        </NeonCardContent>
                    </NeonCard>
                </section>

                <Separator className="bg-border" />

                {/* 2. Automação de Bloqueio */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="rounded-lg h-8 w-8 p-0 flex items-center justify-center bg-primary/10 text-primary border-primary/20 font-black italic text-xs">02</Badge>
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground italic leading-none">Automação de Bloqueio</h3>
                    </div>

                    <NeonCard className="border-border/50 bg-card/50" glow={false}>
                        <NeonCardContent className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-foreground">Bloqueio Automático de Rede</p>
                                    <p className="text-xs text-muted-foreground">Suspender conexão do assinante após o prazo de carência.</p>
                                </div>
                                <Switch
                                    checked={form.watch("autoBlock")}
                                    onCheckedChange={(val: boolean) => form.setValue("autoBlock", val)}
                                    className="data-[state=checked]:bg-primary shadow-[0_0_15px_-5px_var(--color-primary)]"
                                />
                            </div>

                            <div className="flex items-center justify-between border-t border-border pt-6">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-foreground">Desbloqueio Automático (Baixa PIX)</p>
                                    <p className="text-xs text-muted-foreground">Reativar internet imediatamente após confirmação do pagamento.</p>
                                </div>
                                <Switch
                                    checked={form.watch("autoUnblock")}
                                    onCheckedChange={(val: boolean) => form.setValue("autoUnblock", val)}
                                    className="data-[state=checked]:bg-primary shadow-[0_0_15px_-5px_var(--color-primary)]"
                                />
                            </div>

                            <div className="space-y-3 pt-4">
                                <Label htmlFor="gracePeriod" className="text-sm font-bold flex items-center gap-2 text-foreground">
                                    <ShieldAlert className="h-4 w-4 text-amber-500" /> Prazo de Carência (Dias)
                                </Label>
                                <Input
                                    id="gracePeriod"
                                    type="number"
                                    className="h-12 rounded-xl border-border bg-background focus:border-amber-500 focus:ring-amber-500/20 max-w-[200px] font-mono text-lg"
                                    {...form.register("gracePeriod", { valueAsNumber: true })}
                                />
                                <p className="text-[11px] text-muted-foreground font-medium font-mono">Após {form.watch("gracePeriod")} dias de atraso, o cliente será bloqueado no Radius.</p>
                            </div>
                        </NeonCardContent>
                    </NeonCard>
                </section>

                <Separator className="bg-slate-200 dark:bg-slate-800" />

                {/* 3. Integrações de Pagamento */}
                <section className="space-y-8">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="rounded-lg h-8 w-8 p-0 flex items-center justify-center bg-primary/10 text-primary border-primary/20 font-black italic text-xs">03</Badge>
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground italic leading-none">Integrações de Pagamento</h3>
                    </div>

                    <div className="grid gap-6">
                        {/* Asaas */}
                        <IntegrationCard
                            title="Asaas"
                            description="Plataforma completa de gestão financeira."
                            logoUrl="/icons/asaas.png"
                            enabled={form.watch("gatewayConfig.asaas.enabled") || false}
                            onToggle={(val) => form.setValue("gatewayConfig.asaas.enabled", val)}
                        >
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">API Key</Label>
                                        <Input
                                            placeholder="$aact_..."
                                            className="h-11 font-mono text-sm bg-muted/20"
                                            type="password"
                                            {...form.register("gatewayConfig.asaas.apiKey")}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Webhook Token</Label>
                                        <Input
                                            placeholder="token_..."
                                            className="h-11 font-mono text-sm bg-muted/20"
                                            type="password"
                                            {...form.register("gatewayConfig.asaas.webhookToken")}
                                        />
                                    </div>
                                </div>
                                <PaymentMethodsSelect
                                    value={form.watch("gatewayConfig.asaas.methods") || []}
                                    onChange={(val) => form.setValue("gatewayConfig.asaas.methods", val)}
                                />
                            </div>
                        </IntegrationCard>

                        {/* Mercado Pago */}
                        <IntegrationCard
                            title="Mercado Pago"
                            description="Receba com a segurança do Mercado Livre."
                            logoUrl="/icons/mercadopago.svg"
                            enabled={form.watch("gatewayConfig.mercadopago.enabled") || false}
                            onToggle={(val) => form.setValue("gatewayConfig.mercadopago.enabled", val)}
                        >
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Access Token</Label>
                                    <Input
                                        placeholder="APP_USR-..."
                                        className="h-11 font-mono text-sm bg-muted/20"
                                        type="password"
                                        {...form.register("gatewayConfig.mercadopago.accessToken")}
                                    />
                                </div>
                                <PaymentMethodsSelect
                                    value={form.watch("gatewayConfig.mercadopago.methods") || []}
                                    onChange={(val) => form.setValue("gatewayConfig.mercadopago.methods", val)}
                                />
                            </div>
                        </IntegrationCard>

                        {/* PagSeguro */}
                        <IntegrationCard
                            title="PagBank / PagSeguro"
                            description="Soluções de pagamento do grupo UOL."
                            logoUrl="/icons/pagseguro.svg"
                            enabled={form.watch("gatewayConfig.pagseguro.enabled") || false}
                            onToggle={(val) => form.setValue("gatewayConfig.pagseguro.enabled", val)}
                        >
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Email</Label>
                                        <Input
                                            placeholder="seuemail@loja.com"
                                            className="h-11 bg-slate-50 dark:bg-slate-950"
                                            {...form.register("gatewayConfig.pagseguro.email")}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Token</Label>
                                        <Input
                                            placeholder="Ex: 948303..."
                                            className="h-11 font-mono text-sm bg-slate-50 dark:bg-slate-950"
                                            type="password"
                                            {...form.register("gatewayConfig.pagseguro.token")}
                                        />
                                    </div>
                                </div>
                                <PaymentMethodsSelect
                                    value={form.watch("gatewayConfig.pagseguro.methods") || []}
                                    onChange={(val) => form.setValue("gatewayConfig.pagseguro.methods", val)}
                                />
                            </div>
                        </IntegrationCard>
                    </div>
                </section>
            </form>
        </div>
    );
}

function IntegrationCard({
    title,
    description,
    logoUrl,
    children,
    enabled,
    onToggle
}: {
    title: string;
    description: string;
    logoUrl?: string;
    children: React.ReactNode;
    enabled: boolean;
    onToggle: (val: boolean) => void;
}) {
    return (
        <NeonCard
            variant={enabled ? "primary" : "default"}
            className={`transition-all duration-300 ${enabled ? 'bg-card' : 'bg-card/50 opacity-80 hover:opacity-100'}`}
            glow={enabled}
        >
            <NeonCardHeader className="p-6 pb-2">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-white shadow-[0_0_15px_-3px_rgba(255,255,255,0.3)] border border-white/20 flex items-center justify-center overflow-hidden p-2.5 transition-transform hover:scale-105">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {logoUrl ? (
                                <img src={logoUrl} alt={title} className="w-full h-full object-contain" />
                            ) : (
                                <CreditCard className="h-7 w-7 text-slate-400" />
                            )}
                        </div>
                        <div>
                            <NeonCardTitle className="text-base font-bold text-foreground flex items-center gap-2">{title}</NeonCardTitle>
                            <NeonCardDescription className="text-xs font-medium text-muted-foreground/70">{description}</NeonCardDescription>
                        </div>
                    </div>
                    <Switch
                        checked={enabled}
                        onCheckedChange={onToggle}
                        className="data-[state=checked]:bg-primary shadow-[0_0_15px_-5px_var(--color-primary)]"
                    />
                </div>
            </NeonCardHeader>
            {enabled && (
                <NeonCardContent className="p-6 pt-2 animate-in slide-in-from-top-2 duration-300">
                    <Separator className="my-4" />
                    {children}
                </NeonCardContent>
            )}
        </NeonCard>
    );
}

function PaymentMethodsSelect({ value, onChange }: { value: string[], onChange: (val: string[]) => void }) {
    const toggleMethod = (methodId: string, checked: boolean) => {
        if (checked) {
            onChange([...value, methodId]);
        } else {
            onChange(value.filter(m => m !== methodId));
        }
    };

    return (
        <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Métodos Permitidos</Label>
            <div className="flex flex-wrap gap-4">
                {PAYMENT_METHODS.map((method) => {
                    const isSelected = value.includes(method.id);
                    return (
                        <label
                            key={method.id}
                            className={`
                                cursor-pointer flex items-center gap-3 p-3 rounded-xl border transition-all select-none
                                ${isSelected
                                    ? 'bg-primary/10 border-primary text-primary shadow-[0_0_15px_-5px_var(--color-primary)]'
                                    : 'bg-background border-border text-muted-foreground hover:border-input hover:bg-muted/20'
                                }
                            `}
                        >
                            <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked: boolean | "indeterminate") => toggleMethod(method.id, checked as boolean)}
                                className="sr-only"
                            />
                            {/* Renderizar ícone do método */}
                            <div className={`w-6 h-6 flex items-center justify-center transition-opacity ${isSelected ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                                <img src={method.icon} alt={method.label} className="w-full h-full object-contain" />
                            </div>

                            <span className="text-sm font-black uppercase tracking-tight">{method.label}</span>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-primary ml-1 shadow-[0_0_8px_var(--color-primary)]" />}
                        </label>
                    )
                })}
            </div>
        </div>
    )
}
