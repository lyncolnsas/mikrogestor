"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createPlan, updatePlan } from "../actions/plan.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle, Edit2, X } from "lucide-react";

interface Plan {
    id: string;
    name: string;
    price: any;
    upload: number;
    download: number;
    description: string | null;
    remoteIpPool?: string | null;
    localAddress?: string | null;
    dnsPrimary?: string | null;
    dnsSecondary?: string | null;
}

const planSchema = z.object({
    name: z.string().min(2, "Nome é obrigatório"),
    price: z.coerce.number().min(0, "Preço deve ser positivo"),
    upload: z.coerce.number().int().min(1, "Mínimo 1 Mbps"),
    download: z.coerce.number().int().min(1, "Mínimo 1 Mbps"),
    description: z.string().optional().nullable(),
    remoteIpPool: z.string().optional().nullable(),
    localAddress: z.string().optional().nullable(),
    dnsPrimary: z.string().optional().nullable(),
    dnsSecondary: z.string().optional().nullable(),
});

type PlanFormValues = z.infer<typeof planSchema>;

interface PlanFormProps {
    editingPlan?: Plan | null;
    onCancel?: () => void;
}

export function PlanForm({ editingPlan, onCancel }: PlanFormProps) {
    const router = useRouter();
    const [isPending, setIsPending] = React.useState(false);

    const form = useForm<PlanFormValues>({
        resolver: zodResolver(planSchema),
        defaultValues: {
            name: "",
            price: 0,
            upload: 10,
            download: 50,
            description: "",
            remoteIpPool: "pool_default",
            localAddress: "10.0.0.1",
            dnsPrimary: "8.8.8.8",
            dnsSecondary: "8.8.4.4",
        },
    });

    React.useEffect(() => {
        if (editingPlan) {
            form.reset({
                name: editingPlan.name,
                price: Number(editingPlan.price),
                upload: editingPlan.upload,
                download: editingPlan.download,
                description: editingPlan.description || "",
                remoteIpPool: editingPlan.remoteIpPool || "pool_default",
                localAddress: editingPlan.localAddress || "10.0.0.1",
                dnsPrimary: editingPlan.dnsPrimary || "8.8.8.8",
                dnsSecondary: editingPlan.dnsSecondary || "8.8.4.4",
            });
        } else {
            form.reset({
                name: "",
                price: 0,
                upload: 10,
                download: 50,
                description: "",
                remoteIpPool: "pool_default",
                localAddress: "10.0.0.1",
                dnsPrimary: "8.8.8.8",
                dnsSecondary: "8.8.4.4",
            });
        }
    }, [editingPlan, form]);

    async function onSubmit(data: PlanFormValues) {
        setIsPending(true);
        try {
            const result = editingPlan
                ? await updatePlan(editingPlan.id, data as any)
                : await createPlan(data as any);

            if (result.success) {
                toast.success(editingPlan ? "Plano atualizado com sucesso!" : "Plano criado com sucesso!");
                if (!editingPlan) {
                    form.reset();
                }
                if (onCancel) onCancel();
            } else {
                toast.error(result.error as string);
            }
        } catch (error) {
            toast.error("Erro inesperado.");
        } finally {
            setIsPending(false);
        }
    }

    return (
        <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg flex items-center gap-2">
                    {editingPlan ? (
                        <>
                            <Edit2 className="h-5 w-5 text-primary" />
                            Editar Plano
                        </>
                    ) : (
                        <>
                            <PlusCircle className="h-5 w-5 text-primary" />
                            Novo Plano de Acesso
                        </>
                    )}
                </CardTitle>
                {editingPlan && (
                    <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome do Plano</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Fibra 100MB" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="download"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Download (Mbps)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="upload"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Upload (Mbps)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Preço Mensal (R$)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="pt-4 border-t">
                            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                <span className="w-1 h-4 bg-primary rounded-full"></span>
                                Configurações PPPoE (Radius)
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="remoteIpPool"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Remote Address Pool</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: pool_fibra" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="localAddress"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Local Address (Gateway)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: 10.0.0.1" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="dnsPrimary"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>DNS Primário</FormLabel>
                                            <FormControl>
                                                <Input placeholder="8.8.8.8" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="dnsSecondary"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>DNS Secundário</FormLabel>
                                            <FormControl>
                                                <Input placeholder="8.8.4.4" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {editingPlan && (
                                <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                                    Cancelar
                                </Button>
                            )}
                            <Button type="submit" className={editingPlan ? "flex-1" : "w-full"} disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingPlan ? "Salvar Alterações" : "Criar Plano"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
