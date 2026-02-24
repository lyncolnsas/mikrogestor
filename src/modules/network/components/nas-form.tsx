"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Lock, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import { saveNas } from "../actions/nas.actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const nasSchema = z.object({
    id: z.number().optional(),
    name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
    connectionType: z.enum(["DIRECT", "VPN_TUNNEL"]),
    ipAddress: z.string().min(1, "IP é obrigatório"),
    secret: z.string().min(4, "O Radius Secret deve ter pelo menos 4 caracteres"),
    apiUser: z.string().default("admin"),
    apiPassword: z.string().optional(),
    apiPort: z.number().default(8728),
})


type NasFormValues = z.infer<typeof nasSchema>

interface NasFormProps {
    tunnelIp: string;
    initialData?: {
        id: number;
        shortname?: string | null;
        nasname: string;
        secret: string;
        description?: string | null;
        apiUser?: string | null;
        apiPassword?: string | null;
        apiPort?: number | null;
    } | null;
}

export function NasForm({ tunnelIp, initialData }: NasFormProps) {
    const router = useRouter()
    const [isPending, setIsPending] = React.useState(false)

    const form = useForm<NasFormValues>({
        resolver: zodResolver(nasSchema),
        defaultValues: {
            id: initialData?.id,
            name: initialData?.shortname || "",
            connectionType: initialData?.description?.includes("VPN_TUNNEL") ? "VPN_TUNNEL" : "DIRECT",
            ipAddress: initialData?.nasname || "",
            secret: initialData?.secret || Math.random().toString(36).substring(2, 12),
            apiUser: initialData?.apiUser || "admin",
            apiPassword: initialData?.apiPassword || "",
            apiPort: initialData?.apiPort || 8728,
        },
    })

    const connectionType = form.watch("connectionType")

    React.useEffect(() => {
        if (connectionType === "VPN_TUNNEL") {
            form.setValue("ipAddress", tunnelIp, { shouldValidate: true })
        }
    }, [connectionType, form, tunnelIp])

    const onSubmit = async (data: NasFormValues) => {
        setIsPending(true)
        try {
            const result = await saveNas(data)
            if (result.success) {
                toast.success("Concentrador cadastrado!")
                router.push("/mk-integration")
            } else {
                toast.error(result.error as string)
            }
        } catch (error: unknown) {
            console.error("Erro ao salvar concentrador:", error);
            toast.error("Erro inesperado ao salvar.")
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-foreground/80">Nome Identificador</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Concentrador Centro 01" {...field} className="rounded-xl border-border bg-muted/5 focus:bg-muted/10 h-10 transition-all" />
                                </FormControl>
                                <FormDescription className="text-[11px] text-muted-foreground">
                                    Nome para identificação interna do MikroTik.
                                </FormDescription>
                                <FormMessage className="text-[10px] font-bold text-destructive" />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="connectionType"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-foreground/80">Tipo de Conexão</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="rounded-xl border-border bg-muted/5 h-10 focus:ring-primary/20">
                                            <SelectValue placeholder="Selecione o tipo" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="bg-card border-border">
                                        <SelectItem value="DIRECT" className="focus:bg-primary/10">IP Público / Direto</SelectItem>
                                        <SelectItem value="VPN_TUNNEL" className="focus:bg-primary/10">Via Túnel VPN SaaS (Recomendado)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormDescription className="text-[11px] text-muted-foreground">
                                    Como o SaaS irá se comunicar com este MikroTik.
                                </FormDescription>
                                <FormMessage className="text-[10px] font-bold text-destructive" />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="ipAddress"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground/80">
                                    Endereço IP (NAS-IP)
                                    {connectionType === "VPN_TUNNEL" && <Badge variant="outline" className="text-[9px] font-black bg-primary/10 border-primary/20 text-primary px-1.5 h-4">BLOQUEIO AUTOMÁTICO</Badge>}
                                </FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            placeholder="1.2.3.4"
                                            {...field}
                                            readOnly={connectionType === "VPN_TUNNEL"}
                                            className={cn(
                                                "rounded-xl border-border h-10 transition-all font-mono text-sm",
                                                connectionType === "VPN_TUNNEL" ? "bg-muted/20 pr-10 text-muted-foreground" : "bg-muted/5 focus:bg-muted/10"
                                            )}
                                        />
                                        {connectionType === "VPN_TUNNEL" && (
                                            <Lock className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                                        )}
                                    </div>
                                </FormControl>
                                <FormDescription className="text-[11px] text-muted-foreground">
                                    IP que o Radius receberá nas requisições.
                                </FormDescription>
                                <FormMessage className="text-[10px] font-bold text-destructive" />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="secret"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-foreground/80">Radius Shared Secret</FormLabel>
                                <FormControl>
                                    <Input type="text" placeholder="••••••••" {...field} className="rounded-xl border-border bg-muted/5 focus:bg-muted/10 h-10 transition-all font-mono" />
                                </FormControl>
                                <FormDescription className="text-[11px] text-muted-foreground">
                                    Deve ser o mesmo configurado no menu /radius do MikroTik.
                                </FormDescription>
                                <FormMessage className="text-[10px] font-bold text-destructive" />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="space-y-4 pt-4 border-t border-border border-dashed">
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-primary/10 text-primary rounded-lg border-none font-black text-[10px] tracking-widest uppercase px-2 py-1">Mikrotik API</Badge>
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Credenciais de Gerência</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField
                            control={form.control}
                            name="apiUser"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Usuário API</FormLabel>
                                    <FormControl>
                                        <Input {...field} className="rounded-xl border-border bg-muted/5 focus:bg-muted/10 h-10 transition-all" />
                                    </FormControl>
                                    <FormMessage className="text-[10px] font-bold text-destructive" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="apiPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Senha API</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} className="rounded-xl border-border bg-muted/5 focus:bg-muted/10 h-10 transition-all" placeholder="••••••" />
                                    </FormControl>
                                    <FormMessage className="text-[10px] font-bold text-destructive" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="apiPort"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Porta API</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} className="rounded-xl border-border bg-muted/5 focus:bg-muted/10 h-10 transition-all font-mono" />
                                    </FormControl>
                                    <FormMessage className="text-[10px] font-bold text-destructive" />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-border/50">
                    <Button type="button" variant="ghost" onClick={() => router.back()} className="rounded-xl font-black uppercase tracking-widest text-[10px] h-11 px-6 text-muted-foreground hover:bg-muted/10">Cancelar</Button>
                    <Button type="submit" variant="neon" className="h-11 px-10 font-black uppercase tracking-tighter italic shadow-lg shadow-primary/20" disabled={isPending}>
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {isPending ? "SALVANDO..." : "SALVAR CONCENTRADOR"}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
