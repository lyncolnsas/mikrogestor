"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Copy, Check, QrCode, Smartphone, Loader2, FileText, Landmark } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getBoletoConfigAction } from "@/modules/financial/actions/boleto.actions";
import { BoletoRenderer } from "../financial/boleto/BoletoRenderer";

interface Invoice {
    id: string;
    total: number | string;
    createdAt: Date;
    dueDate?: Date;
    pixQrCode?: string | null; // CÓDIGO PIX (Payload)
    paymentUrl?: string | null;
}

interface InvoicePaymentModalProps {
    invoice: Invoice;
    trigger?: React.ReactNode;
}

export function InvoicePaymentModal({ invoice, trigger }: InvoicePaymentModalProps) {
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [boletoData, setBoletoData] = useState<any>(null);
    const [isLoadingBoleto, setIsLoadingBoleto] = useState(false);

    useEffect(() => {
        // Load Boleto data if not PAID
        const status = (invoice as any).status;
        if (status !== 'PAID') {
            setIsLoadingBoleto(true);
            getBoletoConfigAction().then(res => {
                if (res.data) setBoletoData(res.data);
                setIsLoadingBoleto(false);
            });
        }
    }, [invoice]);

    useEffect(() => {
        if (invoice.pixQrCode) {
            QRCode.toDataURL(invoice.pixQrCode, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff',
                },
            }).then(setQrCodeDataUrl).catch((err) => {
                console.error("Erro ao gerar QR Code:", err);
            });
        }
    }, [invoice.pixQrCode]);

    const handleCopy = () => {
        if (invoice.pixQrCode) {
            navigator.clipboard.writeText(invoice.pixQrCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || (
                    <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform">
                        <QrCode className="h-4 w-4" /> Pagar com PIX
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Smartphone className="h-5 w-5 text-emerald-600" />
                        Pagamento via PIX
                    </DialogTitle>
                    <DialogDescription>
                        Escaneie o QR Code ou copie o código para pagar a fatura de
                        <strong className="text-slate-900 dark:text-white mx-1">
                            {format(new Date(invoice.createdAt), "MMMM/yyyy", { locale: ptBR })}
                        </strong>
                        no valor de
                        <strong className="text-emerald-600 mx-1">
                            R$ {Number(invoice.total).toFixed(2)}
                        </strong>
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="pix" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50 p-1">
                        <TabsTrigger value="pix" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                            <QrCode className="h-4 w-4" /> PIX
                        </TabsTrigger>
                        <TabsTrigger value="boleto" disabled={!boletoData} className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                            <FileText className="h-4 w-4" /> BOLETO
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pix">
                        <div className="flex flex-col items-center justify-center p-4 space-y-6">
                            {/* Área do QR Code */}
                            <div className="bg-white p-4 rounded-xl shadow-inner border border-slate-100 dark:border-slate-800">
                                {qrCodeDataUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={qrCodeDataUrl}
                                        alt="QR Code PIX"
                                        className="w-64 h-64 object-contain"
                                    />
                                ) : (
                                    <div className="w-64 h-64 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-400 text-sm gap-3">
                                        {invoice.pixQrCode ? (
                                            <>
                                                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                                                <span>Gerando QR Code...</span>
                                            </>
                                        ) : (
                                            <span>Código PIX indisponível</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Copia e Cola */}
                            <div className="w-full space-y-2">
                                <Label htmlFor="pix-code" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Pix Copia e Cola
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="pix-code"
                                        readOnly
                                        value={invoice.pixQrCode || "Código não disponível"}
                                        className="font-mono text-xs bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 h-10"
                                    />
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={handleCopy}
                                        disabled={!invoice.pixQrCode}
                                        className={copied ? "text-emerald-600 border-emerald-200 bg-emerald-50" : ""}
                                    >
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="boleto">
                        {isLoadingBoleto ? (
                            <div className="h-64 flex flex-col items-center justify-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                <span className="text-xs text-muted-foreground">Gerando visualização bancária...</span>
                            </div>
                        ) : boletoData ? (
                            <div className="p-2 h-[450px] overflow-auto rounded-lg border border-border bg-slate-50/50">
                                <BoletoRenderer 
                                    account={{
                                        bankCode: boletoData.banco === 'BB' ? '001' : '756', // Mock map
                                        bankName: boletoData.banco,
                                        agencia: boletoData.beneficiario.agencia,
                                        conta: boletoData.beneficiario.conta,
                                        dvConta: boletoData.beneficiario.dvConta,
                                        beneficiario: boletoData.beneficiario.nome,
                                        cnpj: boletoData.beneficiario.documento
                                    }}
                                    nossoNumero={String(invoice.id).slice(0, 8)}
                                    vencimento={invoice.dueDate ? format(new Date(invoice.dueDate), "dd/MM/yyyy") : "-"}
                                    emissao={format(new Date(invoice.createdAt), "dd/MM/yyyy")}
                                    valor={Number(invoice.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    linhaDigitavel="00190.00009 02741.512228 60007.412176 9 86510000001000" // Mock
                                    barcodeValue="00199865100000010000000002741512226000741217" // Mock
                                    sacado={{
                                        nome: "CLIENTE TESTE",
                                        documento: "123.456.789-00",
                                        endereco: "RUA DOS PROVEDORES, 1500 - CENTRO"
                                    }}
                                    instrucoes={[
                                        "NÃO RECEBER APÓS 30 DIAS DE VENCIMENTO",
                                        "COBRAR MULTA DE R$ 2,00 APÓS VENCIMENTO",
                                        "COBRAR JUROS DE 0,033% AO DIA"
                                    ]}
                                />
                                <div className="mt-4 flex justify-center">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => window.open(`/portal/invoice/${invoice.id}/print`, "_blank")}
                                        className="gap-2 text-xs h-9 uppercase font-bold italic border-blue-500/20 text-blue-600 hover:bg-blue-50"
                                    >
                                        <Landmark className="h-4 w-4" /> Baixar PDF Original
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">
                                Boleto não habilitado para este provedor.
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <div className="text-center text-[10px] text-slate-400 mt-2 px-8">
                    Após o pagamento, a liberação do sinal ocorre em até alguns minutos (Pix) ou 24h (Boleto) automaticamente.
                </div>
            </DialogContent>
        </Dialog>
    );
}
