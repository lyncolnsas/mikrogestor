"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateSaasGatewayAction, getSaasGatewayConfig } from "@/modules/saas/actions/billing-saas.actions";
import { toast } from "sonner";
import { ShieldCheck, Loader2 } from "lucide-react";

export function GatewaySettingsCard() {
    const [loading, setLoading] = useState(false);
    const [gateway, setGateway] = useState("ASAAS");
    const [config, setConfig] = useState<any>({});

    useEffect(() => {
        getSaasGatewayConfig(null).then((res: any) => {
            if (res.data) {
                setGateway(res.data.paymentGateway);
                setConfig(res.data.gatewayConfig || {});
            }
        });
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await updateSaasGatewayAction({ gateway, config });
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Configurações do gateway atualizadas!");
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
                    <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-black uppercase">Configuração de Recebimento</CardTitle>
                        <CardDescription>Defina por onde a plataforma Mikrogestor recebe as mensalidades dos ISPs.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase text-slate-500">Gateway Ativo</Label>
                        <Select value={gateway} onValueChange={setGateway}>
                            <SelectTrigger className="h-12 rounded-xl border-none bg-white dark:bg-slate-900 shadow-sm font-bold">
                                <SelectValue placeholder="Selecione o gateway" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                <SelectItem value="ASAAS" className="font-bold">Asaas (Brasil)</SelectItem>
                                <SelectItem value="MERCADO_PAGO" className="font-bold">Mercado Pago</SelectItem>
                                <SelectItem value="STRIPE" className="font-bold disabled">Stripe (Soon)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {gateway === "ASAAS" ? (
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase text-slate-500">Asaas API Key (Master)</Label>
                            <Input
                                type="password"
                                className="h-12 rounded-xl border-none bg-white dark:bg-slate-900 shadow-sm font-medium"
                                placeholder="..."
                                value={config.apiKey || ""}
                                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase text-slate-500">Mercado Pago Access Token</Label>
                            <Input
                                type="password"
                                className="h-12 rounded-xl border-none bg-white dark:bg-slate-900 shadow-sm font-medium"
                                placeholder="APP_USR-..."
                                value={config.accessToken || ""}
                                onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                            />
                        </div>
                    )}
                </div>

                <div className="flex justify-end">
                    <Button 
                        onClick={handleSave} 
                        disabled={loading}
                        className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-600/20"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Salvar Configurações
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
