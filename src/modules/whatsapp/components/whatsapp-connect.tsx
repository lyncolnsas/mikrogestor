"use client"

import * as React from "react"
import { QrCode, RefreshCw, CheckCircle2, XCircle, Loader2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getWhatsAppQrCode, getWhatsAppStatus, disconnectWhatsApp } from "../actions/whatsapp.actions"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"

export function WhatsAppConnect() {
    const [qr, setQr] = React.useState<string | null>(null)
    const [isGenerating, setIsGenerating] = React.useState(false)

    // Poll status every 5 seconds
    const { data: status = { connected: false, activeInstances: 0 }, isLoading, refetch } = useQuery({
        queryKey: ["whatsapp-status"],
        queryFn: async () => {
            const res = await getWhatsAppStatus();
            // If connected, clear any QR code that might be showing
            if (res.connected) setQr(null);
            return res;
        },
        refetchInterval: 5000,
    });

    const handleConnect = async () => {
        setIsGenerating(true)
        try {
            const qrData = await getWhatsAppQrCode()
            setQr(qrData)
            toast.info("QR Code gerado. Escaneie no seu WhatsApp.")

            // Start aggressive polling to detect connection faster
            // Note: useQuery will handle re-polls, but we can manually trigger one to be sure
            setTimeout(() => refetch(), 1000);
        } catch (error) {
            toast.error(typeof error === "string" ? error : "Erro ao gerar QR Code")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleDisconnect = async () => {
        try {
            await disconnectWhatsApp()
            setQr(null)
            refetch() // Immediately update status
            toast.success("WhatsApp desconectado com sucesso.")
        } catch {
            toast.error("Falha ao desconectar.")
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
            </div>
        )
    }

    return (
        <Card className="border-2 border-dashed border-slate-200 bg-white overflow-hidden transition-all hover:border-emerald-500/30">
            <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* QR Code Section */}
                    <div className="relative group">
                        {status.connected ? (
                            <div className="h-48 w-48 bg-emerald-50 rounded-3xl flex flex-col items-center justify-center border-2 border-emerald-100 animate-in zoom-in-95">
                                <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                                <p className="mt-4 text-[10px] font-black uppercase text-emerald-600 tracking-widest">Conectado</p>
                            </div>
                        ) : qr ? (
                            <div className="relative p-2 bg-white rounded-2xl border-2 border-indigo-100 shadow-xl overflow-hidden animate-in fade-in">
                                <img src={qr} alt="WhatsApp QR Code" className="h-44 w-44 mix-blend-multiply" />
                                <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button size="icon" variant="secondary" className="rounded-full shadow-lg" onClick={handleConnect}>
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-48 w-48 bg-slate-50 rounded-3xl flex flex-col items-center justify-center border-2 border-slate-100 group-hover:bg-emerald-50/20 transition-colors">
                                <QrCode className="h-12 w-12 text-slate-300 group-hover:text-emerald-300" />
                                <p className="mt-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Aguardando Conexão</p>
                            </div>
                        )}
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <div className="space-y-1">
                            <div className="flex items-center justify-center md:justify-start gap-2">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Status do WhatsApp</h3>
                                {status.connected ? (
                                    <Badge className="bg-emerald-500 hover:bg-emerald-600">ATIVO</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-slate-400">DESCONECTADO</Badge>
                                )}
                            </div>
                            <p className="text-sm text-slate-500 font-medium">
                                Envie faturas, avisos de bloqueio e comprovantes PIX automaticamente para seus clientes.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                            {!status.connected ? (
                                <Button
                                    onClick={handleConnect}
                                    disabled={isGenerating}
                                    className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 gap-2 h-11 px-6"
                                >
                                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                                    {qr ? "Novo QR Code" : "Conectar WhatsApp"}
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleDisconnect}
                                    variant="outline"
                                    className="rounded-xl font-bold border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 h-11 px-6"
                                >
                                    <XCircle className="h-4 w-4 mr-2" /> Desconectar Instância
                                </Button>
                            )}

                            <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 text-slate-400 py-1">
                                {status.activeInstances}/5 SLOTS
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <FeatureItem icon={<MessageSquare className="h-3 w-3" />} label="Envio Automático" />
                            <FeatureItem icon={<CheckCircle2 className="h-3 w-3" />} label="Baixa de Faturas" />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function FeatureItem({ icon, label }: { icon: React.ReactNode, label: string }) {
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-indigo-500">{icon}</span>
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{label}</span>
        </div>
    )
}
