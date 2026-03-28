import { MobilePeer } from "@/modules/saas/components/mobile-vpn-list";
import { prisma } from "@/lib/prisma";
import { Smartphone } from "lucide-react";
import { VpnKeyService } from "@/modules/saas/vpn-key.service";
import { MobileVpnTabs } from "./mobile-vpn-tabs";

export const dynamic = "force-dynamic";

export default async function MobileVpnPage() {

    let serializedPeers: MobilePeer[] = [];

    try {
        // Buscar VPNs do tipo MOBILE e PC
        // Incluir Tenant e Server para exibir na lista e gerar QR Code
        const peers = await prisma.vpnTunnel.findMany({
            where: {
                type: { in: ["MOBILE", "PC"] },
                protocol: "WIREGUARD"
            } as any,
            include: {
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                },
                server: {
                    select: {
                        publicEndpoint: true,
                        listenPort: true,
                        publicKey: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });



        // Serializar datas para passar para o Client Component
        serializedPeers = peers.map(peer => {
            let decryptedPrivateKey = peer.clientPrivateKey;
            if (peer.clientPrivateKey) {
                try {
                    // Tenta descriptografar a chave privada
                    decryptedPrivateKey = VpnKeyService.decrypt(peer.clientPrivateKey);
                } catch (e) {
                    console.error(`[MobileVpnPage] Erro ao descriptografar chave do peer ${peer.id}:`, e);
                }
            }

            return {
                ...peer,
                clientPrivateKey: decryptedPrivateKey,
                lastHandshake: peer.lastHandshake ? peer.lastHandshake.toISOString() : null,
                createdAt: peer.createdAt.toISOString(),
                updatedAt: peer.updatedAt.toISOString(),
                totalBytesRx: Number(peer.totalBytesRx),
                totalBytesTx: Number(peer.totalBytesTx),
                quotaBytes: peer.quotaBytes ? Number(peer.quotaBytes) : null,
                server: {
                    ...peer.server,
                }
            };
        });
    } catch (error) {
        console.error("[MobileVpnPage] Error fetching/serializing:", error);
        serializedPeers = [];
    }

    return (
        <div className="p-8 space-y-8 max-w-[1400px] mx-auto animate-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                    <Smartphone className="h-8 w-8 text-blue-600" /> Acessos VPN (Mobile/PC)
                </h1>
                <p className="text-muted-foreground mt-1 font-medium italic">
                    Gerencie acessos remotos via celular ou PC. Estes dispositivos não contam como pontos de extremidade de rede (CPEs).
                </p>
            </div>

            <MobileVpnTabs peers={serializedPeers} />
        </div>
    );
}
