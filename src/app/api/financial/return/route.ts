import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CNABReturnParser } from "@/lib/financial/cnab/cnab-return-parser";

/**
 * API para Processamento de Arquivo de Retorno (CNAB)
 */
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
        }

        const fileContent = await file.text();
        const items = CNABReturnParser.parse(fileContent);

        if (items.length === 0) {
            return NextResponse.json({ 
                success: true, 
                message: "Arquivo processado, mas nenhum pagamento (Ocorrência 06) foi encontrado." 
            });
        }

        const stats = { paid: 0, failed: 0 };

        for (const item of items) {
            try {
                // Tenta encontrar a fatura pelo nossoNumero
                // (Usando startsWith ou contains porque nossoNumero pode vir com zeros à esquerda no retorno)
                const invoice = await prisma.invoice.findFirst({
                    where: {
                        OR: [
                            { id: { endsWith: item.nossoNumero } },
                            { id: item.nossoNumero }
                        ],
                        status: { not: 'PAID' }
                    }
                });

                if (invoice) {
                    await prisma.invoice.update({
                        where: { id: invoice.id },
                        data: {
                            status: 'PAID',
                            paidAt: item.dataPagamento,
                            billingType: 'BOLETO', // Registra que foi via banco direto (CNAB)
                            // No mundo real, aqui você criaria um registro em 'Transaction' também
                        }
                    });
                    stats.paid++;
                } else {
                    stats.failed++;
                }
            } catch (err) {
                console.error(`[Conciliation Item Error]: ${item.nossoNumero}`, err);
                stats.failed++;
            }
        }

        return NextResponse.json({
            success: true,
            summary: {
                totalRecognized: items.length,
                totalPaid: stats.paid,
                totalNotFound: stats.failed
            }
        });

    } catch (error: any) {
        console.error("[CNAB Return API Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
