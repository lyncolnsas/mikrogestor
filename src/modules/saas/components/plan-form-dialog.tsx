"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, Check, MessageCircle, Terminal, LifeBuoy, Server, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect } from "react";
import { updateSaasPlanAction, createSaasPlanAction } from "../actions/plan.actions";
import { SaasPlan } from "@prisma/client";
import { toast } from "sonner";

const formSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    monthlyPrice: z.coerce.number().min(0, "Preço inválido"),
    maxCustomers: z.coerce.number().int().min(1, "Deve permitir pelo menos 1 cliente"),
    vpnLimit: z.coerce.number().int().min(1, "Deve permitir pelo menos 1 VPN").default(1),
    showOnLanding: z.boolean().default(true),
    features: z.object({
        whatsapp: z.boolean().default(false),
        api_access: z.boolean().default(false),
        max_vpn_nodes: z.coerce.number().int().min(1).default(1),
        priority_support: z.boolean().default(false),
    }),
});

interface PlanFeatures {
    whatsapp?: boolean;
    api_access?: boolean;
    max_vpn_nodes?: number;
    priority_support?: boolean;
}

interface PlanFormDialogProps {
    children?: React.ReactNode;
    plan?: SaasPlan; // Optional plan for editing
}

export function PlanFormDialog({ children, plan }: PlanFormDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const isEditing = !!plan;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            monthlyPrice: 0,
            maxCustomers: 100,
            vpnLimit: 1,
            showOnLanding: true,
            features: {
                whatsapp: false,
                api_access: false,
                max_vpn_nodes: 1,
                priority_support: false,
            },
        },
    });

    // Reset form when plan changes or modal opens
    useEffect(() => {
        if (open) {
            if (plan) {
                const features = (plan.features as unknown) as PlanFeatures;
                form.reset({
                    name: plan.name,
                    monthlyPrice: Number(plan.monthlyPrice),
                    maxCustomers: plan.maxCustomers,
                    vpnLimit: (plan as any).vpnLimit ?? 1,
                    showOnLanding: (plan as SaasPlan & { showOnLanding?: boolean }).showOnLanding ?? true,
                    features: {
                        whatsapp: features?.whatsapp ?? false,
                        api_access: features?.api_access ?? false,
                        max_vpn_nodes: features?.max_vpn_nodes ?? 1,
                        priority_support: features?.priority_support ?? false,
                    },
                });
            } else {
                form.reset({
                    name: "",
                    monthlyPrice: 0,
                    maxCustomers: 100,
                    vpnLimit: 1,
                    showOnLanding: true,
                    features: {
                        whatsapp: false,
                        api_access: false,
                        max_vpn_nodes: 1,
                        priority_support: false,
                    },
                });
            }
        }
    }, [open, plan, form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            if (isEditing && plan) {
                await updateSaasPlanAction({ id: plan.id, ...values });
                toast.success("Plano atualizado com sucesso!");
            } else {
                await createSaasPlanAction(values);
                toast.success("Plano criado com sucesso!");
            }
            setOpen(false);
        } catch (error) {
            console.error("Erro ao salvar plano", error);
            toast.error("Erro ao salvar plano. Verifique os dados.");
        } finally {
            setIsLoading(false);
        }
    }

    // Watch values for Real-time Preview
    const watchedValues = form.watch();

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button className="rounded-full font-bold px-8 h-12 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95 group">
                        <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-500" />
                        Novo Plano
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[1100px] p-0 overflow-hidden border border-slate-800 rounded-3xl shadow-2xl bg-slate-950">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                <div className="flex flex-col lg:flex-row h-full max-h-[90vh]">
                    {/* Left Column: Form */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-8 pb-0">
                            <DialogHeader>
                                <DialogTitle className="text-3xl font-black text-white tracking-tight">
                                    {isEditing ? "Editar Plano" : "Novo Modelo"}
                                </DialogTitle>
                                <DialogDescription className="text-slate-400 text-lg">
                                    {isEditing ? "Ajuste os detalhes do plano." : "Configure um novo nível de assinatura."}
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-8">

                                {/* Seção Principal */}
                                <div className="grid grid-cols-1 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-300 font-bold ml-1">Nome do Plano</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Ex: Enterprise Gold"
                                                        className="pl-4 h-14 bg-slate-900 border-slate-800 hover:border-indigo-500 focus:border-indigo-500 rounded-2xl transition-all font-medium text-lg text-white placeholder:text-slate-600"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="monthlyPrice"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-300 font-bold ml-1">Preço (R$)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            placeholder="0.00"
                                                            className="h-14 bg-slate-900 border-slate-800 hover:border-green-500 focus:border-green-500 rounded-2xl transition-all font-bold text-lg text-white"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="maxCustomers"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-300 font-bold ml-1">Clientes</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            placeholder="100"
                                                            className="h-14 bg-slate-900 border-slate-800 hover:border-blue-500 focus:border-blue-500 rounded-2xl transition-all font-medium text-lg text-white"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* VPN Limit Field */}
                                    <FormField
                                        control={form.control}
                                        name="vpnLimit"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-300 font-bold ml-1 flex items-center gap-2">
                                                    <Server className="h-4 w-4 text-indigo-400" />
                                                    Limite de VPNs Ativas
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        placeholder="1"
                                                        className="h-14 bg-slate-900 border-slate-800 hover:border-indigo-500 focus:border-indigo-500 rounded-2xl transition-all font-medium text-lg text-white"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <p className="text-xs text-slate-500 ml-1 mt-1">
                                                    Quantas VPNs simultâneas o ISP pode ter ativas
                                                </p>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Funcionalidades (Grid Compacto) */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                                        <Zap className="w-4 h-4 text-indigo-400" />
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Funcionalidades</h4>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {[
                                            { name: "features.whatsapp", label: "WhatsApp Integrado", desc: "Bot automático", icon: MessageCircle, color: "green" },
                                            { name: "features.api_access", label: "API Completa", desc: "Acesso externo", icon: Terminal, color: "blue" },
                                            { name: "features.priority_support", label: "Suporte VIP", desc: "Atendimento rápido", icon: LifeBuoy, color: "amber" },
                                        ].map((feat) => (
                                            <FormField
                                                key={feat.name}
                                                control={form.control}
                                                name={feat.name as any}
                                                render={({ field }) => (
                                                    <FormItem
                                                        className={`
                                                            relative flex items-center p-3 rounded-xl border transition-all cursor-pointer group
                                                            ${field.value
                                                                ? `bg-${feat.color}-500/10 border-${feat.color}-500/50 shadow-sm`
                                                                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900'}
                                                        `}
                                                        onClick={() => field.onChange(!field.value)}
                                                    >
                                                        <div className={`
                                                            mr-3 p-2 rounded-lg transition-colors
                                                            ${field.value ? `bg-${feat.color}-500 text-white` : 'bg-slate-800 text-slate-500'}
                                                        `}>
                                                            <feat.icon className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <FormLabel className={`text-sm font-bold cursor-pointer block ${field.value ? `text-white` : 'text-slate-400'}`}>
                                                                {feat.label}
                                                            </FormLabel>
                                                            <p className="text-[10px] text-slate-500">{feat.desc}</p>
                                                        </div>
                                                        <div className={`
                                                            w-4 h-4 rounded-full border flex items-center justify-center
                                                            ${field.value ? `border-${feat.color}-500 bg-${feat.color}-500` : 'border-slate-700'}
                                                        `}>
                                                            {field.value && <Check className="w-2.5 h-2.5 text-white" />}
                                                        </div>
                                                    </FormItem>
                                                )}
                                            />
                                        ))}

                                        {/* VPN Nodes Config */}
                                        <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-slate-800 text-slate-400">
                                                    <Server className="w-4 h-4" />
                                                </div>
                                                <label className="text-sm font-bold text-slate-300">
                                                    Nós VPN
                                                </label>
                                            </div>
                                            <FormField
                                                control={form.control}
                                                name="features.max_vpn_nodes"
                                                render={({ field }) => (
                                                    <Input
                                                        type="number"
                                                        className="h-8 w-16 bg-slate-800 border-slate-700 focus:border-indigo-500 rounded text-center font-bold text-xs text-white"
                                                        {...field}
                                                    />
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Visibilidade */}
                                <FormField
                                    control={form.control}
                                    name="showOnLanding"
                                    render={({ field }) => (
                                        <div className="flex items-center justify-between py-2 border-t border-slate-800 mt-4 pt-4">
                                            <FormLabel className="flex items-center gap-2 text-sm font-medium text-slate-400">
                                                Exibir na Landing Page
                                            </FormLabel>
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    className="data-[state=checked]:bg-indigo-600 border-slate-700"
                                                />
                                            </FormControl>
                                        </div>
                                    )}
                                />

                                <DialogFooter className="gap-2 pt-2 border-t border-slate-800 mt-4">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setOpen(false)}
                                        className="h-12 rounded-xl text-slate-400 font-bold hover:bg-slate-900 hover:text-white"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="h-12 px-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-xl shadow-indigo-900/40 border-0"
                                    >
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                        Salvar Modelo
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </div>

                    {/* Right Column: Preview */}
                    <div className="hidden lg:flex flex-col bg-slate-900/30 border-l border-slate-800/50 w-[450px] relative overflow-hidden backdrop-blur-xl">
                        <div className="absolute inset-0 bg-grid-white/[0.02] [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />

                        <div className="relative z-10 p-8 flex flex-col items-center justify-center h-full">
                            <div className="mb-6 text-center">
                                <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-1">
                                    Preview em Tempo Real
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Exatamente como seu cliente verá.
                                </p>
                            </div>

                            {/* PREVIEW CARD */}
                            <PlanPreviewCard values={watchedValues} />
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog >
    );
}

