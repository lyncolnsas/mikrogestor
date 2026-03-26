"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Lock, Loader2, Cpu, Network, Zap, History as HistoryIcon } from "lucide-react"

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
    vpnProtocol: z.enum(["L2TP", "WIREGUARD"]).default("L2TP"),
    mikrotikVersion: z.enum(["v4", "v6", "v7"]).default("v6"),
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
        vpnProtocol?: string | null;
        mikrotikVersion?: string | null;
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
            vpnProtocol: (initialData?.vpnProtocol as any) || "L2TP",
            mikrotikVersion: (initialData?.mikrotikVersion as any) || "v6",
        },
    })

    const connectionType = form.watch("connectionType")
    const vpnProtocol = form.watch("vpnProtocol")
    const mikrotikVersion = form.watch("mikrotikVersion")

    // Dynamic Validation: Version/Protocol compatibility
    React.useEffect(() => {
        // 1. If old version is selected and protocol is WireGuard -> Shift to L2TP
        if ((mikrotikVersion === "v4" || mikrotikVersion === "v6") && vpnProtocol === "WIREGUARD") {
            form.setValue("vpnProtocol", "L2TP", { shouldValidate: true })
            toast.info("L2TP selecionado: v4 e v6 não suportam WireGuard.")
        }
        
        // 2. If WireGuard is selected and version is old -> Force v7
        if (vpnProtocol === "WIREGUARD" && (mikrotikVersion === "v4" || mikrotikVersion === "v6")) {
            form.setValue("mikrotikVersion", "v7", { shouldValidate: true })
        }
    }, [mikrotikVersion, vpnProtocol, form])

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
                toast.success("Concentrador salvo com sucesso!")
                router.push("/mk-integration")
            } else {
                toast.error(result.error as string)
            }
        } catch (error: any) {
            console.error("Erro ao salvar concentrador:", error);
            toast.error("Erro inesperado ao salvar.")
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-foreground/80 font-mono">Nome Identificador</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Concentrador Centro 01" {...field} className="rounded-xl border-border bg-muted/5 focus:bg-muted/10 h-10 transition-all" />
                                </FormControl>
                                <FormDescription className="text-[11px] text-muted-foreground/60">
                                    Nome para identificação interna do MikroTik.
                                </FormDescription>
                                <FormMessage className="text-[10px] font-black text-rose-500" />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="connectionType"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-foreground/80 font-mono">Tipo de Conexão</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="rounded-xl border-border bg-muted/5 h-10 focus:ring-primary/20">
                                            <SelectValue placeholder="Selecione o tipo" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="bg-slate-950 border-white/10 text-white">
                                        <SelectItem value="DIRECT" className="focus:bg-primary/20">IP Público / Direto</SelectItem>
                                        <SelectItem value="VPN_TUNNEL" className="focus:bg-primary/20 font-black text-primary italic">Via Túnel VPN SaaS (Recomendado)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormDescription className="text-[11px] text-muted-foreground/60">
                                    Meio de comunicação entre o SaaS e o Radius.
                                </FormDescription>
                                <FormMessage className="text-[10px] font-black text-rose-500" />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="ipAddress"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground/80 font-mono">
                                    Endereço IP (NAS-IP)
                                    {connectionType === "VPN_TUNNEL" && <Badge variant="outline" className="text-[9px] font-black bg-primary/10 border-primary/20 text-primary px-1.5 h-4 italic">BLOQUEIO AUTOMÁTICO</Badge>}
                                </FormLabel>
                                <FormControl>
                                    <div className="relative group/ip">
                                        <Input
                                            placeholder="1.2.3.4"
                                            {...field}
                                            readOnly={connectionType === "VPN_TUNNEL"}
                                            className={cn(
                                                "rounded-xl border-border h-10 transition-all font-mono text-sm",
                                                connectionType === "VPN_TUNNEL" ? "bg-muted/20 pr-10 text-muted-foreground" : "bg-muted/5 focus:bg-muted/10 pr-10"
                                            )}
                                        />
                                        {connectionType === "VPN_TUNNEL" ? (
                                            <Lock className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const randomIp = Array.from({ length: 4 }, () => Math.floor(Math.random() * 254) + 1).join('.');
                                                    form.setValue("ipAddress", randomIp, { shouldValidate: true });
                                                    toast.success("IP Gerado: " + randomIp);
                                                }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all opacity-0 group-hover/ip:opacity-100"
                                                title="Gerar IP Aleatório"
                                            >
                                                <Zap className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                </FormControl>
                                <FormDescription className="text-[11px] text-muted-foreground/60">
                                    IP que o Radius receberá nas requisições.
                                </FormDescription>
                                <FormMessage className="text-[10px] font-black text-rose-500" />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="secret"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-foreground/80 font-mono">Radius Shared Secret</FormLabel>
                                <FormControl>
                                    <div className="relative group/secret">
                                        <Input type="text" placeholder="••••••••" {...field} className="rounded-xl border-border bg-muted/5 focus:bg-muted/10 h-10 transition-all font-mono pr-10" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const randomSecret = Math.random().toString(36).substring(2, 12).toUpperCase();
                                                form.setValue("secret", randomSecret, { shouldValidate: true });
                                                toast.success("Secret Gerado!");
                                            }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center hover:bg-amber-500 hover:text-white transition-all opacity-0 group-hover/secret:opacity-100"
                                            title="Gerar Secret Aleatório"
                                        >
                                            <Zap className="h-3 w-3" />
                                        </button>
                                    </div>
                                </FormControl>
                                <FormDescription className="text-[11px] text-muted-foreground/60">
                                    Deve ser idêntico ao configurado no MikroTik.
                                </FormDescription>
                                <FormMessage className="text-[10px] font-black text-rose-500" />
                            </FormItem>
                        )}
                    />
                </div>

                {/* HARDWARE DETAILS SECTION */}
                <div className="space-y-6 pt-6 border-t border-border border-dashed">
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 rounded-lg border-none font-black text-[10px] tracking-widest uppercase px-2 py-1 italic">Detalhes do Hardware</Badge>
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic opacity-50">Protocolos e Versão</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="vpnProtocol"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground/80 font-mono">
                                        <Network className="h-3 w-3" /> Protocolo de Conexão (Engine)
                                    </FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className={cn(
                                                "rounded-xl border-border bg-muted/5 h-14 focus:ring-primary/20 transition-all",
                                                field.value === "WIREGUARD" ? "ring-1 ring-emerald-500/30" : "ring-1 ring-amber-500/30"
                                            )}>
                                                <SelectValue placeholder="Selecione o protocolo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="bg-slate-950 border-white/10 text-white p-2">
                                            <SelectItem value="WIREGUARD" className="focus:bg-emerald-500/10 rounded-lg py-3 cursor-pointer group">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-black text-emerald-400 italic uppercase tracking-tighter flex items-center gap-2">
                                                        <Zap className="h-3 w-3 fill-emerald-400" /> WireGuard 3.0
                                                    </span>
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Alta Performance • Seguro • ROS v7+</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="L2TP" className="focus:bg-amber-500/10 rounded-lg py-3 cursor-pointer">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-black text-amber-500 italic uppercase tracking-tighter flex items-center gap-2">
                                                        <HistoryIcon className="h-3 w-3" /> L2TP / IPsec Legacy
                                                    </span>
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Compatibilidade Total • ROS v6 e v7</span>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription className="text-[10px] italic">
                                        {field.value === "WIREGUARD" 
                                            ? "Recomendado para novos concentradores com RouterOS 7."
                                            : "Use para dispositivos antigos ou se o WireGuard estiver bloqueado."}
                                    </FormDescription>
                                    <FormMessage className="text-[10px] font-black text-rose-500" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="mikrotikVersion"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground/80 font-mono">
                                        <Cpu className="h-3 w-3" /> Sistema (RouterOS)
                                    </FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="rounded-xl border-border bg-muted/5 h-10 focus:ring-primary/20">
                                                <SelectValue placeholder="Versão do Sistema" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="bg-slate-950 border-white/10 text-white">
                                            <SelectItem value="v7" className="focus:bg-primary/20 font-bold text-sky-400">RouterOS v7 (Recomendado)</SelectItem>
                                            <SelectItem value="v6" className="focus:bg-primary/20">RouterOS v6</SelectItem>
                                            <SelectItem value="v4" className="focus:bg-primary/20 opacity-50">RouterOS v4 (Antigo)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage className="text-[10px] font-black text-rose-500" />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* API CREDENTIALS SECTION */}
                <div className="space-y-6 pt-6 border-t border-border border-dashed">
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-primary/10 text-primary rounded-lg border-none font-black text-[10px] tracking-widest uppercase px-2 py-1 italic">Mikrotik API</Badge>
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic opacity-50">Credenciais de Gerência</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField
                            control={form.control}
                            name="apiUser"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70 font-mono">Usuário API</FormLabel>
                                    <FormControl>
                                        <Input {...field} className="rounded-xl border-border bg-muted/5 focus:bg-muted/10 h-10 transition-all font-mono" />
                                    </FormControl>
                                    <FormMessage className="text-[10px] font-black text-rose-500" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="apiPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70 font-mono">Senha API</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input type="password" {...field} className="rounded-xl border-border bg-muted/5 focus:bg-muted/10 h-10 transition-all font-mono pr-10" placeholder="••••••" />
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-[10px] font-black text-rose-500" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="apiPort"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70 font-mono">Porta API</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} className="rounded-xl border-border bg-muted/5 focus:bg-muted/10 h-10 transition-all font-mono" />
                                    </FormControl>
                                    <FormMessage className="text-[10px] font-black text-rose-500" />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8 border-t border-border/20">
                    <Button type="button" variant="link" onClick={() => router.back()} className="font-black uppercase tracking-widest text-[10px] h-12 text-muted-foreground hover:text-white transition-all italic">
                        Descartar Alterações
                    </Button>
                    <Button type="submit" variant="neon" className="h-12 px-12 font-black uppercase tracking-tighter italic shadow-xl shadow-primary/10 group" disabled={isPending}>
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-3" /> : null}
                        {isPending ? "SALVANDO..." : "SALVAR CONCENTRADOR"}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
