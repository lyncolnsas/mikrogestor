"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { format } from "date-fns"
import { Loader2, Printer } from "lucide-react"
import { getInvoiceForPrintAction } from "@/modules/financial/actions/invoice-actions"
import { BoletoRenderer } from "@/components/financial/boleto/BoletoRenderer"
import { Button } from "@/components/ui/button"

/**
 * Página específica para impressão de boleto.
 * Carrega os dados reais via Server Action e abre o diálogo de impressão.
 */
export default function InvoicePrintPage() {
    const params = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            if (!params.id) return;
            
            try {
                const res = await getInvoiceForPrintAction(params.id as string);
                if (res) {
                    setData(res);
                }
            } catch (error) {
                console.error("Erro ao carregar boleto:", error);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [params.id]);

    useEffect(() => {
        if (!loading && data) {
            // Delay para garantir que fontes e componentes renderizaram
            const timer = setTimeout(() => {
                window.print();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [loading, data]);

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-white gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-slate-500 font-medium animate-pulse">Preparando documento para impressão...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-8 text-center bg-white h-screen flex flex-col items-center justify-center gap-4">
                <div className="text-red-500 text-5xl font-bold">!</div>
                <h1 className="text-xl font-bold text-slate-800">Boleto não encontrado</h1>
                <p className="text-slate-500 max-w-md">Não conseguimos localizar os dados desta fatura. Verifique se o link está correto ou contate o suporte.</p>
                <Button onClick={() => window.close()} variant="outline">Fechar Janela</Button>
            </div>
        );
    }

    const { boletoData } = data;

    return (
        <div className="bg-white min-h-screen">
            <style jsx global>{`
                @media print {
                    @page { 
                        margin: 0.5cm; 
                        size: portrait; 
                    }
                    body { 
                        margin: 0; 
                        background: white; 
                    }
                    .no-print { 
                        display: none !important; 
                    }
                    .print-m-0 {
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                }
            `}</style>
            
            {/* Toolbar apenas para visualização em tela */}
            <div className="no-print sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md text-white p-3 flex justify-between items-center shadow-xl border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-lg">
                        <Printer className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Impressão de Fatura</p>
                        <p className="text-sm font-semibold">#{params.id}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.close()}
                        className="text-xs border-white/20 text-white hover:bg-white/10"
                    >
                        Cancelar
                    </Button>
                    <Button 
                        size="sm"
                        onClick={() => window.print()}
                        className="text-xs font-bold bg-primary hover:bg-primary/90"
                    >
                        IMPRIMIR / SALVAR PDF
                    </Button>
                </div>
            </div>

            <div className="p-4 md:p-8 max-w-[210mm] mx-auto print-m-0">
                <BoletoRenderer 
                    account={{
                        bankCode: boletoData.banco === 'BB' ? '001' : '756',
                        bankName: boletoData.banco,
                        agencia: boletoData.beneficiario.agencia,
                        conta: boletoData.beneficiario.conta,
                        dvConta: boletoData.beneficiario.dvConta,
                        beneficiario: boletoData.beneficiario.nome,
                        cnpj: boletoData.beneficiario.documento
                    }}
                    nossoNumero={String(boletoData.nossoNumero || params.id).slice(0, 10)}
                    vencimento={format(new Date(boletoData.vencimento), "dd/MM/yyyy")}
                    emissao={format(new Date(boletoData.emissao), "dd/MM/yyyy")}
                    valor={Number(boletoData.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    linhaDigitavel={boletoData.linhaDigitavel}
                    barcodeValue={boletoData.barcodeValue}
                    sacado={{
                        nome: boletoData.sacado.nome,
                        documento: boletoData.sacado.documento,
                        endereco: boletoData.sacado.endereco
                    }}
                    instrucoes={[
                        "PAGÁVEL EM QUALQUER AGÊNCIA BANCÁRIA OU CANAIS DIGITAIS ATÉ O VENCIMENTO",
                        "APÓS O VENCIMENTO, COBRAR MULTA DE 2% E MORA DE 0,033% AO DIA",
                        "MANTENHA SEU PAGAMENTO EM DIA PARA EVITAR SUSPENSÃO DOS SERVIÇOS",
                        `ESTE BOLETO REFERE-SE À FATURA #${params.id}`
                    ]}
                />
            </div>

            <div className="mt-12 text-center text-[10px] text-gray-400 no-print border-t pt-4">
                Mikrogestor SaaS - Documento assinado digitalmente.
            </div>
        </div>
    );
}
