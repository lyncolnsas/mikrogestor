export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, FileText, Filter, Plus } from "lucide-react"
import { InvoiceList } from "./invoice-list"
import { getInvoicesAction } from "@/modules/financial/actions/invoice-actions"

export default async function InvoicesPage() {
    const result = await getInvoicesAction();
    const invoices = result.data || [];

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">Faturas & Cobranças</h1>
                    <p className="text-muted-foreground mt-1">Gerencie o ciclo de vida financeiro dos seus assinantes.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2 rounded-xl font-bold border-2">
                        <Filter className="h-4 w-4" /> Filtrar
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2 shadow-lg shadow-indigo-500/20 rounded-xl font-bold">
                        <Plus className="h-4 w-4" /> Nova Fatura
                    </Button>
                </div>
            </div>

            <Card className="border-border shadow-md bg-card rounded-2xl overflow-hidden">
                <CardHeader className="bg-muted/20 border-b border-border p-6">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar por cliente, ID ou valor..."
                                className="pl-9 bg-background rounded-xl border-input"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {invoices.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <h3 className="text-lg font-bold text-foreground">Nenhuma fatura encontrada</h3>
                            <p>Crie uma nova fatura para começar.</p>
                        </div>
                    ) : (
                        <InvoiceList invoices={invoices} />
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
