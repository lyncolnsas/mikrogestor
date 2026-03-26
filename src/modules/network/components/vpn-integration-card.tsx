"use client"

import * as React from "react"
import { Shield, Check, Copy, AlertCircle, RefreshCw, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getMikrotikVpnConfigAction } from "@/modules/saas/actions/vpn-export.actions"
import { toast } from "sonner"

interface VpnIntegrationCardProps {
    tunnelId: string
    internalIp: string
    status: "connected" | "disconnected"
    needsSync?: boolean
    lastSyncedAt?: Date | null
    quota?: {
        used: number
        limit: number
    }
    scheduledDowngrade?: {
        date: Date
        targetLimit: number
    }
}

export function VpnIntegrationCard({ tunnelId, internalIp, status, needsSync = false, lastSyncedAt, quota, scheduledDowngrade, configScript }: VpnIntegrationCardProps & { configScript?: string }) {
    const [copied, setCopied] = React.useState(false)
    const [isDownloading, setIsDownloading] = React.useState(false)

    // Use the provided WireGuard script or a placeholder if loading/missing
    const displayScript = configScript || `# Carregando configuração WireGuard...\n# Aguarde...`;

    const handleCopy = () => {
        if (!configScript) return;
        navigator.clipboard.writeText(configScript)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDownloadConfig = async () => {
        setIsDownloading(true)
        try {
            // Fetch the real VPN config from the server
            const result = await getMikrotikVpnConfigAction({ tunnelId })

            if (result.error) {
                toast.error(result.error)
                return
            }

            if (!result.data) {
                toast.error("Configuração VPN não encontrada")
                return
            }

            // Create a blob with the script content
            // @ts-ignore - The action now returns an object { fullScript, part1, part2 }
            const scriptContent = typeof result.data === 'string' ? result.data : result.data.fullScript
            const blob = new Blob([scriptContent], { type: 'text/plain' })
            const url = window.URL.createObjectURL(blob)

            // Create a temporary link and trigger download
            const link = document.createElement('a')
            link.href = url
            link.download = `mikrogestor-vpn-config-${Date.now()}.rsc`
            document.body.appendChild(link)
            link.click()

            // Cleanup
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)

            toast.success("Configuração VPN baixada com sucesso!")

            // Reload the page to update the sync status
            setTimeout(() => {
                window.location.reload()
            }, 1500)
        } catch (error) {
            console.error("Error downloading VPN config:", error)
            toast.error("Erro ao baixar configuração VPN")
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Shield className="h-5 w-5 text-emerald-500" />
                            Integração VPN Mikrogestor (WireGuard)
                        </CardTitle>
                        <CardDescription>
                            Conexão de alta performance via WireGuard.
                        </CardDescription>
                        <CardDescription>
                            Conecte seu MikroTik ao nosso túnel privado para automação remota segura.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={status === "connected" ? "default" : "destructive"} className="animate-pulse">
                            {status === "connected" ? "Túnel Ativo" : "Desconectado"}
                        </Badge>
                        {quota && (
                            <Badge variant="outline" className="text-xs font-mono">
                                VPNs: {quota.used}/{quota.limit}
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-4 p-3 bg-card border rounded-lg text-xs font-mono">
                    <div className="flex-1">
                        <p className="text-muted-foreground mb-1 uppercase text-[10px] font-bold">Tunnel ID</p>
                        <p className="text-foreground truncate" title={tunnelId}>{tunnelId}</p>
                    </div>
                    <div className="flex-1">
                        <p className="text-muted-foreground mb-1 uppercase text-[10px] font-bold">IP Interno (Gateway)</p>
                        <p className="text-foreground">{internalIp}</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold uppercase text-muted-foreground px-1">
                        <span>Script de Provisionamento (Preview)</span>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={handleCopy} disabled={!configScript}>
                            {copied ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
                            {copied ? "Copiado" : "Copiar Script"}
                        </Button>
                    </div>
                    <pre className="p-4 bg-slate-950 text-slate-300 rounded-lg text-[11px] overflow-auto max-h-48 border border-white/10 scrollbar-thin whitespace-pre-wrap">
                        {displayScript}
                    </pre>
                </div>

                {/* Sync Status Alert */}
                {needsSync && (
                    <div className="flex items-start gap-3 p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl animate-pulse">
                        <RefreshCw className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-2">
                            <p className="text-sm font-bold text-amber-600">
                                ⚠️ Configuração VPN Desatualizada
                            </p>
                            <p className="text-xs text-amber-600/80">
                                O endpoint do servidor VPN foi alterado. Baixe a nova configuração e reconfigure seu MikroTik para manter a conectividade.
                            </p>
                            <Button
                                size="sm"
                                className="mt-2 bg-amber-500 hover:bg-amber-600 text-white gap-2"
                                onClick={handleDownloadConfig}
                                disabled={isDownloading}
                            >
                                {isDownloading ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        Baixando...
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4" />
                                        Baixar Nova Configuração
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Downgrade Warning Banner */}
                {scheduledDowngrade && (
                    <div className="flex items-start gap-3 p-4 bg-orange-500/10 border-2 border-orange-500/30 rounded-xl">
                        <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-2">
                            <p className="text-sm font-bold text-orange-600">
                                ⚠️ Downgrade de Plano Agendado
                            </p>
                            <p className="text-xs text-orange-600/80">
                                Seu plano será alterado em {new Date(scheduledDowngrade.date).toLocaleDateString('pt-BR')}.
                                Após esta data, você terá apenas {scheduledDowngrade.targetLimit} VPN(s) ativa(s).
                                {quota && quota.used > scheduledDowngrade.targetLimit && (
                                    <span className="block mt-1 font-semibold">
                                        Delete {quota.used - scheduledDowngrade.targetLimit} VPN(s) antes desta data para evitar desativação automática.
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                )}


                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
                    <p className="text-[10px] text-emerald-600 font-medium">
                        Ambiente Seguro: Suas chaves são criptografadas e o túnel é isolado.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
