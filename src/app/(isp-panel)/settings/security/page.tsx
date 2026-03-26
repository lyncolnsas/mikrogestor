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
import { useState, useEffect } from "react";
import { updatePasswordAction, getSecurityLogsAction } from "./actions";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SecuritySettingsPage() {
    const [isSaving, setIsSaving] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);

    useEffect(() => {
        async function loadLogs() {
            try {
                const data = await getSecurityLogsAction();
                setLogs(data);
            } catch (error) {
                console.error("Failed to fetch security logs:", error);
                toast.error("Erro ao carregar histórico de acessos.");
            } finally {
                setIsLoadingLogs(false);
            }
        }
        loadLogs();
    }, []);

    async function handleUpdatePassword(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsSaving(true);
        const formData = new FormData(e.currentTarget);
        
        try {
            const res = await updatePasswordAction(formData);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Senha atualizada com sucesso!");
                (e.target as HTMLFormElement).reset();
            }
        } catch (error) {
            toast.error("Ocorreu um erro ao atualizar a senha.");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-700">
            <form onSubmit={handleUpdatePassword} className="flex flex-col h-full">
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
                    <Button type="submit" disabled={isSaving} variant="neon" className="gap-2 italic px-8 h-11 uppercase font-black tracking-tighter shadow-lg shadow-emerald-500/20 border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500">
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
                                <Label htmlFor="password" title="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nova Senha</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-12 h-13 rounded-2xl bg-card border-border focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/50 transition-all font-mono"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="confirm" title="confirm" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Confirmar Nova Senha</Label>
                                <div className="relative group">
                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
                                    <Input
                                        id="confirm"
                                        name="confirm"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-12 h-13 rounded-2xl bg-card border-border focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/50 transition-all font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <Separator className="bg-border opacity-50" />

                    {/* 2. Login History */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="rounded-lg h-8 w-8 p-0 flex items-center justify-center bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-black italic text-xs">02</Badge>
                            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground italic leading-none">Histórico de Acessos</h3>
                        </div>

                        <div className="space-y-3">
                            {isLoadingLogs ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-2 opacity-50">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    <p className="text-[10px] font-black uppercase tracking-widest italic tracking-tighter">Sincronizando Bunker...</p>
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="p-8 text-center rounded-2xl bg-muted/10 border border-dashed border-border flex flex-col items-center gap-3">
                                    <ShieldCheck className="h-8 w-8 text-muted-foreground opacity-20" />
                                    <p className="text-xs text-muted-foreground font-black uppercase tracking-widest italic opacity-50">Nenhum rastro encontrado ainda.</p>
                                </div>
                            ) : (
                                logs.map((log) => (
                                    <div key={log.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border group hover:bg-muted/40 hover:shadow-sm transition-all shadow-md shadow-black/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shadow-inner group-hover:border-emerald-500/30 transition-colors">
                                                {log.device?.includes("iPhone") || log.device?.includes("Android") ? (
                                                    <Smartphone className="h-4 w-4 text-emerald-500" />
                                                ) : log.device?.includes("Windows") || log.device?.includes("Mac") ? (
                                                    <LayoutIcon className="h-4 w-4 text-blue-500" />
                                                ) : (
                                                    <History className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-foreground uppercase tracking-tight italic">
                                                    {log.event === 'LOGIN' ? 'Acesso realizado' : log.event === 'PASSWORD_CHANGE' ? 'Chave atualizada' : log.event}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                                                    {log.device || 'Dispositivo'} • {log.ipAddress}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black text-emerald-500 uppercase italic tracking-tighter">
                                                {formatDistanceToNow(new Date(log.createdAt), { locale: ptBR, addSuffix: true })}
                                            </span>
                                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest opacity-40">Sucesso</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </form>
        </div>
    );
}
