import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { VpnKeyService } from "@/modules/saas/vpn-key.service";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const serverId = searchParams.get("serverId");
    const secret = searchParams.get("secret");

    if (!serverId || !secret) {
        return NextResponse.json({ error: "Parâmetros ausentes" }, { status: 400 });
    }



    // 1. Verificar Servidor e Segredo
    const server = await prisma.vpnServer.findUnique({
        where: { id: serverId }
    });

    // Nota: Campo 'secret' pode não estar tipado ainda no schema
    if (!server || (server as { secret?: string }).secret !== secret) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Buscar Túneis Ativos
    const tunnels = await prisma.vpnTunnel.findMany({
        where: {
            serverId,
            isActive: true
        },
        include: {
            tenant: { select: { slug: true } }
        }
    });

    // 3. Preparar Dados dos Peers do WireGuard
    const peers = tunnels.map((t) => ({
        publicKey: t.clientPublicKey,
        allowedIps: `${t.internalIp}/32`,
        presharedKey: t.presharedKey,
        tenant: t.tenant?.slug || "system"
    }));

    // 4. Decrypt server private key if available
    let decyptedPrivateKey: string | null = null;
    if ((server as any).privateKey) {
        try {
            decyptedPrivateKey = VpnKeyService.decrypt((server as any).privateKey);
        } catch (e) {
            console.error("[VPN Sync] Failed to decrypt server private key:", e);
        }
    }

    return NextResponse.json({
        serverPublicKey: server.publicKey,
        serverPrivateKey: decyptedPrivateKey,
        listenPort: server.listenPort,
        peers
    });
}


/**
 * POST: Permite que o servidor VPN se auto-registre (reporte seu IP público e Chave Pública)
 */
/**
 * POST: Permite que o servidor VPN se auto-registre (reporte seu IP público e Chave Pública).
 * Suporta auto-criação (Bootstrapping) para facilitar re-instalações.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { serverId, secret, publicEndpoint: rawEndpoint, publicKey } = body;
        let publicEndpoint = rawEndpoint?.split(":")[0] || "auto";

        console.log(`[VPN Sync] Recebido: serverId=${serverId}, endpoint=${rawEndpoint}, publicKey=${publicKey.substring(0, 10)}...`);

        // Heuristic Endpoint Resolution:
        // If the endpoint is loopback, "auto", or ANY private/container IP,
        // we prioritize the IP used in NEXT_PUBLIC_APP_URL if it's a numeric IP.
        const genericEndpoints = ["auto", "127.0.0.1", "localhost", "::1", "0.0.0.0"];
        const isPrivate = publicEndpoint.match(/^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/);

        if (genericEndpoints.includes(publicEndpoint) || isPrivate) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
            if (appUrl) {
                try {
                    const url = new URL(appUrl);
                    const host = url.hostname;
                    // Only override if the APP_URL host is a numeric IP (not localhost/domain)
                    // and different from what we received.
                    const isAppHostIp = host.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);

                    if (isAppHostIp && host !== publicEndpoint && !genericEndpoints.includes(host)) {
                        console.log(`[VPN Sync] Heuristic: Substituindo '${publicEndpoint}' por '${host}' (baseado na NEXT_PUBLIC_APP_URL)`);
                        publicEndpoint = host;
                    }
                } catch (e) {
                    console.error("[VPN Sync] Erro ao parsear APP_URL para heurística:", e);
                }
            }
        }


        if (!serverId || !secret || !publicEndpoint || !publicKey) {
            return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
        }

        // 1. Tenta encontrar o servidor existente pelo ID
        const server = await prisma.vpnServer.findUnique({
            where: { id: serverId }
        });

        if (server) {
            // Cenário A: Servidor já existe, validamos o segredo
            if ((server as { secret: string }).secret !== secret) {
                console.warn(`[VPN Sync] Falha de autenticação para servidor ${serverId}. Segredo incorreto.`);
                return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
            }

            // Atualiza chaves e endpoint
            const updated = await prisma.vpnServer.update({
                where: { id: serverId },
                data: {
                    publicEndpoint,
                    publicKey,
                    isActive: true // Reativa se estiver inativo
                }
            });

            return NextResponse.json({ success: true, server: updated, action: "updated" });

        } else {
            // Cenário B: Servidor não encontrado pelo ID.
            // Verifica se devemos "Adotar" um servidor órfão?
            // (Lógica de Self-Healing para Single-Tenant/Local Dev)

            // Se existir APENAS UM servidor no banco, e ele não bater com o ID, mas o segredo bater (ou formos lenientes em dev)
            const allServers = await prisma.vpnServer.findMany();

            if (allServers.length === 1) {
                const orphan = allServers[0];

                // Excluir o órfão antigo para liberar o nome/Unique constraints se houver, 
                // e recriar com o ID novo? Ou apenas update no ID? Prisma não suporta update em ID facilmente.
                // Estratégia: Atualizar campos chave do órfão para casar com o container? Não, o container manda no ID.
                // Melhor: Deletar o órfão e Recriar com ID correto, movendo os relacionamentos?
                // Risco: Relacionamentos (túneis).
                // Solução Simplificada: Update nos túneis e recriação.

                await prisma.$transaction(async (tx) => {
                    // 1. Mover túneis do órfão para o novo ID
                    await tx.vpnTunnel.updateMany({
                        where: { serverId: orphan.id },
                        data: { serverId: serverId }
                    });

                    // 2. Deletar órfão
                    await tx.vpnServer.delete({ where: { id: orphan.id } });

                    // 3. Criar novo com ID correto e dados do órfão
                    await tx.vpnServer.create({
                        data: {
                            id: serverId,
                            secret: secret,
                            name: orphan.name, // Mantém o nome que o usuário deu (Ex: Heury)
                            publicEndpoint,
                            publicKey,
                            listenPort: orphan.listenPort,
                            capacityLimit: orphan.capacityLimit,
                            isActive: true
                        }
                    });
                }, { timeout: 30000 });

                return NextResponse.json({ success: true, action: "adopted", message: `Servidor '${orphan.name}' adotado.` });
            }

            // Cenário C: Bootstrapping normal (Cria novo do zero)


            const created = await prisma.vpnServer.create({
                data: {
                    id: serverId,
                    secret: secret,
                    name: "Nuvem Core (Auto-Sync)", // Nome padrão
                    publicEndpoint,
                    publicKey,
                    listenPort: 51820,
                    capacityLimit: 1000,
                    isActive: true
                }
            });

            return NextResponse.json({ success: true, server: created, action: "created" });
        }

    } catch (e) {
        console.error("[VPN Sync] Erro no registro:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
