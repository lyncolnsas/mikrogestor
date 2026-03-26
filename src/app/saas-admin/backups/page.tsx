"use client";

import { useEffect, useState, useTransition } from "react";
import { getBackupsAction, createBackupAction, restoreBackupAction, uploadRestoreAction } from "@/modules/saas/actions/backup.actions";
import { BackupFile } from "@/modules/saas/services/backup.service";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download, Database, Plus, RotateCcw, Upload } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useRef } from "react";

export default function BackupsPage() {
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, startTransition] = useTransition();
    const [isRestoring, setIsRestoring] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadBackups();
    }, []);

    const loadBackups = async () => {
        try {
            const response = await getBackupsAction();
            if (response.error) {
                console.error("Failed to load backups:", response.error);
                return;
            }
            if (response.data) {
                // Serialize dates from server action
                setBackups(response.data.map(b => ({ ...b, createdAt: new Date(b.createdAt) })));
            }
        } catch (error) {
            console.error("Failed to load backups", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateBackup = () => {
        startTransition(async () => {
            try {
                const response = await createBackupAction();
                if (response.error) {
                    toast.error(`Erro ao criar backup: ${response.error}`);
                } else {
                    toast.success("Backup criado com sucesso!");
                    await loadBackups();
                }
            } catch (error) {
                console.error("Failed to create backup", error);
                toast.error("Erro ao criar backup");
            }
        });
    };

    const handleDownload = (filename: string) => {
        // Redireciona para o novo endpoint de streaming que lida com arquivos grandes sem travar a memória
        window.location.href = `/api/saas/backups/${encodeURIComponent(filename)}`;
    };

    const handleRestore = async (filename: string) => {
        const confirmResult = window.confirm(
            `ATENÇÃO: Você está prestes a restaurar o backup "${filename}". \n\nIsso irá SOBRESCREVER todos os dados atuais do banco de dados (Usuários, Clientes, Financeiro). \n\nEsta operação não pode ser desfeita. Deseja continuar?`
        );

        if (!confirmResult) return;

        setIsRestoring(filename);
        try {
            const response = await restoreBackupAction(filename);
            if (response.error) {
                toast.error(`Falha na restauração: ${response.error}`);
            } else {
                toast.success("Sistema restaurado com sucesso! Recomendamos fazer login novamente.");
                // Opcional: recarregar a página para limpar estados antigos de memória
                setTimeout(() => window.location.reload(), 2000);
            }
        } catch (error) {
            console.error("Restore error:", error);
            toast.error("Ocorreu um erro crítico durante a restauração.");
        } finally {
            setIsRestoring(null);
        }
    };

    const handleUploadRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const confirmResult = window.confirm(
            `ATENÇÃO: Você está prestes a SUBIR e RESTAURAR o arquivo "${file.name}". \n\nIsso irá SOBRESCREVER todos os dados atuais. Deseja continuar?`
        );
        if (!confirmResult) {
            e.target.value = "";
            return;
        }

        setIsRestoring("upload");
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await uploadRestoreAction(formData);
            if (response.error) {
                toast.error(`Falha no upload: ${response.error}`);
            } else {
                toast.success("Sistema restaurado via upload com sucesso!");
                setTimeout(() => window.location.reload(), 2000);
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Erro no processo de upload.");
        } finally {
            setIsRestoring(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Backups do Sistema</h1>
                    <p className="text-muted-foreground">Gerencie backups automáticos e manuais do banco de dados.</p>
                </div>
                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleUploadRestore}
                        accept=".sql"
                        className="hidden"
                    />
                    <Button 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!!isRestoring}
                    >
                        {isRestoring === "upload" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Subir e Restaurar
                    </Button>
                    <Button onClick={handleCreateBackup} disabled={isCreating || !!isRestoring}>
                        {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Novo Backup
                    </Button>
                </div>
            </div>

            <Card className="border-destructive/20">
                <CardHeader className="bg-destructive/5">
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <RotateCcw className="h-5 w-5" />
                        Zona de Restauração
                    </CardTitle>
                    <CardDescription>
                        Restaurar um backup substituirá TODOS os dados atuais do sistema. Use com cautela.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : backups.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            Nenhum backup disponível para restauração.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data de Criação</TableHead>
                                    <TableHead>Nome do Arquivo</TableHead>
                                    <TableHead>Tamanho</TableHead>
                                    <TableHead>Gatilho (Origem)</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {backups.map((backup) => (
                                    <TableRow key={backup.name}>
                                        <TableCell>
                                            {format(backup.createdAt, "dd/MM/yyyy HH:mm")}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs max-w-[200px] truncate">{backup.name}</TableCell>
                                        <TableCell>{formatBytes(backup.size)}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${backup.trigger?.startsWith("Auto")
                                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                                                }`}>
                                                {backup.trigger || "Desconhecido"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDownload(backup.name)}
                                                disabled={!!isRestoring}
                                            >
                                                <Download className="mr-2 h-3 w-3" />
                                                Baixar
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleRestore(backup.name)}
                                                disabled={!!isRestoring}
                                            >
                                                {isRestoring === backup.name ? (
                                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                                ) : (
                                                    <RotateCcw className="mr-2 h-3 w-3" />
                                                )}
                                                Restaurar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
