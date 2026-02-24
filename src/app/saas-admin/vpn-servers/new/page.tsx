"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createVpnServerAction } from "@/modules/saas/actions/vpn-server.actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from "@/components/ui/form";
import { ShieldCheck, Server, Globe, Hash, Key, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

const vpnServerSchema = z.object({
    name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
    publicEndpoint: z.string().optional(),
    listenPort: z.coerce.number().int().min(1).max(65535),
    publicKey: z.string().optional(),
    capacityLimit: z.coerce.number().int().min(1, "Capacidade mínima é 1"),
});

export default function NewVpnServerPage() {
    const router = useRouter();
    const form = useForm<z.infer<typeof vpnServerSchema>>({
        resolver: zodResolver(vpnServerSchema),
        defaultValues: {
            name: "",
            publicEndpoint: "",
            listenPort: 51820,
            publicKey: "",
            capacityLimit: 100,
        },
    });

    const onSubmit = async (values: z.infer<typeof vpnServerSchema>) => {
        try {
            const res = await createVpnServerAction(values);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Servidor VPN provisionado com sucesso!");
                router.push("/saas-admin/vpn-servers");
            }
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Erro ao criar servidor");
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <Link
                        href="/saas-admin/vpn-servers"
                        className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 flex items-center gap-1 transition-colors"
                    >
                        <ArrowLeft className="h-3 w-3" /> Voltar para lista
                    </Link>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <ShieldCheck className="h-8 w-8 text-blue-600" /> Provisionar Nodo VPN
                    </h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white dark:bg-slate-950 overflow-hidden">
                                <CardHeader className="bg-slate-900 text-white p-8">
                                    <CardTitle className="text-xl font-black italic tracking-tighter uppercase">Configuração do Nodo</CardTitle>
                                    <CardDescription className="text-slate-400">Insira os detalhes técnicos do servidor WireGuard.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-10 space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-bold text-slate-700 dark:text-slate-300">Identificação do Servidor</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Server className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                        <Input placeholder="ex: Sao Paulo - Core 01" className="pl-10 h-11 rounded-xl border-slate-200" {...field} />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="publicEndpoint"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase">Endpoint Público (Opcional)</FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                            <Input placeholder="Vazio para auto-detect" className="pl-10 h-11 rounded-xl border-slate-200" {...field} />
                                                        </div>
                                                    </FormControl>
                                                    <FormDescription className="text-[10px]">O servidor reportará seu IP automaticamente no primeiro setup.</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="listenPort"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-bold text-slate-700 dark:text-slate-300">Porta UDP</FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Hash className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                            <Input type="number" className="pl-10 h-11 rounded-xl border-slate-200" {...field} />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="publicKey"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase">Chave Pública (Opcional)</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Key className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                        <Input placeholder="Vazio para auto-gerar no servidor" className="pl-10 h-11 rounded-xl border-slate-200 font-mono text-xs" {...field} />
                                                    </div>
                                                </FormControl>
                                                <FormDescription className="text-[10px]">Deixe em branco para que o servidor gere seu próprio par de chaves.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="capacityLimit"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-bold text-slate-700 dark:text-slate-300">Limite de Túneis (Capacidade)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" className="h-11 rounded-xl border-slate-200" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Button
                                        type="submit"
                                        className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-lg font-black tracking-tight shadow-xl shadow-blue-500/20 gap-3"
                                        disabled={form.formState.isSubmitting}
                                    >
                                        <Save className="h-5 w-5" />
                                        {form.formState.isSubmitting ? "Provisionando..." : "Provisionar Nodo"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </form>
                    </Form>
                </div>

                <div className="space-y-6">
                    <Card className="border-none shadow-xl rounded-3xl bg-blue-50 dark:bg-blue-900/10 p-8 border border-blue-100 dark:border-blue-900/30">
                        <h4 className="font-black text-blue-900 dark:text-blue-400 uppercase text-xs tracking-widest mb-4">Instruções Técnicas</h4>
                        <ul className="space-y-4">
                            <li className="text-sm text-blue-800/70 font-medium list-disc ml-4 leading-relaxed">
                                <b>Provisionamento sem toque:</b> Crie o nodo aqui e execute o script fornecido no VPS Linux. Ele reportará IP e Chaves automaticamente.
                            </li>
                            <li className="text-sm text-blue-800/70 font-medium list-disc ml-4 leading-relaxed">
                                Certifique-se de que a porta UDP esteja aberta no firewall da sua VPS.
                            </li>
                            <li className="text-sm text-blue-800/70 font-medium list-disc ml-4 leading-relaxed">
                                Recomendamos limitar a 250 túneis por nodo pequeno (1 vCPU) para manter a latência baixa.
                            </li>
                        </ul>
                    </Card>

                    <div className="p-8 bg-slate-100 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center space-y-2">
                        <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-950 flex items-center justify-center shadow-sm">
                            <Globe className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Conexão Global</p>
                        <p className="text-[10px] text-slate-400">Este nodo será adicionado ao pool de balanceamento automático para novos provedores.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
