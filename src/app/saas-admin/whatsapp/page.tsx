"use client";

import { useQuery } from "@tanstack/react-query";
import { getSaasWhatsAppStatus, getSaasWhatsAppQrCode, disconnectSaasWhatsApp } from "@/modules/saas/actions/whatsapp-saas.actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    MessageSquare,
    Smartphone,
    LogOut,
    RefreshCcw,
    CheckCircle2,
    AlertCircle,
    Info
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Image from "next/image";

export default function SaasWhatsAppPage() {
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const { data: status, refetch, isLoading } = useQuery({
        queryKey: ["saas-whatsapp-status"],
        queryFn: async () => {
            const res = await getSaasWhatsAppStatus(null);
            return res.data;
        },
        refetchInterval: (query) => (query.state.data?.connected ? 30000 : false)
    });

    const handleConnect = async () => {
        setIsGenerating(true);
        setQrCode(null);
        try {
            const res = await getSaasWhatsAppQrCode(null);
            if (res.error) {
                toast.error(res.error);
            } else if (res.data) {
                setQrCode(res.data);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Erro desconhecido";
            toast.error(message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            const res = await disconnectSaasWhatsApp(null);
            if (res.error) throw new Error(res.error);
            toast.success("Desconectado com sucesso");
            setQrCode(null);
            refetch();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Erro desconhecido";
            toast.error(message);
        }
    };

    return (
        <div className="p-8 space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <MessageSquare className="h-8 w-8 text-emerald-500" /> Gateway de Notificações WhatsApp
                    </h1> { /* Traduzido: WhatsApp Notification Gateway */}
                    <p className="text-muted-foreground mt-1 font-medium">Instância central para notificações SaaS e alertas financeiros aos ISPs.</p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => refetch()}
                    disabled={isLoading}
                    className="rounded-xl font-bold h-12 gap-2"
                >
                    <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar Status
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Status Card */}
                <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white dark:bg-slate-950 flex flex-col">
                    <CardHeader className="bg-slate-900 text-white p-8">
                        <CardTitle className="text-xl font-black italic tracking-tighter uppercase">Status da Conexão</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6 flex-1 flex flex-col justify-center">
                        <div className="flex flex-col items-center text-center space-y-4">
                            {status?.connected ? (
                                <>
                                    <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                                    </div>
                                    <div>
                                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-black mb-2 px-4 py-1">CONECTADO</Badge>
                                        <p className="text-sm font-medium text-slate-500">O gateway está pronto para enviar mensagens.</p>
                                    </div>
                                    <Button
                                        onClick={handleDisconnect}
                                        variant="destructive"
                                        className="w-full rounded-2xl h-12 font-bold mt-4"
                                    >
                                        <LogOut className="h-4 w-4 mr-2" /> Logout do Sistema
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                                        <Smartphone className="h-10 w-10 text-amber-500" />
                                    </div>
                                    <div>
                                        <Badge variant="outline" className="border-amber-200 text-amber-600 font-black mb-2 px-4 py-1">DESCONECTADO</Badge>
                                        <p className="text-sm font-medium text-slate-500 px-4">Conecte um aparelho para habilitar as notificações do sistema.</p>
                                    </div>
                                    {!qrCode && (
                                        <Button
                                            onClick={handleConnect}
                                            disabled={isGenerating}
                                            className="w-full rounded-2xl h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-xl shadow-emerald-500/20"
                                        >
                                            {isGenerating ? "Iniciando..." : "Conectar Novo Celular"}
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* QR Code Card */}
                <Card className="md:col-span-2 border-none shadow-xl rounded-3xl overflow-hidden bg-white dark:bg-slate-950">
                    <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Emparelhamento</CardTitle>
                            <CardDescription>Escaneie o código abaixo com seu WhatsApp Business.</CardDescription>
                        </div>
                        <AlertCircle className="h-8 w-8 text-slate-200" />
                    </CardHeader>
                    <CardContent className="p-8 flex items-center justify-center min-h-[400px]">
                        {status?.connected ? (
                            <div className="max-w-md text-center space-y-4">
                                <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100">
                                    <Info className="h-8 w-8 text-blue-500 mx-auto mb-4" />
                                    <h4 className="font-bold text-slate-900 dark:text-white">Conexão Segura</h4>
                                    <p className="text-sm text-slate-500 mt-2">
                                        Este aparelho está vinculado à infraestrutura SaaS. Todas as mensagens de sistema (boletos, alertas de suspensão, suporte) serão enviadas por ele.
                                    </p>
                                </div>
                            </div>
                        ) : qrCode ? (
                            <div className="flex flex-col items-center gap-6">
                                <div className="p-4 bg-white rounded-[2rem] shadow-2xl border-8 border-slate-50 ring-1 ring-slate-200">
                                    <Image src={qrCode} alt="WhatsApp QR Code" width={280} height={280} className="rounded-lg" />
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="font-black text-lg text-slate-900 dark:text-white antialiased">Aguardando leitura...</p>
                                    <p className="text-sm text-slate-400 font-medium">Abra o WhatsApp {'>'} Aparelhos Conectados {'>'} Conectar um Aparelho</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-slate-400 font-medium max-w-sm">
                                {isGenerating ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                        <p>Gerando handshake com WhatsApp...</p>
                                    </div>
                                ) : (
                                    <p>Clique em &quot;Conectar&quot; para gerar o QR Code de emparelhamento.</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Config & Logs Info */}
            <div className="flex gap-4 p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                <div className="h-10 w-10 rounded-2xl bg-blue-500 flex items-center justify-center text-white shrink-0">
                    <Info className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                    <h4 className="font-bold text-blue-900 dark:text-blue-400">Dica de Gestão</h4>
                    <p className="text-sm text-blue-800/70">Recomendamos o uso de um número exclusivo do Mikrogestor para evitar bloqueios por spam ao enviar notificações automatizadas.</p>
                </div>
            </div>
        </div>
    );
}