// Visual Component for Preview
function PlanPreviewCard({ values }: { values: any }) {
    // Defaults to prevent crash if undefined
    const name = values.name || "Nome do Plano";
    const price = values.monthlyPrice || 0;
    const customers = values.maxCustomers || 100;
    const vpnLimit = values.vpnLimit || 1;
    const whatsapp = values.features?.whatsapp;
    const api = values.features?.api_access;
    const support = values.features?.priority_support;
    const vpn = values.features?.max_vpn_nodes || 1;
    const isVisible = values.showOnLanding !== false;

    if (!isVisible) {
        return (
            <div className="w-full max-w-sm h-[400px] border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/50">
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mb-4">
                    <span className="text-2xl">👻</span>
                </div>
                <p className="font-bold">Modo Invisível</p>
                <p className="text-xs mt-2">Este plano não aparecerá na vitrine pública.</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl shadow-indigo-500/10 border border-slate-100 overflow-hidden relative transition-all duration-300 hover:-translate-y-1">
            {/* Header Background */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-indigo-600 to-purple-700 opacity-10" />

            <div className="p-8 relative">
                {/* Badge de Destaque (Simulação) */}
                {price > 99 && (
                    <span className="absolute top-6 right-6 px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                        Recomendado
                    </span>
                )}

                <h3 className="text-2xl font-black text-slate-900 mb-1">{name}</h3>
                <p className="text-slate-500 text-sm font-medium mb-6">Ideal para escalar sua operação.</p>

                <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-sm font-bold text-slate-400">R$</span>
                    <span className="text-5xl font-black text-slate-900 tracking-tighter">
                        {price.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </span>
                    <span className="text-slate-400 font-bold">/mês</span>
                </div>

                <div className="space-y-3">
                    <FeatureRow label={`Até ${customers} Clientes`} included={true} highlight={true} />
                    {[
                        "Gestão completa de clientes",
                        "Controle financeiro",
                        "Suporte técnico",
                        "Integração com Mikrotik",
                        "Área do cliente",
                        "Relatórios",
                        "Integração com bancos",
                        "Personalizações",
                        "Treinamento incluído"
                    ].map((feat) => (
                        <FeatureRow key={feat} label={feat} included={true} />
                    ))}
                    <FeatureRow label={`${vpnLimit} VPN${vpnLimit > 1 ? 's' : ''} Ativa${vpnLimit > 1 ? 's' : ''}`} included={true} />
                </div>

                <div className="mt-8">
                    <button className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold text-sm shadow-xl shadow-slate-200 hover:bg-black transition-all">
                        Começar Agora
                    </button>
                    <p className="text-center text-[10px] text-slate-400 mt-3">
                        7 dias de garantia incondicional
                    </p>
                </div>
            </div>
        </div>
    );
}

function FeatureRow({ label, included, highlight }: { label: string, included: boolean, highlight?: boolean }) {
    return (
        <div className={`flex items-center gap-3 ${!included ? 'opacity-40 grayscale' : ''}`}>
            <div className={`
                w-5 h-5 rounded-full flex items-center justify-center shrink-0
                ${included ? (highlight ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-600') : 'bg-slate-100 text-slate-400'}
            `}>
                <Check className="w-3 h-3" />
            </div>
            <span className={`text-sm font-medium ${highlight ? 'text-amber-700 font-bold' : 'text-slate-600'}`}>
                {label}
            </span>
        </div>
    );
}

