"use client"

import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Calendar, CreditCard, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import { payInvoiceAction, getInvoicePixAction } from "@/modules/financial/actions/invoice-actions"

interface InvoiceListProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    invoices: any[]
}

export function InvoiceList({ invoices }: InvoiceListProps) {
    const [isLoading, setIsLoading] = useState(false)

    async function handlePay(id: string) {
        setIsLoading(true)
        try {
            await payInvoiceAction(id)
            toast.success("Fatura marcada como paga!")
        } catch {
            toast.error("Erro ao processar pagamento")
        } finally {
            setIsLoading(false)
        }
    }

    async function handleGetPix(id: string) {
        toast.promise(async () => {
            const result = await getInvoicePixAction(id);
            if (result.error) throw new Error(result.error);

            if (result.data?.copiaCola) {
                await navigator.clipboard.writeText(result.data.copiaCola);
                return "Código Pix copiado!";
            }
            throw new Error("Sem código Pix");
        }, {
            loading: 'Gerando Pix...',
            success: (msg) => msg,
            error: (err) => err.message || 'Erro ao gerar Pix'
        });
    }

    return (
        <Table>
            <TableHeader>
                <TableRow className="hover:bg-transparent">
                    <TableHead>Fatura #</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {invoices.map((invoice) => (
                    <TableRow key={invoice.id} className="group">
                        <TableCell className="font-mono text-xs text-muted-foreground">
                            {invoice.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                            {invoice.customer.name}
                            <div className="text-[10px] text-muted-foreground">{invoice.customer.cpfCnpj}</div>
                        </TableCell>
                        <TableCell className="font-bold text-slate-700">
                            R$ {invoice.total.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(invoice.dueDate), "dd MMM yyyy", { locale: ptBR })}
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant={
                                invoice.status === 'PAID' ? 'default' :
                                    invoice.status === 'OVERDUE' ? 'destructive' : 'secondary'
                            } className="uppercase text-[10px]">
                                {invoice.status === 'PAID' ? 'Pago' :
                                    invoice.status === 'OVERDUE' ? 'Atrasado' : 'Aberto'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(invoice.id)}>
                                        Copiar ID
                                    </DropdownMenuItem>
                                    {invoice.status !== 'PAID' && (
                                        <>
                                            <DropdownMenuItem onClick={() => handleGetPix(invoice.id)}>
                                                <div className="flex items-center">
                                                    <span className="mr-2 text-xs">💠</span> Pix Copia e Cola
                                                </div>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handlePay(invoice.id)} disabled={isLoading}>
                                                <CreditCard className="mr-2 h-4 w-4" /> Confirmar Pagamento
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                    <DropdownMenuItem className="text-red-600">
                                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
