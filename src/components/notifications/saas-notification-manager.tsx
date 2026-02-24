"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Loader2,
    Plus,
    Trash2,
    Bell,
    CheckCircle2,
    Megaphone,
    AlertTriangle,
    Info,
    Search,
    Upload,
    X,
    Image as ImageIcon
} from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { createSaasNotificationAction, toggleSaasNotificationStatusAction } from "@/modules/saas/actions/notification.actions";
import { getTenantsAction } from "@/modules/saas/actions/saas-actions";
import { Checkbox } from "@/components/ui/checkbox";
// import type { NotificationType as NotificationTypeEnum, NotificationTarget as NotificationTargetEnum, SaasNotification } from "@prisma/client";

// Workaround for undefined Types/Enums from @prisma/client due to generation failure
const NotificationType = {
    MODAL: "MODAL",
    TOAST: "TOAST",
    BANNER: "BANNER"
} as const;

type NotificationTypeEnum = keyof typeof NotificationType;

const NotificationTarget = {
    ALL: "ALL",
    SPECIFIC: "SPECIFIC"
} as const;

type NotificationTargetEnum = keyof typeof NotificationTarget;

interface SaasNotification {
    id: string;
    title: string;
    message: string;
    imageUrl: string | null;
    type: NotificationTypeEnum;
    target: NotificationTargetEnum;
    targetIds?: string[];
    isActive: boolean;
    createdAt: Date;
    expiresAt: Date | null;
    // SaasNotification doesn't have tenantId field like TenantNotification might for ownership, but depends on schema
}

const formSchema = z.object({
    title: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
    message: z.string().min(10, "A mensagem deve ter pelo menos 10 caracteres"),
    imageUrl: z.string().optional(),
    type: z.nativeEnum(NotificationType),
    target: z.nativeEnum(NotificationTarget),
    targetIds: z.array(z.string()).default([]),
});

interface SaasNotificationManagerProps {
    initialNotifications: (SaasNotification & { _count: { reads: number } })[];
}

export function SaasNotificationManager({ initialNotifications }: SaasNotificationManagerProps) {
    const [notifications, setNotifications] = useState(initialNotifications);
    const [tenants, setTenants] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        const fetchTenants = async () => {
            const result = await getTenantsAction();
            if (result.data) {
                setTenants(result.data);
            }
        };
        fetchTenants();
    }, []);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            message: "",
            imageUrl: "",
            type: NotificationType.MODAL,
            target: NotificationTarget.ALL,
            targetIds: [],
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        startTransition(async () => {
            const result = await createSaasNotificationAction(values);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            if (result.data) {
                toast.success("Notificação enviada com sucesso!");
                setNotifications([
                    { ...result.data, _count: { reads: 0 } },
                    ...notifications
                ]);
                setOpen(false);
                form.reset();
            }
        });
    }

    async function toggleStatus(id: string, currentStatus: boolean) {
        startTransition(async () => {
            const result = await toggleSaasNotificationStatusAction({ id, isActive: !currentStatus });
            if (result.data) {
                setNotifications(notifications.map(n => n.id === id ? { ...n, isActive: result.data!.isActive } : n));
                toast.success(`Notificação ${!currentStatus ? 'ativada' : 'desativada'}`);
            }
        });
    }

    async function handleUpload(file: File) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("tenantId", "saas-admin"); // Special folder for saas admin uploads

        try {
            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Upload failed");
            const data = await response.json();
            form.setValue("imageUrl", data.url);
            toast.success("Imagem enviada!");
        } catch (error) {
            toast.error("Erro ao enviar imagem.");
        } finally {
            setIsUploading(false);
        }
    }

    const getTypeIcon = (type: NotificationTypeEnum) => {
        switch (type) {
            case "MODAL": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            case "TOAST": return <Info className="h-4 w-4 text-blue-500" />;
            case "BANNER": return <Megaphone className="h-4 w-4 text-purple-500" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Central de Notificações</h2>
                    <p className="text-muted-foreground">Envie alertas e comunicados para os provedores (ISPs).</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 shadow-lg hover:shadow-primary/25 transition-all">
                            <Plus className="h-4 w-4" />
                            Nova Notificação
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Criar Notificação</DialogTitle>
                            <DialogDescription>
                                Preencha os dados abaixo para enviar um comunicado aos ISPs.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Título</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: Manutenção Programada" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tipo de Exibição</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione o tipo" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="MODAL">Modal (Pop-up)</SelectItem>
                                                    <SelectItem value="TOAST">Toast (Notificação flutuante)</SelectItem>
                                                    <SelectItem value="BANNER">Banner (Cabeçalho)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Modal bloqueia a tela até ser fechado. Toast é discreto.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="message"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mensagem</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Detalhes do comunicado..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="imageUrl"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Imagem do Comunicado</FormLabel>
                                            <FormControl>
                                                <div className="space-y-2">
                                                    {field.value ? (
                                                        <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted group">
                                                            <Image
                                                                src={field.value}
                                                                alt="Preview"
                                                                fill
                                                                className="object-cover"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => field.onChange("")}
                                                                title="Remover imagem"
                                                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors border-muted-foreground/25">
                                                            {isUploading ? (
                                                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                            ) : (
                                                                <>
                                                                    <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                                                                    <span className="text-xs text-muted-foreground">Clique para fazer upload</span>
                                                                </>
                                                            )}
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) handleUpload(file);
                                                                }}
                                                            />
                                                        </label>
                                                    )}
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="target"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Alvo</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione o público" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="ALL">Todos os Provedores</SelectItem>
                                                    <SelectItem value="SPECIFIC">Provedor(es) Específico(s)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {form.watch("target") === "SPECIFIC" && (
                                    <FormField
                                        control={form.control}
                                        name="targetIds"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Selecione os Provedores</FormLabel>
                                                <div className="grid grid-cols-1 gap-2 border rounded-md p-3 max-h-[150px] overflow-y-auto">
                                                    {tenants.map((tenant) => (
                                                        <div key={tenant.id} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={tenant.id}
                                                                checked={field.value?.includes(tenant.id)}
                                                                onCheckedChange={(checked) => {
                                                                    const current = field.value || [];
                                                                    const next = checked
                                                                        ? [...current, tenant.id]
                                                                        : current.filter((id: string) => id !== tenant.id);
                                                                    field.onChange(next);
                                                                }}
                                                            />
                                                            <label htmlFor={tenant.id} className="text-sm font-medium leading-none cursor-pointer">
                                                                {tenant.name}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                                <DialogFooter>
                                    <Button type="submit" disabled={isPending}>
                                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
                                        Enviar Notificação
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        Histórico de Envios
                    </CardTitle>
                    <CardDescription>
                        Gerencie as notificações enviadas e acompanhe as visualizações.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Status</TableHead>
                                <TableHead>Título</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Alvo</TableHead>
                                <TableHead>Visualizações</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {notifications.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        Nenhuma notificação enviada.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                notifications.map((n) => (
                                    <TableRow key={n.id}>
                                        <TableCell>
                                            <Badge variant={n.isActive ? "default" : "secondary"}>
                                                {n.isActive ? "Ativa" : "Inativa"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">{n.title}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getTypeIcon(n.type)}
                                                <span className="text-xs">{n.type}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{n.target}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <CheckCircle2 className="h-3 w-3" />
                                                {n._count.reads}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(n.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => toggleStatus(n.id, n.isActive)}
                                                className="text-muted-foreground hover:text-destructive"
                                            >
                                                {n.isActive ? <Trash2 className="h-4 w-4" /> : <Plus className="h-4 w-4 rotate-45" />}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
