import { NextRequest, NextResponse } from "next/server";
import { RadiusEngineService } from "@/modules/network/radius-engine.service";

/**
 * Endpoint de Sincronização de Bloqueios de Rede
 * Pode ser chamado via CRON externa para automatizar o corte de inadimplentes.
 */
export async function POST(req: NextRequest) {
    // Verificação de Segurança (Ex: Header de API Key do Cron)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const radiusService = new RadiusEngineService();
        
        // Sincroniza regras de bloqueio baseadas no financeiro
        const result = await radiusService.syncBlockingRules();

        return NextResponse.json({
            success: true,
            summary: {
                totalBlocked: result.blockedCount,
                usersProcessed: result.processedUsers.length,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error("[Network Sync API Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    return NextResponse.json({ message: "Use POST para disparar a sincronização." });
}
