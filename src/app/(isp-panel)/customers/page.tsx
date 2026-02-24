"use client"

import * as React from "react"
import { Button } from "@/components/ui/button";
import { Search, Table as TableIcon, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CustomerTable } from "@/modules/customers/components/customer-table";
import { useSessionStore } from "@/store/use-session-store";
import { useQuery } from "@tanstack/react-query";
import { getCustomersAction } from "@/modules/customers/actions/customer-actions";
import { CreateCustomerModal } from "@/modules/customers/components/create-customer-modal";

export default function CustomerListPage() {
    const { tableDensity, setTableDensity } = useSessionStore();

    const { data: customers = [], isLoading } = useQuery({
        queryKey: ['customers'],
        queryFn: async () => {
            const result = await getCustomersAction(null);
            if (result.error) throw new Error(result.error);
            return result.data || [];
        },
    });

    return (
        <div className="p-4 md:p-6 space-y-4 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
                    <p className="text-sm text-muted-foreground">Monitoramento e gestão da base instalada.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTableDensity(tableDensity === 'normal' ? 'compact' : 'normal')}
                        className="hidden md:flex gap-2"
                    >
                        {tableDensity === 'compact' ? <LayoutGrid className="h-4 w-4" /> : <TableIcon className="h-4 w-4" />}
                        {tableDensity === 'compact' ? 'Modo Normal' : 'Modo Denso'}
                    </Button>
                    <CreateCustomerModal />
                </div>
            </div>

            <div className="flex items-center gap-4 p-2 bg-card rounded-lg border shadow-sm">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Buscar por nome, CPF ou IP..." className="pl-9 h-9 text-sm" />
                </div>
                <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-semibold bg-accent">Todos</Button>
                    <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-semibold">Ativos</Button>
                    <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-semibold">Bloqueados</Button>
                </div>
            </div>

            {isLoading ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground italic">Carregando base de clientes...</div>
            ) : (
                <CustomerTable data={customers} />
            )}
        </div>
    );
}
