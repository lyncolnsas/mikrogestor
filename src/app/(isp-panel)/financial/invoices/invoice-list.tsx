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
    invoices: Array<{
        id: string;
        total: number | string;
        dueDate: string | Date;
        status: string;
        createdAt: string | Date;
        customer: {
            name: string;
            cpfCnpj: string;
        };
    }>;
}

export function InvoiceList({ invoices }: InvoiceListProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [selectedIds, setSelectedIds] = useState<string[]>([])

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
            success: (msg: string) => msg,
            error: (err: { message?: string }) => err.message || 'Erro ao gerar Pix'
        });
    }

    async function handleGenerateRemessa() {
        if (selectedIds.length === 0) return;
        
        setIsLoading(true);
        try {
            const response = await fetch('/api/financial/remittance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoiceIds: selectedIds })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Erro no servidor");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `REMESSA_${new Date().toISOString().split('T')[0]}.rem`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success("Arquivo de Remessa gerado com sucesso!");
            setSelectedIds([]);
        } catch (error: any) {
            toast.error(error.message || "Erro ao gerar remessa");
        } finally {
            setIsLoading(false);
        }
    }

    const toggleSelect = (id: string, checked: boolean) => {
        if (checked) setSelectedIds(prev => [...prev, id]);
        else setSelectedIds(prev => prev.filter((itemId: string) => itemId !== id));
    };

    return (
        <div className="space-y-4">
            {selectedIds.length > 0 && (
                <div className="p-4 bg-indigo-50 border-y border-indigo-100 flex items-center justify-between animate-in slide-in-from-top-2">
                    <span className="text-sm font-bold text-indigo-700">{selectedIds.length} fatura(s) selecionada(s)</span>
                    <Button 
                        onClick={handleGenerateRemessa} 
                        disabled={isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                    >
                        {isLoading && <MoreHorizontal className="h-4 w-4 animate-spin" />}
                        Gerar Remessa (CNAB)
                    </Button>
                </div>
            )}

            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="w-10">
                            <input 
                                type="checkbox" 
                                className="rounded border-gray-300"
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    if (e.target.checked) setSelectedIds(invoices.map(i => i.id));
                                    else setSelectedIds([]);
                                }}
                                checked={selectedIds.length === invoices.length && invoices.length > 0}
                            />
                        </TableHead>
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
                            <TableCell>
                                <input 
                                    type="checkbox" 
                                    className="rounded border-gray-300"
                                    checked={selectedIds.includes(invoice.id)}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => toggleSelect(invoice.id, e.target.checked)}
                                />
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                                {invoice.id.slice(0, 8)}...
                            </TableCell>
                            <TableCell className="font-medium text-slate-900">
                                {invoice.customer.name}
                                <div className="text-[10px] text-muted-foreground">{invoice.customer.cpfCnpj}</div>
                            </TableCell>
                            <TableCell className="font-bold text-slate-700">
                                R$ {Number(invoice.total).toFixed(2)}
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
        </div>
    )
}
