
"use client"

import * as React from "react"
import {
    CreditCard,
    QrCode,
    ArrowLeft,
    History,
    ExternalLink,
    AlertCircle,
    CheckCircle2,
    Download
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getMySaasInvoicesAction } from "@/modules/saas/actions/billing.actions"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import Link from "next/link"

export default function BillingPage() {
    const [invoices, setInvoices] = React.useState<any[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    React.useEffect(() => {
        const load = async () => {
            try {
                const data = await getMySaasInvoicesAction();
                setInvoices((data || []) as any[]);
            } catch (e) {
                console.error(e);
                toast.error("Erro ao carregar faturas");
            } finally {
                setIsLoading(false)
            }
        }
        load();
    }, [])

    const pendingInvoice = invoices.find(inv => inv.status === 'PENDING');
    const pastInvoices = invoices.filter(inv => inv.status !== 'PENDING');

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-[1200px] mx-auto animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Link href="/overview">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 border-none">Minha Assinatura</h1>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Mikrogestor SaaS • Gestão e Pagamentos</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Current Plan & Next Bill */}
                <div className="lg:col-span-2 space-y-6">
                    {pendingInvoice ? (
                        <Card className="border-none shadow-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <QrCode className="h-32 w-32" />
                            </div>
                            <CardContent className="p-8">
                                <Badge className="bg-amber-500 hover:bg-amber-600 text-[10px] font-black uppercase mb-4">Aguardando Pagamento</Badge>
                                <h2 className="text-3xl font-black mb-1">Fatura de {format(new Date(pendingInvoice.createdAt), 'MMMM', { locale: ptBR })}</h2>
                                <p className="text-slate-400 text-sm mb-6">Vencimento em {format(new Date(pendingInvoice.dueDate), "dd 'de' MMMM", { locale: ptBR })}</p>

                                <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                                    <div className="p-4 bg-white rounded-3xl shadow-lg border border-slate-700">
                                        {/* Display QR Code if available, otherwise placeholder */}
                                        <div className="w-40 h-40 flex items-center justify-center bg-slate-50 rounded-2xl overflow-hidden">
                                            {pendingInvoice.pixQrCode ? (
                                                <div className="text-center p-2">
                                                    <QrCode className="h-24 w-24 text-slate-800 mx-auto" />
                                                    <p className="text-[8px] text-slate-400 mt-2 font-mono break-all line-clamp-2">{pendingInvoice.pixQrCode}</p>
                                                </div>
                                            ) : (
                                                <QrCode className="h-20 w-20 text-slate-300" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-4 flex-1">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Valor Total</p>
                                            <p className="text-4xl font-black">R$ {Number(pendingInvoice.amount).toFixed(2).replace('.', ',')}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {pendingInvoice.pixQrCode && (
                                                <Button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(pendingInvoice.pixQrCode);
                                                        toast.success("Código PIX copiado!");
                                                    }}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl px-6"
                                                >
                                                    Copiar Código PIX
                                                </Button>
                                            )}
                                            {pendingInvoice.paymentUrl && (
                                                <Button variant="outline" className="border-slate-700 hover:bg-slate-700 text-white font-bold rounded-2xl gap-2" asChild>
                                                    <a href={pendingInvoice.paymentUrl} target="_blank" rel="noreferrer">
                                                        <ExternalLink className="h-4 w-4" /> Link de Pagamento
                                                    </a>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-none shadow-sm bg-emerald-50 border border-emerald-100">
                            <CardContent className="p-8 flex items-center gap-6">
                                <div className="h-16 w-16 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                                    <CheckCircle2 className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-emerald-900">Você está em dia!</h3>
                                    <p className="text-emerald-700 text-xs font-medium">Sua assinatura está ativa e não há faturas pendentes.</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* History */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <History className="h-4 w-4 text-slate-400" />
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Histórico de Cobranças</h3>
                        </div>
                        <Card className="border-none shadow-sm overflow-hidden">
                            <CardContent className="p-0">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100 uppercase text-[10px] font-black text-slate-400 tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Mês Referência</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Vencimento</th>
                                            <th className="px-6 py-4 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {pastInvoices.length > 0 ? pastInvoices.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-bold text-slate-900">{format(new Date(inv.createdAt), 'MMMM yyyy', { locale: ptBR })}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="outline" className={inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}>
                                                        {inv.status === 'PAID' ? 'Pago' : 'Cancelado'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-xs text-muted-foreground">{format(new Date(inv.dueDate), 'dd/MM/yyyy')}</p>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <p className="text-sm font-black">R$ {Number(inv.amount).toFixed(2).replace('.', ',')}</p>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic text-xs">
                                                    {isLoading ? "Carregando histórico..." : "Nenhum histórico de faturas encontrado."}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Account Summary Sidebar */}
                <div className="space-y-6">
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="p-6 bg-slate-50 border-b">
                            <CardTitle className="text-lg">Meu Plano</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">Plano Atual</p>
                                    <p className="text-xl font-black text-blue-600">
                                        {invoices[0]?.subscription?.plan?.name || "Premium ISP"}
                                    </p>
                                </div>
                                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <CreditCard className="h-5 w-5 text-blue-600" />
                                </div>
                            </div>

                            <Separator className="bg-slate-100" />

                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Ciclo de Renovação</span>
                                    <span className="font-bold">Mensal</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Próximo Vencimento</span>
                                    <span className="font-bold">
                                        {pendingInvoice ? format(new Date(pendingInvoice.dueDate), 'dd/MM/yyyy') : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            <Button variant="outline" className="w-full rounded-2xl font-bold border-slate-200" disabled>
                                Alterar Plano
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-blue-50/50 border border-blue-100">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 text-blue-600" />
                                <h4 className="text-sm font-bold text-blue-900">Nota Fiscal</h4>
                            </div>
                            <p className="text-xs text-blue-700 leading-relaxed">
                                As notas fiscais de serviço são emitidas automaticamente após o processamento bancário da fatura e enviadas para o seu e-mail de cadastro.
                            </p>
                            <Button variant="ghost" size="sm" className="w-full justify-start text-[10px] font-black uppercase text-blue-600 hover:bg-blue-100" disabled>
                                <Download className="h-3 w-3 mr-2" /> Baixar últimas notas
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
