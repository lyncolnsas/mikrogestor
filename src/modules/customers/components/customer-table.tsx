"use client"

import * as React from "react"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { MoreHorizontal, Power, History, UserCheck, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
    unblockCustomerAction,
    kickCustomerConnectionAction,
    getCustomerRadiusLogsAction
} from "@/modules/customers/actions/customer-quick.actions"
import { deleteCustomerAction } from "@/modules/customers/actions/customer-actions"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useSessionStore } from "@/store/use-session-store"
import { cn } from "@/lib/utils"

import { CustomerStatus } from "@prisma/client"

interface Customer {
    id: string
    name: string
    cpfCnpj?: string | null
    email?: string | null
    radiusUsername?: string | null
    radiusPassword?: string | null
    status: CustomerStatus
    plan?: {
        name: string
        download: number
        upload: number
    } | null
}

interface CustomerTableProps {
    data: Customer[]
}

export function CustomerTable({ data }: CustomerTableProps) {
    const density = useSessionStore((state) => state.tableDensity)
    const [loadingAction, setLoadingAction] = React.useState<string | null>(null)
    const [customerToDelete, setCustomerToDelete] = React.useState<{ id: string, name: string } | null>(null)

    const [logsModalOpen, setLogsModalOpen] = React.useState(false)
    const [selectedCustomer, setSelectedCustomer] = React.useState<{ id: string, name: string } | null>(null)
    const [customerLogs, setCustomerLogs] = React.useState<any[]>([])

    const columns: ColumnDef<Customer>[] = [
        {
            accessorKey: "name",
            header: "Assinante",
            cell: ({ row }) => {
                const status = row.original.status
                return (
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "h-2 w-2 rounded-full",
                            status === CustomerStatus.ACTIVE ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" :
                                status === CustomerStatus.BLOCKED ? "bg-rose-500" : "bg-slate-400"
                        )} />
                        <div>
                            <span className="font-medium block">{row.getValue("name")}</span>
                            {row.original.plan && (
                                <span className="text-[10px] text-muted-foreground hidden sm:inline-block">
                                    {row.original.plan.name} ({row.original.plan.download}M/{row.original.plan.upload}M)
                                </span>
                            )}
                        </div>
                    </div>
                )
            }
        },
        {
            id: "pppoe",
            header: "PPPoE",
            cell: ({ row }) => {
                const customer = row.original
                return (
                    <div className="flex flex-col">
                        <span className="text-xs font-mono font-bold text-blue-500">
                            {customer.radiusUsername || "-"}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                            {customer.radiusPassword || "sem senha"}
                        </span>
                    </div>
                )
            }
        },
        {
            accessorKey: "cpfCnpj",
            header: "Documento",
            cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.cpfCnpj || "-"}</span>
        },
        {
            id: "status_badge",
            header: "Status Fin.",
            cell: () => (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase border-emerald-200 text-emerald-700 bg-emerald-50">Em Dia</Badge>
            )
        },
        {
            id: "actions",
            header: () => <div className="text-right">Ações</div>,
            cell: ({ row }) => {
                const customer = row.original
                const isLoading = loadingAction === customer.id

                const handleUnblock = async () => {
                    try {
                        setLoadingAction(customer.id)
                        const result = await unblockCustomerAction(customer.id)
                        if (result.error) {
                            toast.error(result.error)
                        } else {
                            toast.success(result.data?.message || "Cliente desbloqueado com sucesso!")
                        }
                    } catch (error: any) {
                        toast.error(error.message || "Erro ao desbloquear cliente")
                    } finally {
                        setLoadingAction(null)
                    }
                }

                const handleKick = async () => {
                    try {
                        setLoadingAction(customer.id)
                        const result = await kickCustomerConnectionAction(customer.id)
                        if (result.error) {
                            toast.error(result.error)
                        } else {
                            toast.success(result.data?.message || "Conexão desconectada com sucesso!")
                        }
                    } catch (error: any) {
                        toast.error(error.message || "Erro ao desconectar cliente")
                    } finally {
                        setLoadingAction(null)
                    }
                }

                const handleViewLogs = async () => {
                    try {
                        setLoadingAction(customer.id)
                        const result = await getCustomerRadiusLogsAction({ customerId: customer.id, limit: 50 })
                        if (result.error) {
                            toast.error(result.error)
                        } else {
                            setSelectedCustomer({ id: customer.id, name: customer.name })
                            setCustomerLogs(result.data?.logs || [])
                            setLogsModalOpen(true)
                        }
                    } catch (error: any) {
                        toast.error(error.message || "Erro ao buscar logs")
                    } finally {
                        setLoadingAction(null)
                    }
                }

                return (
                    <div className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading}>
                                    <span className="sr-only">Abrir menu</span>
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <MoreHorizontal className="h-4 w-4" />
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Operações Rápidas</DropdownMenuLabel>
                                <DropdownMenuItem className="gap-2" onClick={handleUnblock} disabled={isLoading}>
                                    <Power className="h-4 w-4 text-emerald-500" /> Desbloquear
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2" onClick={handleKick} disabled={isLoading}>
                                    <UserCheck className="h-4 w-4 text-blue-500" /> Kickar Conexão
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="gap-2" onClick={handleViewLogs} disabled={isLoading}>
                                    <History className="h-4 w-4" /> Ver Logs Radius
                                </DropdownMenuItem>
                                <Link href={`/customers/${customer.id}`}>
                                    <DropdownMenuItem className="cursor-pointer">Ver Detalhes</DropdownMenuItem>
                                </Link>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="gap-2 text-rose-500 focus:text-rose-500"
                                    onClick={() => setCustomerToDelete({ id: customer.id, name: customer.name })}
                                    disabled={isLoading}
                                >
                                    <Trash2 className="h-4 w-4" /> Excluir Assinante
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ]

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    const handleConfirmDelete = async () => {
        if (!customerToDelete) return
        try {
            setLoadingAction(customerToDelete.id)
            const result = await deleteCustomerAction(customerToDelete.id)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Assinante excluído com sucesso!")
            }
        } catch (error: any) {
            toast.error(error.message || "Erro ao excluir cliente")
        } finally {
            setLoadingAction(null)
            setCustomerToDelete(null)
        }
    }

    return (
        <div className="rounded-md border bg-card shadow-sm">
            <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente o assinante <strong>{customerToDelete?.name}</strong>,
                            removerá suas credenciais do Radius e do roteador MikroTik.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loadingAction === customerToDelete?.id}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleConfirmDelete()
                            }}
                            className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
                            disabled={loadingAction === customerToDelete?.id}
                        >
                            {loadingAction === customerToDelete?.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Excluir Permanentemente
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={logsModalOpen} onOpenChange={setLogsModalOpen}>
                <AlertDialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Logs de Conexão - {selectedCustomer?.name}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Histórico recente de sessões e autenticações do Radius.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="flex-1 overflow-y-auto my-4 border rounded-md p-1">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-[10px] uppercase font-bold">Início</TableHead>
                                    <TableHead className="text-[10px] uppercase font-bold">Duração</TableHead>
                                    <TableHead className="text-[10px] uppercase font-bold text-center">DL (MB)</TableHead>
                                    <TableHead className="text-[10px] uppercase font-bold text-center">UL (MB)</TableHead>
                                    <TableHead className="text-[10px] uppercase font-bold">IP</TableHead>
                                    <TableHead className="text-[10px] uppercase font-bold">Encerrado por</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customerLogs.length > 0 ? (
                                    customerLogs.map((log: any) => (
                                        <TableRow key={log.radacctid} className="h-10 text-[12px]">
                                            <TableCell className="font-mono">{new Date(log.acctstarttime).toLocaleString('pt-BR')}</TableCell>
                                            <TableCell>{Math.floor((log.acctsessiontime || 0) / 60)} min</TableCell>
                                            <TableCell className="text-center font-mono text-emerald-600">
                                                {(Number(log.acctoutputoctets || 0) / (1024 * 1024)).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-center font-mono text-blue-600">
                                                {(Number(log.acctinputoctets || 0) / (1024 * 1024)).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="font-mono">{log.framedipaddress}</TableCell>
                                            <TableCell className="text-muted-foreground italic text-[11px]">{log.acctterminatecause || "-"}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            Nenhum log encontrado para este assinante.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setLogsModalOpen(false)}>Fechar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Table>
                <TableHeader className="bg-muted/50">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                    <TableHead key={header.id} className={cn(
                                        "text-[10px] uppercase tracking-wider font-bold h-8",
                                        density === "compact" && "h-7 px-2"
                                    )}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                )
                            })}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                className={cn(
                                    "group transition-colors",
                                    density === "compact" ? "h-8" : "h-12"
                                )}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id} className={cn(
                                        density === "compact" && "py-0.5 px-2 text-[13px]"
                                    )}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                Nenhum resultado.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
