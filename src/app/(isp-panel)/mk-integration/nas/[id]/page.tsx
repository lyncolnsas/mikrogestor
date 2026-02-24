
import { NasForm } from "@/modules/network/components/nas-form";
import { getCurrentTenant } from "@/lib/auth-utils.server";
import { prisma } from "@/lib/prisma";
import { NeonCard, NeonCardHeader, NeonCardTitle, NeonCardDescription, NeonCardContent } from "@/components/ui/neon-card";
import { redirect, notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { getNasByIdAction } from "@/modules/network/actions/nas.actions";

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditNasPage({ params }: PageProps) {
    const { id } = await params;
    const nasId = parseInt(id);

    if (isNaN(nasId)) notFound();

    const context = await getCurrentTenant();
    if (!context) redirect("/auth/login");

    // Busca o NAS para edição
    const nas = await getNasByIdAction(nasId);
    if (!nas) notFound();

    // Busca o IP do túnel VPN do cliente para referência
    const tunnel = await prisma.vpnTunnel.findFirst({
        where: { tenantId: context.tenantId }
    });

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="space-y-2 mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-foreground uppercase tracking-tight italic">Editar Concentrador</h1>
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest opacity-70">Atualizar configurações do MikroTik</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">{nas.nasname}</Badge>
                </div>
            </div>

            <NeonCard className="overflow-hidden border-border bg-card/50 backdrop-blur-xl">
                <NeonCardHeader className="border-b border-border/50 bg-muted/5 p-6">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="rounded-lg h-8 w-8 p-0 flex items-center justify-center bg-primary/10 text-primary border-primary/20 font-black italic text-xs">NAS</Badge>
                        <div>
                            <NeonCardTitle className="text-lg font-black uppercase tracking-tight italic">Configuração do Servidor</NeonCardTitle>
                            <NeonCardDescription className="text-xs font-medium text-muted-foreground/70 tracking-tight">
                                Atenção: Alterar o IP ou Secret pode desconectar o concentrador.
                            </NeonCardDescription>
                        </div>
                    </div>
                </NeonCardHeader>
                <NeonCardContent className="p-8">
                    <NasForm
                        tunnelIp={tunnel?.internalIp || "Indisponível"}
                        initialData={nas}
                    />
                </NeonCardContent>
            </NeonCard>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-sm text-amber-600 flex gap-3 items-start">
                <div className="mt-0.5">
                    <Info className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                    <p className="font-black uppercase text-[10px] tracking-widest text-amber-600">Reconfiguração Necessária</p>
                    <p className="font-medium text-amber-600/80">
                        Se alterar o IP ou Secret, lembre-se de atualizar também no seu MikroTik em <code className="bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-700">/radius</code>
                    </p>
                </div>
            </div>
        </div>
    );
}
