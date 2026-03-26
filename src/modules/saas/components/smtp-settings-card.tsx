
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getSaasSmtpConfig, updateSaasSmtpAction } from "../actions/smtp-saas.actions";
import { toast } from "sonner";
import { Mail, ShieldCheck, Loader2 } from "lucide-react";

export function SmtpSettingsCard() {
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState<any>({
        host: "",
        port: 587,
        secure: false,
        user: "",
        pass: "",
        fromName: "",
        fromEmail: "",
    });

    useEffect(() => {
        getSaasSmtpConfig(null).then((res: any) => {
            if (res.data) {
                setConfig(res.data.smtpConfig || {});
            }
        });
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await updateSaasSmtpAction(config);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Configurações SMTP atualizadas!");
            }
        } catch (e) {
            toast.error("Erro ao salvar.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-none shadow-2xl rounded-[2.5rem] bg-indigo-50/50 dark:bg-indigo-900/10 overflow-hidden">
            <CardHeader className="p-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                        <Mail className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-black uppercase tracking-tight antialiased">E-mail do Sistema (SMTP)</CardTitle>
                        <CardDescription>Configuração central para envio de recuperação de senha e e-mails administrativos.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase text-slate-500">Host SMTP</Label>
                        <Input
                            className="h-12 rounded-xl border-none bg-white dark:bg-slate-900 shadow-sm font-medium"
                            placeholder="smtp.exemplo.com"
                            value={config.host || ""}
                            onChange={(e) => setConfig({ ...config, host: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase text-slate-500">Porta</Label>
                        <Input
                            type="number"
                            className="h-12 rounded-xl border-none bg-white dark:bg-slate-900 shadow-sm font-medium"
                            placeholder="587"
                            value={config.port || 587}
                            onChange={(e) => setConfig({ ...config, port: e.target.value })}
                        />
                    </div>
                    <div className="flex items-center space-x-2 md:mt-8">
                        <Switch 
                            checked={config.secure || false}
                            onCheckedChange={(checked) => setConfig({ ...config, secure: checked })}
                        />
                        <Label className="text-xs font-black uppercase text-slate-500">SSL/TLS (Porta 465)</Label>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase text-slate-500">Usuário SMTP</Label>
                        <Input
                            className="h-12 rounded-xl border-none bg-white dark:bg-slate-900 shadow-sm font-medium"
                            placeholder="usuario@dominio.com"
                            value={config.user || ""}
                            onChange={(e) => setConfig({ ...config, user: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase text-slate-500">Senha SMTP</Label>
                        <Input
                            type="password"
                            className="h-12 rounded-xl border-none bg-white dark:bg-slate-900 shadow-sm font-medium"
                            placeholder="********"
                            value={config.pass || ""}
                            onChange={(e) => setConfig({ ...config, pass: e.target.value })}
                        />
                    </div>
                    <div className="lg:block"></div> { /* Placeholder for layout grid */}

                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase text-slate-500">Nome do Remetente</Label>
                        <Input
                            className="h-12 rounded-xl border-none bg-white dark:bg-slate-900 shadow-sm font-medium"
                            placeholder="Mikrogestor SaaS"
                            value={config.fromName || ""}
                            onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase text-slate-500">E-mail do Remetente</Label>
                        <Input
                            className="h-12 rounded-xl border-none bg-white dark:bg-slate-900 shadow-sm font-medium"
                            placeholder="no-reply@mikrogestor.com"
                            value={config.fromEmail || ""}
                            onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                        />
                    </div>
                </div>

                <div className="mt-8 p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-3xl flex gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white shrink-0">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-bold text-amber-900 dark:text-amber-400">Configuração para Gmail</h4>
                        <p className="text-sm text-amber-800/70 leading-relaxed">
                            Para usar o Gmail, você precisa de uma <strong>Senha de App</strong>. Não use sua senha convencional. 
                            <br />
                            <a 
                                href="https://myaccount.google.com/apppasswords" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center mt-2 px-4 py-2 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-lg font-black text-xs uppercase hover:bg-amber-300 transition-colors"
                            >
                                Gerar Senha de App no Google <Loader2 className="h-3 w-3 ml-2" />
                            </a>
                        </p>
                    </div>
                </div>

                <div className="flex justify-end mt-4">
                    <Button 
                        onClick={handleSave} 
                        disabled={loading}
                        className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/20"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Salvar SMTP
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
