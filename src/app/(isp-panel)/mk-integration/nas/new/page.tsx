import { NasForm } from "@/modules/network/components/nas-form";
import { getCurrentTenant } from "@/lib/auth-utils.server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NeonCard, NeonCardHeader, NeonCardTitle, NeonCardDescription, NeonCardContent } from "@/components/ui/neon-card";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Info, ShieldAlert } from "lucide-react";

export default async function NasRegistryPage() {
    const context = await getCurrentTenant();
    if (!context) redirect("/auth/login");

    // Busca o IP do túnel VPN do cliente
    const tunnel = await prisma.vpnTunnel.findFirst({
        where: { tenantId: context.tenantId }
    });

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="space-y-2 mb-8">
                <h1 className="text-3xl font-black text-foreground uppercase tracking-tight italic">Registrar Concentrador</h1>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest opacity-70">Provisionamento de Roteador MikroTik via Radius</p>
            </div>

            <NeonCard className="overflow-hidden border-border bg-card/50 backdrop-blur-xl">
                <NeonCardHeader className="border-b border-border/50 bg-muted/5 p-6">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="rounded-lg h-8 w-8 p-0 flex items-center justify-center bg-primary/10 text-primary border-primary/20 font-black italic text-xs">NAS</Badge>
                        <div>
                            <NeonCardTitle className="text-lg font-black uppercase tracking-tight italic">Configuração do Servidor</NeonCardTitle>
                            <NeonCardDescription className="text-xs font-medium text-muted-foreground/70 tracking-tight">
                                Vincule seu MikroTik ao sistema de faturamento.
                            </NeonCardDescription>
                        </div>
                    </div>
                </NeonCardHeader>
                <NeonCardContent className="p-8">
                    {!tunnel && (
                        <div className="mb-8 p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20 space-y-4">
                            <div className="flex items-center gap-3 text-amber-500">
                                <ShieldAlert className="h-5 w-5" />
                                <span className="font-black uppercase text-xs tracking-widest italic">Atenção: VPN Requerida</span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Para utilizar a conexão via <strong className="text-foreground">Túnel VPN (Recomendado)</strong>, você precisa primeiro configurar um túnel na sua cota. Se preferir, pode usar IP Direto agora e alterar depois.
                            </p>
                            <Link href="/mk-integration" className="inline-block">
                                <Button variant="outline" className="rounded-xl border-amber-500/20 text-amber-500 hover:bg-amber-500/10 h-10 px-4 font-bold text-[10px] uppercase">
                                    Configurar Túnel Primeiro
                                </Button>
                            </Link>
                        </div>
                    )}
                    <NasForm tunnelIp={tunnel?.internalIp || "Indisponível"} />
                </NeonCardContent>
            </NeonCard>

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl text-sm text-primary/80 flex gap-3 items-start">
                <div className="mt-0.5">
                    <Info className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                    <p className="font-black uppercase text-[10px] tracking-widest text-primary">Dica de Configuração</p>
                    <p className="font-medium">
                        O <strong className="font-black">Radius Secret</strong> definido aqui deve ser idêntico ao configurado no MikroTik em <code className="bg-primary/10 px-1.5 py-0.5 rounded text-primary">/radius add secret=...</code>
                    </p>
                </div>
            </div>
        </div>
    );
}

