"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { getCustomerInvoicesAction } from "@/modules/financial/actions/invoice-actions"
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Loader2, Receipt, AlertCircle, CheckCircle2, QrCode, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CustomerFinancialTabProps {
    customerId: string
}

export function CustomerFinancialTab({ customerId }: CustomerFinancialTabProps) {
    const { data: invoices = [], isLoading, error } = useQuery({
        queryKey: ['customer-invoices', customerId],
        queryFn: async () => {
            const result = await getCustomerInvoicesAction(customerId)
            if (result.error) throw new Error(result.error)
            return result.data || []
        }
    })

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground animate-pulse">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p className="text-sm">Carregando faturas...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-rose-500 bg-rose-50 rounded-xl border border-rose-100 p-8">
                <AlertCircle className="h-10 w-10 mb-4" />
                <h3 className="font-bold text-lg text-rose-700">Erro Financeiro</h3>
                <p className="text-sm text-center max-w-xs opacity-80">Não foi possível carregar o histórico de faturas deste assinante.</p>
            </div>
        )
    }

    if (invoices.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5">
                <Receipt className="h-12 w-12 mb-4 opacity-20" />
                <h3 className="font-bold text-lg">Sem Faturas</h3>
                <p className="text-sm">Este assinante ainda não possui histórico financeiro gerado.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard 
                    label="Geral" 
                    value={`R$ ${invoices.reduce((acc: number, inv: any) => acc + inv.total, 0).toFixed(2)}`} 
                    sublabel={`${invoices.length} faturas`}
                />
                <SummaryCard 
                    label="Pagas" 
                    value={`R$ ${invoices.filter((inv: any) => inv.paidAt).reduce((acc: number, inv: any) => acc + inv.total, 0).toFixed(2)}`} 
                    color="text-emerald-500"
                    sublabel={`${invoices.filter((inv: any) => inv.paidAt).length} faturas`}
                />
                <SummaryCard 
                    label="Pendentes" 
                    value={`R$ ${invoices.filter((inv: any) => !inv.paidAt).reduce((acc: number, inv: any) => acc + inv.total, 0).toFixed(2)}`} 
                    color="text-amber-500"
                    sublabel={`${invoices.filter((inv: any) => !inv.paidAt).length} faturas`}
                />
                <SummaryCard 
                    label="Status" 
                    value={invoices.some((inv: any) => !inv.paidAt && new Date(inv.dueDate) < new Date()) ? "Pendente" : "Em Dia"} 
                    color={invoices.some((inv: any) => !inv.paidAt && new Date(inv.dueDate) < new Date()) ? "text-rose-500" : "text-emerald-500"}
                    sublabel="Condição do cliente"
                />
            </div>

            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="font-bold text-xs uppercase text-muted-foreground">ID / Vencimento</TableHead>
                            <TableHead className="font-bold text-xs uppercase text-muted-foreground">Status</TableHead>
                            <TableHead className="font-bold text-xs uppercase text-muted-foreground text-right">Valor</TableHead>
                            <TableHead className="font-bold text-xs uppercase text-muted-foreground">Pagamento</TableHead>
                            <TableHead className="font-bold text-xs uppercase text-muted-foreground text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.map((invoice: any) => {
                            const isOverdue = !invoice.paidAt && new Date(invoice.dueDate) < new Date()
                            
                            return (
                                <TableRow key={invoice.id} className="hover:bg-muted/10 transition-colors">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-mono text-[11px] text-muted-foreground">#{invoice.id.slice(0, 8)}</span>
                                            <span className="font-bold text-sm">
                                                {format(new Date(invoice.dueDate), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {invoice.paidAt ? (
                                            <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20 gap-1.5 h-6">
                                                <CheckCircle2 className="h-3 w-3" /> Pago
                                            </Badge>
                                        ) : isOverdue ? (
                                            <Badge variant="outline" className="bg-rose-500/5 text-rose-600 border-rose-500/20 gap-1.5 h-6 animate-pulse">
                                                <AlertCircle className="h-3 w-3" /> Vencido
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-amber-500/5 text-amber-600 border-amber-500/20 gap-1.5 h-6">
                                                <Loader2 className="h-3 w-3 opacity-50" /> Pendente
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-black text-foreground">
                                        R$ {invoice.total.toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-[11px]">
                                            <span className="text-muted-foreground uppercase font-bold tracking-tighter">
                                                {invoice.billingType || "Outro"}
                                            </span>
                                            <span className="italic">
                                                {invoice.paidAt ? `Liquidado em ${format(new Date(invoice.paidAt), "dd/MM/yyyy")}` : "Aguardando..."}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {!invoice.paidAt && (
                                            <div className="flex justify-end gap-2">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-primary/70 hover:text-primary">
                                                    <QrCode className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500/70 hover:text-blue-500">
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

function SummaryCard({ label, value, color = "text-foreground", sublabel }: { label: string, value: string, color?: string, sublabel?: string }) {
    return (
        <div className="p-4 bg-card border rounded-xl shadow-sm">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{label}</p>
            <p className={cn("text-xl font-black mt-1", color)}>{value}</p>
            {sublabel && <p className="text-[10px] text-muted-foreground font-medium mt-1">{sublabel}</p>}
        </div>
    )
}
