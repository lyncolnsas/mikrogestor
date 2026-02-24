"use client"

import {
    ShieldCheck,
    Lock,
    Key,
    Save,
    Loader2,
    ShieldAlert,
    History,
    Smartphone,
    Layout as LayoutIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { NeonCard, NeonCardContent } from "@/components/ui/neon-card";
import { useState } from "react";

export default function SecuritySettingsPage() {
    const [isSaving] = useState(false);

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-700">
            {/* Header Sticky */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-xl sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_-5px_oklch(0.7_0.15_150)]">
                        <ShieldCheck className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-foreground uppercase tracking-tight italic">Segurança</h2>
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest opacity-70">Acesso & Privacidade da Conta</p>
                    </div>
                </div>
                <Button disabled={isSaving} variant="neon" className="gap-2 italic px-8 h-11 uppercase font-black tracking-tighter shadow-lg shadow-emerald-500/20 border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar Segurança
                </Button>
            </div>

            <div className="p-8 space-y-12 overflow-auto flex-1 max-w-5xl mx-auto w-full font-sans">
                {/* 1. Alterar Senha */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="rounded-lg h-8 w-8 p-0 flex items-center justify-center bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-black italic text-xs">01</Badge>
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground italic leading-none">Alterar Senha</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nova Senha</Label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-12 h-13 rounded-2xl bg-card border-border focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/50 transition-all font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Confirmar Nova Senha</Label>
                            <div className="relative group">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-12 h-13 rounded-2xl bg-card border-border focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/50 transition-all font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <Separator className="bg-border opacity-50" />

                {/* 2. 2FA */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="rounded-lg h-8 w-8 p-0 flex items-center justify-center bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-black italic text-xs">02</Badge>
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground italic leading-none">Proteção Adicional</h3>
                    </div>

                    <NeonCard className="bg-card group relative overflow-hidden border-emerald-500/10" variant="success">
                        <NeonCardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="flex items-start gap-6">
                                <div className="w-16 h-16 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                                    <ShieldAlert className="h-8 w-8 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-lg font-black text-foreground uppercase tracking-tight italic">Autenticação em Duas Etapas (2FA)</p>
                                    <p className="text-xs text-muted-foreground font-medium leading-relaxed max-w-xl">
                                        Adicione uma camada extra de segurança usando um aplicativo de autenticação como Google Authenticator ou Authy.
                                        Recomendado para prevenir acessos não autorizados.
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" className="rounded-xl font-black text-[11px] uppercase tracking-widest h-12 px-8 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500 italic shrink-0 transition-all shadow-lg hover:shadow-emerald-500/5">
                                Configurar 2FA
                            </Button>
                        </NeonCardContent>
                    </NeonCard>

                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border group hover:bg-muted/40 hover:shadow-sm transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center">
                                        <History className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">Login realizado</p>
                                        <p className="text-[11px] text-muted-foreground">Chrome no Windows • IP: 187.54.32.12</p>
                                    </div>
                                </div>
                                <span className="text-[11px] font-medium text-slate-400">há {i * 2} horas</span>
                            </div>
                        ))}
                    </div>
                </section>

                <Separator className="bg-border opacity-50" />

                {/* 3. Login History */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="rounded-lg h-8 w-8 p-0 flex items-center justify-center bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-black italic text-xs">03</Badge>
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground italic leading-none">Histórico de Acessos</h3>
                    </div>

                    <div className="bg-card border border-border rounded-3xl overflow-hidden divide-y divide-border/50">
                        <div className="p-5 flex items-center justify-between hover:bg-muted/5 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded-xl bg-muted/20 text-muted-foreground group-hover:text-primary transition-colors">
                                    <Smartphone className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-foreground uppercase tracking-tight">iPhone 15 Pro • São Paulo, BR</p>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Chrome • 192.168.1.45 • Ativo agora</p>
                                </div>
                            </div>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-black text-[9px] uppercase italic tracking-widest">Sessão Atual</Badge>
                        </div>
                        <div className="p-5 flex items-center justify-between hover:bg-muted/5 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded-xl bg-muted/20 text-muted-foreground group-hover:text-primary transition-colors">
                                    <LayoutIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-foreground uppercase tracking-tight">MacBook Pro • Rio de Janeiro, BR</p>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Safari • 201.12.4.88 • Há 2 horas</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 hover:text-destructive">Encerrar</Button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
