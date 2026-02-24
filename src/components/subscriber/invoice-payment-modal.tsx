"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Copy, Check, QrCode, Smartphone, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

                    <div className="text-center text-xs text-slate-400 max-w-[280px]">
                        Após o pagamento, a liberação do sinal ocorre em até 5 minutos automaticamente.
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
