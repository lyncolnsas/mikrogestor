"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Power, MapPin, Phone, Mail, User, ShieldCheck } from "lucide-react"

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
        plan?: {
            name: string
        }
    }
}

export function CustomerProfileHeader({ customer }: CustomerProfileHeaderProps) {
    return (
        <div className="bg-card border rounded-xl p-6 shadow-sm mb-6">
            <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{customer.name}</h1>
                            <Badge variant={customer.status === 'ACTIVE' ? 'default' : 'destructive'} className="h-5">
                                {customer.status === 'ACTIVE' ? 'Ativo' : 'Bloqueado'}
                            </Badge>
                            <Badge variant="outline" className="h-5 text-blue-500 border-blue-500/20 bg-blue-500/5">
                                {customer.plan?.name || "Sem Plano"}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" /> {customer.email || "Sem email"}</span>
                            <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> {customer.phone || "Sem telefone"}</span>
                            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> CPF: {customer.cpfCnpj}</span>
                        </div>
                        <div className="flex gap-4 text-xs font-mono bg-muted/50 p-2 rounded mt-2">
                            <span>User: <span className="text-primary">{customer.radiusUsername}</span></span>
                            <span>Pass: <span className="text-primary">{customer.radiusPassword}</span></span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 self-start">
                    <Button variant={customer.status === 'ACTIVE' ? 'destructive' : 'default'} className="gap-2">
                        <Power className="h-4 w-4" /> {customer.status === 'ACTIVE' ? 'Bloquear Acesso' : 'Desbloquear'}
                    </Button>
                    <Button variant="outline">Editar Cadastro</Button>
                </div>
            </div>
        </div>
    )
}
