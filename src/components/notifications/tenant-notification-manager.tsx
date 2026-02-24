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
    Search
} from "lucide-react";
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

import { createTenantNotificationAction, deleteTenantNotificationAction } from "@/modules/customers/actions/notification.actions";
// import type { NotificationType as NotificationTypeEnum, NotificationTarget as NotificationTargetEnum, TenantNotification } from "@prisma/client";

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

interface TenantNotification {
    id: string;
    title: string;
    message: string;
    imageUrl: string | null;
    type: NotificationTypeEnum;
    targetType: NotificationTargetEnum;
    targetId: string | null;
    isActive: boolean;
    createdAt: Date;
    expiresAt: Date | null;
    tenantId: string;
}

const formSchema = z.object({
    title: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
    message: z.string().min(10, "A mensagem deve ter pelo menos 10 caracteres"),
    imageUrl: z.string().optional(),
    type: z.nativeEnum(NotificationType),
    targetType: z.nativeEnum(NotificationTarget),
    targetId: z.string().optional(),
});

interface TenantNotificationManagerProps {
    initialNotifications: (TenantNotification & { _count: { reads: number } })[];
}

export function TenantNotificationManager({ initialNotifications }: TenantNotificationManagerProps) {
    const [notifications, setNotifications] = useState(initialNotifications);
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            message: "",
            imageUrl: "",
            type: NotificationType.MODAL,
            targetType: NotificationTarget.ALL,
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        startTransition(async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await createTenantNotificationAction(values) as any;
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

    async function handleDelete(id: string) {
        startTransition(async () => {
            const result = await deleteTenantNotificationAction({ id });
            if (result.data) {
                setNotifications(notifications.filter(n => n.id !== id));
                toast.success("Notificação excluída com sucesso");
            }
        });
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
                    <h2 className="text-2xl font-bold tracking-tight">Comunicações com Assinantes</h2>
                    <p className="text-muted-foreground">Envie alertas e avisos diretamente para o portal do assinante.</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 shadow-lg hover:shadow-primary/25 transition-all">
                            <Plus className="h-4 w-4" />
                            Nova Comunicação
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Criar Comunicado</DialogTitle>
                            <DialogDescription>
                                O assinante verá esta mensagem ao acessar o portal ou via notificação.
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
                                                <Input placeholder="Ex: Manutenção na Rede" {...field} />
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
                                                    <SelectItem value="MODAL">Modal (Pop-up Obrigatório)</SelectItem>
                                                    <SelectItem value="TOAST">Toast (Discreto)</SelectItem>
                                                </SelectContent>
                                            </Select>
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
                                            <FormLabel>URL da Imagem (Opcional)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="targetType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Quem deve receber?</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione o público" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="ALL">Todos os Assinantes</SelectItem>
                                                    <SelectItem value="SPECIFIC">Assinante Específico (ID)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button type="submit" disabled={isPending}>
                                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
                                        Enviar
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
                        Comunicados enviados para seus assinantes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
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
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        Nenhum comunicado enviado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                notifications.map((n) => (
                                    <TableRow key={n.id}>
                                        <TableCell className="font-medium">{n.title}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getTypeIcon(n.type)}
                                                <span className="text-xs">{n.type}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{n.targetType}</Badge>
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
                                                onClick={() => handleDelete(n.id)}
                                                className="text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
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
