"use client"

import * as React from "react"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { MoreHorizontal, Power, History, UserCheck, Loader2, UserCog, ExternalLink, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import {
    unblockCustomerAction,
    kickCustomerConnectionAction,
    getCustomerRadiusLogsAction
} from "@/modules/customers/actions/customer-quick.actions"
import { deleteCustomerAction, toggleCustomerStatusAction, reSyncCustomerAction } from "@/modules/customers/actions/customer-actions"
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
import { useQueryClient } from "@tanstack/react-query"
import { EditCustomerModal } from "./edit-customer-modal"

import { CustomerStatus } from "@prisma/client"

interface Customer {
    id: string
    name: string
    cpfCnpj?: string | null
    email?: string | null
    phone?: string | null
    radiusUsername?: string | null
    radiusPassword?: string | null
    zipCode?: string | null
    street?: string | null
    number?: string | null
    neighborhood?: string | null
    city?: string | null
    state?: string | null
    complement?: string | null
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
    const queryClient = useQueryClient()
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
                    <div className="flex items-center gap-2 py-1">
                        <div className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            status === CustomerStatus.ACTIVE ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" :
                                status === CustomerStatus.BLOCKED ? "bg-rose-500" : "bg-slate-400"
                        )} />
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold text-foreground truncate">{row.getValue("name")}</span>
                            {row.original.plan && (
                                <span className="text-[10px] text-muted-foreground/80 font-medium hidden sm:inline-block">
                                    {row.original.plan.name} – {row.original.plan.download}M/{row.original.plan.upload}M
                                </span>
                            )}
                        </div>
                    </div>
                )
            }
        },
        {
            id: "pppoe",
            header: "PPPoE Login",
            cell: ({ row }) => {
                const customer = row.original
                return (
                    <div className="flex flex-col bg-muted/30 px-2 py-1 rounded-lg border border-border/50 w-fit min-w-[120px]">
                        <span className="text-xs font-mono font-black text-primary truncate tracking-tight">
                            {customer.radiusUsername || "-"}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest leading-none">
                            {customer.radiusPassword || "sem senha"}
                        </span>
                    </div>
                )
            }
        },
        {
            accessorKey: "cpfCnpj",
            header: "Documento",
            cell: ({ row }) => <span className="font-mono text-[11px] font-bold text-muted-foreground">{row.original.cpfCnpj || "-"}</span>
        },
        {
            id: "status_badge",
            header: "Financeiro",
            cell: () => (
                <Badge variant="outline" className="h-5 px-2 text-[10px] font-black uppercase border-emerald-500/20 text-emerald-600 bg-emerald-50/50">Livre</Badge>
            )
        },
        {
            id: "actions",
            header: () => <div className="text-right">Ações</div>,
            cell: ({ row }) => {
                const customer = row.original
                const isLoading = loadingAction === customer.id

                const handleToggleStatus = async () => {
                    try {
                        setLoadingAction(customer.id)
                        const newStatus = customer.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE'
                        const result = await toggleCustomerStatusAction({ customerId: customer.id, status: newStatus })
                        if (result.error) {
                            toast.error(result.error)
                        } else {
                            toast.success(`Assinante ${newStatus === 'ACTIVE' ? 'desbloqueado' : 'bloqueado'} com sucesso!`)
                            queryClient.invalidateQueries({ queryKey: ['customers'] })
                        }
                    } catch (error: any) {
                        toast.error(error.message || "Erro ao alterar status")
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
                            toast.success("Conexão renovada!")
                        }
                    } catch (error: any) {
                        toast.error(error.message || "Erro ao renovar conexão")
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

                const handleReSync = async () => {
                    try {
                        setLoadingAction(customer.id)
                        const result = await reSyncCustomerAction(customer.id)
                        if ((result as any).error) { 
                            toast.error((result as any).error) 
                        } else {
                            toast.success("Perfil sincronizado com o Radius!")
                        }
                    } catch (err: any) {
                        toast.error(err.message || "Erro na sincronização")
                    } finally {
                        setLoadingAction(null)
                    }
                }

                return (
                    <div className="text-right flex items-center justify-end gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-muted" disabled={isLoading}>
                                    <span className="sr-only">Menu</span>
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <MoreHorizontal className="h-5 w-5" />
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-xl border-border">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 py-1.5">Controle Rápido</DropdownMenuLabel>
                                <DropdownMenuItem className="gap-3 rounded-lg py-2 font-bold cursor-pointer transition-all focus:bg-primary/5 focus:text-primary" onClick={handleToggleStatus} disabled={isLoading}>
                                    <Power className={cn("h-4 w-4", customer.status === 'ACTIVE' ? "text-rose-500" : "text-emerald-500")} /> 
                                    {customer.status === 'ACTIVE' ? 'Bloquear Acesso' : 'Desbloquear'}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-3 rounded-lg py-2 font-bold cursor-pointer transition-all focus:bg-primary/5 focus:text-primary" onClick={handleReSync} disabled={isLoading}>
                                    <RefreshCw className="h-4 w-4 text-emerald-500" /> Sincronizar Radius
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-3 rounded-lg py-2 font-bold cursor-pointer transition-all focus:bg-primary/5 focus:text-primary" onClick={handleKick} disabled={isLoading}>
                                    <UserCheck className="h-4 w-4 text-blue-500" /> Kickar Conexão
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1 bg-border/50" />
                                
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 py-1.5">Gestão de Dados</DropdownMenuLabel>
                                <EditCustomerModal 
                                    customer={customer as any} 
                                    trigger={
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="gap-3 rounded-lg py-2 font-bold cursor-pointer transition-all focus:bg-primary/5 focus:text-primary" disabled={isLoading}>
                                            <UserCog className="h-4 w-4 text-primary" /> Editar Cadastro
                                        </DropdownMenuItem>
                                    } 
                                />
                                <DropdownMenuItem className="gap-3 rounded-lg py-2 font-bold cursor-pointer transition-all focus:bg-primary/5 focus:text-primary" onClick={handleViewLogs} disabled={isLoading}>
                                    <History className="h-4 w-4" /> Logs de Acesso
                                </DropdownMenuItem>
                                <Link href={`/customers/${customer.id}`}>
                                    <DropdownMenuItem className="gap-3 rounded-lg py-2 font-bold cursor-pointer transition-all focus:bg-primary/5 focus:text-primary">
                                        <ExternalLink className="h-4 w-4" /> Ficha Completa
                                    </DropdownMenuItem>
                                </Link>
                                <DropdownMenuSeparator className="my-1 bg-border/50" />
                                <DropdownMenuItem
                                    className="gap-3 rounded-lg py-2 font-bold text-rose-500 focus:text-rose-600 focus:bg-rose-50 cursor-pointer transition-all"
                                    onClick={() => setCustomerToDelete({ id: customer.id, name: customer.name })}
                                    disabled={isLoading}
                                >
                                    <Trash2 className="h-4 w-4" /> Excluir Cliente
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
                queryClient.invalidateQueries({ queryKey: ['customers'] })
            }
        } catch (error: any) {
            toast.error(error.message || "Erro ao excluir cliente")
        } finally {
            setLoadingAction(null)
            setCustomerToDelete(null)
        }
    }

    return (
        <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
            <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
                <AlertDialogContent className="rounded-3xl border-border shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black tracking-tight">Cuidado: Ação Irreversível</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium">
                            Você está prestes a excluir permanentemente o assinante <strong className="text-foreground">{customerToDelete?.name}</strong>.
                            Esta ação removerá todos os registros financeiros e acessos Radius/MikroTik.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="pt-4">
                        <AlertDialogCancel className="rounded-xl font-bold h-11 border-border">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleConfirmDelete()
                            }}
                            className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600 rounded-xl font-bold h-11 px-6 shadow-lg shadow-rose-200"
                            disabled={loadingAction === customerToDelete?.id}
                        >
                            {loadingAction === customerToDelete?.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Excluir Agora
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={logsModalOpen} onOpenChange={setLogsModalOpen}>
                <AlertDialogContent className="max-w-4xl max-h-[85vh] flex flex-col rounded-3xl border-border shadow-3xl p-0 overflow-hidden">
                    <div className="p-6 bg-muted/10 border-b border-border">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-2xl font-black tracking-tight">Histórico de Conexão - {selectedCustomer?.name}</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm font-medium">
                                Visualização das últimas sessões de PPPoE sincronizadas.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border/50 hover:bg-transparent">
                                    <TableHead className="text-[10px] uppercase font-black tracking-widest">Início</TableHead>
                                    <TableHead className="text-[10px] uppercase font-black tracking-widest text-center">Duração</TableHead>
                                    <TableHead className="text-[10px] uppercase font-black tracking-widest text-center">Download</TableHead>
                                    <TableHead className="text-[10px] uppercase font-black tracking-widest text-center">Upload</TableHead>
                                    <TableHead className="text-[10px] uppercase font-black tracking-widest">Endereço IP</TableHead>
                                    <TableHead className="text-[10px] uppercase font-black tracking-widest">Causa Encerramento</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customerLogs.length > 0 ? (
                                    customerLogs.map((log: any) => (
                                        <TableRow key={log.radacctid} className="h-12 text-[12px] font-medium border-border/40 transition-colors hover:bg-muted/5">
                                            <TableCell className="font-mono text-muted-foreground whitespace-nowrap">{new Date(log.acctstarttime).toLocaleString('pt-BR')}</TableCell>
                                            <TableCell className="text-center font-bold">{Math.floor((log.acctsessiontime || 0) / 60)}m {log.acctsessiontime % 60}s</TableCell>
                                            <TableCell className="text-center font-mono font-black text-emerald-600">
                                                {(Number(log.acctoutputoctets || 0) / (1024 * 1024)).toFixed(1)} <span className="text-[9px] uppercase">MB</span>
                                            </TableCell>
                                            <TableCell className="text-center font-mono font-black text-primary">
                                                {(Number(log.acctinputoctets || 0) / (1024 * 1024)).toFixed(1)} <span className="text-[9px] uppercase">MB</span>
                                            </TableCell>
                                            <TableCell className="font-mono text-muted-foreground">{log.framedipaddress}</TableCell>
                                            <TableCell className="text-muted-foreground italic text-[11px] truncate max-w-[120px]">{log.acctterminatecause || "-"}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <History className="h-8 w-8 opacity-20" />
                                                <p className="font-medium">Nenhum registro de conexão recente.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="p-4 bg-muted/10 border-t border-border flex justify-end">
                        <AlertDialogAction onClick={() => setLogsModalOpen(false)} className="rounded-xl font-bold h-11 px-8">Fechar Logs</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            <Table>
                <TableHeader className="bg-muted/50 border-b border-border/60">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id} className="hover:bg-transparent border-none h-11">
                            {headerGroup.headers.map((header) => (
                                <TableHead key={header.id} className={cn(
                                    "text-[10px] uppercase font-black text-muted-foreground tracking-widest",
                                    density === "compact" && "px-3"
                                )}>
                                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                className={cn(
                                    "group transition-all hover:bg-muted/10 border-border/40 h-14",
                                    density === "compact" && "h-11 border-none"
                                )}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id} className={cn(
                                        density === "compact" && "py-1 px-3"
                                    )}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground font-medium italic">
                                Nenhum assinante cadastrado ou encontrado.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
