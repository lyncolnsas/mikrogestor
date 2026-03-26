"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Power, MapPin, Phone, Mail, User, ShieldCheck, Loader2, UserCog } from "lucide-react"
import { toggleCustomerStatusAction } from "../actions/customer-actions"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import * as React from "react"
import { EditCustomerModal } from "./edit-customer-modal"

interface CustomerProfileHeaderProps {
    customer: {
        id: string
        name: string
        status: "ACTIVE" | "BLOCKED" | "CANCELLED"
        email: string
        phone: string
        cpfCnpj: string
        radiusUsername: string
        radiusPassword: string
        zipCode?: string | null
        street?: string | null
        number?: string | null
        neighborhood?: string | null
        city?: string | null
        state?: string | null
        complement?: string | null
        plan?: {
            name: string
        }
    }
}

export function CustomerProfileHeader({ customer }: CustomerProfileHeaderProps) {
    return (
        <div className="bg-card border rounded-2xl p-6 shadow-sm mb-6 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <User className="h-48 w-48 text-primary" />
            </div>
            
            <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
                <div className="flex gap-6">
                    <div className="h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-inner">
                        <User className="h-10 w-10 text-primary" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-black tracking-tight text-foreground">{customer.name}</h1>
                            <Badge variant={customer.status === 'ACTIVE' ? 'default' : 'destructive'} className="h-6 font-bold px-3">
                                {customer.status === 'ACTIVE' ? 'Ativo' : 'Bloqueado'}
                            </Badge>
                            <Badge variant="outline" className="h-6 font-bold text-primary border-primary/20 bg-primary/5 px-3">
                                {customer.plan?.name || "Sem Plano"}
                            </Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground">
                            <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary/70" /> {customer.email || "Sem email"}</span>
                            <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary/70" /> {customer.phone || "Sem telefone"}</span>
                            <span className="flex items-center gap-2 font-mono"><ShieldCheck className="h-4 w-4 text-primary/70" /> {customer.cpfCnpj}</span>
                            {customer.city && (
                                <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary/70" /> {customer.city}, {customer.state}</span>
                            )}
                        </div>

                        <div className="flex gap-4 text-xs font-bold font-mono bg-muted/60 p-3 rounded-xl border border-border mt-3 w-fit">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground uppercase text-[10px] tracking-widest">Username:</span>
                                <span className="text-primary">{customer.radiusUsername}</span>
                            </div>
                            <div className="h-4 w-px bg-border" />
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground uppercase text-[10px] tracking-widest">Senha:</span>
                                <span className="text-primary">{customer.radiusPassword}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 self-start md:self-center">
                    <StatusToggleButton customer={customer} />
                    <EditCustomerModal 
                        customer={customer as any} 
                        trigger={
                            <Button variant="outline" className="gap-2 bg-card hover:bg-muted font-bold h-11 px-6 rounded-xl border-border shadow-sm transition-all hover:scale-[1.02]">
                                <UserCog className="h-4 w-4 text-primary" />
                                Editar Cadastro
                            </Button>
                        } 
                    />
                </div>
            </div>
        </div>
    )
}

function StatusToggleButton({ customer }: { customer: any }) {
    const [isPending, setIsPending] = React.useState(false)
    const queryClient = useQueryClient()

    const handleToggle = async () => {
        try {
            setIsPending(true)
            const newStatus = customer.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE'
            const result = await toggleCustomerStatusAction({ customerId: customer.id, status: newStatus })
            
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(`Cliente ${newStatus === 'ACTIVE' ? 'desbloqueado' : 'bloqueado'} com sucesso!`)
                queryClient.invalidateQueries({ queryKey: ['customer', customer.id] })
                queryClient.invalidateQueries({ queryKey: ['customers'] })
            }
        } catch (error: any) {
            toast.error(error.message || "Erro ao alterar status")
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Button 
            variant={customer.status === 'ACTIVE' ? 'destructive' : 'default'} 
            className={cn(
                "gap-2 font-bold h-11 px-6 rounded-xl transition-all shadow-sm",
                customer.status === 'ACTIVE' ? "hover:bg-rose-600" : "hover:bg-primary/90",
                !isPending && "hover:scale-[1.02]"
            )}
            onClick={handleToggle}
            disabled={isPending}
        >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Power className="h-4 w-4" />}
            {customer.status === 'ACTIVE' ? 'Bloquear Acesso' : 'Desbloquear'}
        </Button>
    )
}
