"use client"

import * as React from "react"
import Link from "next/link"
import { useActionState } from "react"
import { registerUser } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ShieldCheck, Mail, Lock, Building2, Check } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface Plan {
    id: string;
    name: string;
    monthlyPrice: string | number | { toString(): string };
}

interface RegisterState {
    error?: {
        name?: string[];
        email?: string[];
        password?: string[];
        confirmPassword?: string[];
        slug?: string[];
        planId?: string[];
        _form?: string[];
    };
}

export function RegisterFormInner({ plans, initialPlanId, onSuccess }: { plans: Plan[], initialPlanId?: string, onSuccess?: () => void }) {
    const [state, action, isPending] = useActionState(
        registerUser as (prevState: RegisterState | null, formData: FormData) => Promise<RegisterState | null>,
        null
    );

    const [selectedPlanId, setSelectedPlanId] = React.useState(initialPlanId || "");
    const [name, setName] = React.useState("");
    const [slug, setSlug] = React.useState("");

    // Auto-generate slug from name
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setName(value);

        const slugified = value
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
        setSlug(slugified);
    };

    return (
        <form action={action} className="space-y-6">
            {/* Plan Selection */}
            <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5" /> Seu Plano de Escolha
                </Label>

                <input type="hidden" name="planId" value={selectedPlanId} />

                <Select
                    value={selectedPlanId}
                    onValueChange={setSelectedPlanId}
                >
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border-none px-4 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all">
                        <SelectValue placeholder="Selecione um plano..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                        {plans.map((plan) => (
                            <SelectItem
                                key={plan.id}
                                value={plan.id}
                                className="rounded-xl focus:bg-blue-50 dark:focus:bg-blue-500/10 focus:text-blue-600 dark:focus:text-blue-400 py-3"
                            >
                                <div className="flex flex-col text-left">
                                    <span className="font-bold">{plan.name}</span>
                                    <span className="text-xs opacity-60">R$ {Number(plan.monthlyPrice).toFixed(2)} /mês</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {state?.error?.planId && (
                    <p className="text-xs font-bold text-red-500 animate-in fade-in slide-in-from-top-1">{state.error.planId[0]}</p>
                )}
                {selectedPlanId && plans.find(p => p.id === selectedPlanId) && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400 text-xs font-bold animate-in zoom-in-95">
                        <Check className="h-3 w-3" /> {plans.find(p => p.id === selectedPlanId)?.name} selecionado.
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-slate-500">Nome do ISP / Empresa</Label>
                    <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            id="name"
                            name="name"
                            value={name}
                            onChange={handleNameChange}
                            placeholder="Ex: NetFast Telecom"
                            className="h-14 pl-11 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border-none font-bold placeholder:font-medium transition-all focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    {state?.error?.name && (
                        <p className="text-xs font-bold text-red-500">{state.error.name[0]}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="slug" className="text-xs font-black uppercase tracking-widest text-slate-500">Slug da URL</Label>
                    <div className="relative">
                        <Input
                            id="slug"
                            name="slug"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                            placeholder="ex: netfast-telecom"
                            className="h-14 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border-none font-bold placeholder:font-medium transition-all focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    {state?.error?.slug && (
                        <p className="text-xs font-bold text-red-500">{state.error.slug[0]}</p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="reg-email" className="text-xs font-black uppercase tracking-widest text-slate-500">Email Administrativo</Label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        id="reg-email"
                        name="email"
                        type="email"
                        placeholder="admin@provedor.com"
                        className="h-14 pl-11 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border-none font-bold placeholder:font-medium transition-all focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                {state?.error?.email && (
                    <p className="text-xs font-bold text-red-500">{state.error.email[0]}</p>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-xs font-black uppercase tracking-widest text-slate-500">Senha</Label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            id="reg-password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            className="h-14 pl-11 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border-none font-bold transition-all focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    {state?.error?.password && (
                        <p className="text-xs font-bold text-red-500">{state.error.password[0]}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="reg-confirm-password" className="text-xs font-black uppercase tracking-widest text-slate-500">Confirmar Senha</Label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            id="reg-confirm-password"
                            name="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            className="h-14 pl-11 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border-none font-bold transition-all focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    {state?.error?.confirmPassword && (
                        <p className="text-xs font-bold text-red-500">{state.error.confirmPassword[0]}</p>
                    )}
                </div>
            </div>

            {state?.error?._form && (
                <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-bold text-center">
                    {state.error._form[0]}
                </div>
            )}

            <Button
                className="w-full h-16 rounded-[1.25rem] bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70"
                disabled={isPending}
            >
                {isPending ? (
                    <div className="flex items-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Provisionando...</span>
                    </div>
                ) : (
                    "Ativar meu Provedor Agora"
                )}
            </Button>
        </form>
    );
}
