import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { BackupService } from "@/modules/saas/services/backup.service";
import { createReadStream } from "fs";
import fs from "fs/promises";

/**
 * Endpoint para download de backups via stream (evita estouro de memória)
 * GET /api/saas/backups/[filename]
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ filename: string }> }
) {
    const { filename } = await params;
    
    // 1. Verificar autenticação
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const filePath = BackupService.getBackupPath(filename);

    try {
        // 2. Verificar se o arquivo existe
        await fs.access(filePath);
        const stats = await fs.stat(filePath);

        // 3. Criar stream de leitura
        const stream = createReadStream(filePath);

        // 4. Retornar resposta com stream
        return new NextResponse(stream as any, {
            headers: {
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Type": "application/sql",
                "Content-Length": stats.size.toString(),
            },
        });
    } catch (error) {
        console.error("[Backup Download API] Error:", error);
        return new NextResponse("File not found", { status: 404 });
    }
}
