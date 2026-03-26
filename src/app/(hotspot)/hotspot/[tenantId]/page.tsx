"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { registerHotspotUserAction } from "@/modules/saas/actions/hotspot-register.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Wifi, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { getHotspotConfigAction } from "@/modules/saas/actions/hotspot.actions";

export default function HotspotRegisterPage({ params }: { params: Promise<{ tenantId: string }> }) {
    // Unwrapping params Promise (Next.js 15+ compatible)
    const { tenantId } = React.use(params);
    
    const searchParams = useSearchParams();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [config, setConfig] = useState<any>(null);
    const [isFetchingConfig, setIsFetchingConfig] = useState(true);

    // MikroTik params
    const mac = searchParams.get("mac") || "";
    const linkLogin = searchParams.get("link-login") || "";
    const challenge = searchParams.get("challenge") || "";

    useEffect(() => {
        async function fetchConfig() {
            try {
                const cfg = await getHotspotConfigAction(tenantId);
                setConfig(cfg);
                
                // If custom page is enabled, redirect to it
                if (cfg?.useCustomPage && cfg?.customPagePath) {
                    const customUrl = new URL(cfg.customPagePath, window.location.origin);
                    // Pass all original search params
                    searchParams.forEach((value, key) => {
                        customUrl.searchParams.append(key, value);
                    });
                    window.location.href = customUrl.toString();
                }
            } catch (err) {
                console.error("Failed to load hotspot config", err);
            } finally {
                setIsFetchingConfig(false);
            }
        }
        fetchConfig();
    }, [tenantId, searchParams]);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        try {
            const res = await registerHotspotUserAction(tenantId, formData);
            if (res.success) {
                setIsSuccess(true);
                toast.success("Cadastro realizado com sucesso!");
                // If the action returned a direct redirect (MikroTik login), use it
                if (res.redirect) {
                   window.location.href = res.redirect;
                }
            } else if (res.error) {
                toast.error(res.error);
            }
        } catch (error: any) {
            toast.error(error.message || "Erro ao registrar");
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetchingConfig) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mb-4" />
                <p className="text-white font-black uppercase tracking-widest text-xs opacity-40">Iniciando conexão segura...</p>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10" />
                <Card className="max-w-md w-full border-none bg-slate-900 shadow-2xl rounded-[2.5rem] p-10 relative overflow-hidden text-center scale-in duration-500">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
                    <div className="h-20 w-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
                        <CheckCircle className="h-10 w-10 text-emerald-500" />
                    </div>
                    <CardTitle className="text-3xl font-black italic uppercase tracking-tighter text-white mb-4">Acesso Liberado!</CardTitle>
                    <CardDescription className="text-slate-400 font-bold mb-8">Sua conexão foi configurada. Você já pode navegar livremente em nossa rede.</CardDescription>
                </Card>
            </div>
        );
    }

    // Default portal UI (standard)
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans scroll-smooth">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-10" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
            
            <Card className="max-w-md w-full border-none bg-slate-900 border border-white/5 shadow-2xl rounded-[3rem] p-8 md:p-12 relative overflow-hidden">
                {config?.bannerUrl && (
                    <div className="absolute inset-0 bg-cover bg-center opacity-30 z-0" style={{ backgroundImage: `url(${config.bannerUrl})` }} />
                )}
                <div 
                   className="absolute top-0 left-0 w-full h-1.5 z-10" 
                   style={{ backgroundColor: config?.primaryColor || '#4f46e5' }}
                />
                
                <CardHeader className="text-center p-0 mb-10 z-10">
                    <div className="h-20 w-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-white/10 group overflow-hidden" style={{ backgroundColor: config?.primaryColor || '#4f46e5' }}>
                        {config?.logoUrl ? (
                            <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                        ) : (
                            <Wifi className="h-10 w-10 text-white group-hover:scale-110 transition-transform" />
                        )}
                    </div>
                    <CardTitle className="text-4xl font-black italic uppercase tracking-tighter text-white leading-none">
                        {config?.title || "Wi-Fi Grátis"}
                    </CardTitle>
                    <CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2 opacity-60">
                        {config?.subtitle || "Autenticação Mikrogestor"}
                    </CardDescription>
                </CardHeader>

                <CardContent className="p-0 z-10 relative">
                    <form action={handleSubmit} className="space-y-6">
                        <input type="hidden" name="mac" value={mac} />
                        <input type="hidden" name="challenge" value={challenge} />
                        <input type="hidden" name="linkLogin" value={linkLogin} />

                        {config?.collectName !== false && (
                            <div className="space-y-2">
                                <Label className="uppercase text-[9px] font-black tracking-widest text-slate-500 ml-1">Nome Completo</Label>
                                <Input 
                                    name="name" 
                                    placeholder="Nome completo" 
                                    required 
                                    className="rounded-2xl h-14 bg-slate-800 border-none text-white font-bold placeholder:text-slate-600 focus:ring-opacity-20 transition-all shadow-sm"
                                />
                            </div>
                        )}

                        {config?.collectPhone !== false && (
                            <div className="space-y-2">
                                <Label className="uppercase text-[9px] font-black tracking-widest text-slate-500 ml-1">Telefone / WhatsApp</Label>
                                <Input 
                                    name="phone" 
                                    placeholder="(00) 00000-0000" 
                                    required 
                                    className="rounded-2xl h-14 bg-slate-800 border-none text-white font-bold placeholder:text-slate-600 focus:ring-opacity-20 transition-all shadow-sm"
                                />
                            </div>
                        )}

                        <div className="pt-6">
                            <Button 
                                type="submit" 
                                disabled={isLoading}
                                className="w-full h-16 rounded-[1.5rem] font-black text-white gap-3 shadow-xl uppercase tracking-widest text-xs italic transition-all group active:scale-95"
                                style={{ backgroundColor: config?.primaryColor || '#4f46e5' }}
                            >
                                {isLoading ? <Loader2 className="animate-spin h-5 w-5 text-white" /> : "Conectar à Internet"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
