import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CNABGenerator, RemessaConfig, RemessaItem } from "@/lib/financial/cnab/cnab-generator";

/**
 * API para Geração de Arquivo de Remessa (CNAB)
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { invoiceIds } = body as { invoiceIds: string[] };

        if (!invoiceIds || invoiceIds.length === 0) {
            return NextResponse.json({ error: "Nenhuma fatura selecionada" }, { status: 400 });
        }

        // 1. Obter Configurações Financeiras (Tenant)
        const config = await prisma.financialConfig.findFirst();
        if (!config || !config.gatewayCredentials) {
            return NextResponse.json({ error: "Configuração financeira não encontrada" }, { status: 404 });
        }

        const gateways = config.gatewayCredentials as any;
        const cb = gateways.cb; // Cobrança Bancária (CNAB)

        if (!cb || !cb.enabled) {
            return NextResponse.json({ error: "Cobrança Direta (CNAB) não está habilitada" }, { status: 400 });
        }

        // 2. Buscar Dados das Faturas
        const invoices = await prisma.invoice.findMany({
            where: { id: { in: invoiceIds } },
            include: { customer: true }
        });

        // 3. Mapear para Formato de Remessa
        const remessaItems: RemessaItem[] = (invoices as any).map((inv: any) => ({
            nossoNumero: inv.id.slice(-10), // Simplificação para o nossoNumero (ideal usar sequencial real)
            vencimento: inv.dueDate,
            valor: Number(inv.total),
            dataEmissao: inv.createdAt,
            sacadoNome: inv.customer.name,
            sacadoDocumento: inv.customer.cpfCnpj.replace(/\D/g, ""),
            sacadoEndereco: "Rua Exemplo, 123", // TODO: Usar endereço real
            sacadoCep: "00000000"
        }));

        const remessaConfig: RemessaConfig = {
            bank: cb.bank,
            agencia: cb.agencia,
            dvAgencia: "0",
            conta: cb.conta,
            dvConta: cb.dvConta || "0",
            convenio: cb.convenio,
            carteira: cb.carteira,
            empresaNome: "MINHA EMPRESA ISP",
            empresaCnpj: "00000000000191",
            sequencial: 1 // TODO: Salvar sequencial no banco
        };

        // 4. Gerar Arquivo
        const fileContent = CNABGenerator.generate(remessaConfig, remessaItems);

        // 5. Devolver como Download
        const filename = `REMESSA_${cb.bank}_${new Date().toISOString().slice(0, 10)}.rem`;

        return new NextResponse(fileContent, {
            headers: {
                "Content-Type": "text/plain",
                "Content-Disposition": `attachment; filename="${filename}"`
            }
        });

    } catch (error: any) {
        console.error("[CNAB API Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
