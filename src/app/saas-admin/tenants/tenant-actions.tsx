"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Lock, Unlock, VenetianMask } from "lucide-react";
import { blockTenantAction, unblockTenantAction, getTenantFullDataAction, deleteTenantAction } from "@/modules/saas/actions/tenant-management.actions";
import { impersonateTenantAction } from "@/modules/saas/actions/impersonate.actions";
import { regenerateVpnTunnelAction } from "@/modules/saas/actions/vpn-server.actions";
import { toast } from "sonner";
import { useState } from "react";
import { EditTenantModal, TenantData } from "@/modules/saas/components/edit-tenant-modal";
import { RefreshCw, ShieldCheck } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { VpnDeviceManager } from "@/modules/network/components/vpn-device-manager";
import { getVpnDevicesAction } from "@/modules/saas/actions/vpn-access.actions";

interface Plan {
    id: string;
    name: string;
    monthlyPrice: string | number | { toString(): string };
}

interface TenantActionsProps {
    tenantId: string;
    status: string;
    name: string;
    plans: Plan[];
}

export function TenantActions({ tenantId, status, name, plans }: TenantActionsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isVpnModalOpen, setIsVpnModalOpen] = useState(false);
    const [tenantData, setTenantData] = useState<TenantData | null>(null);
    const [vpnTunnels, setVpnTunnels] = useState<any[]>([]);

    const handleBlock = async () => {
        if (!confirm(`Tem certeza que deseja BLOQUEAR o acesso de ${name}?`)) return;
        setIsLoading(true);
        try {
            const res = await blockTenantAction(tenantId, "Bloqueio manual via Admin");
            if (res.error) throw new Error(res.error);
            toast.success("Tenant bloqueado com sucesso");
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Ocorreu um erro ao bloquear.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnblock = async () => {
        if (!confirm(`Deseja desbloquear ${name}?`)) return;
        setIsLoading(true);
        try {
            const res = await unblockTenantAction(tenantId);
            if (res.error) throw new Error(res.error);
            toast.success("Tenant desbloqueado com sucesso");
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Ocorreu um erro ao desbloquear.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`⚠️ PERIGO: Tem certeza que deseja EXCLUIR DEFINITIVAMENTE o provedor ${name}? \n\nEsta ação apagará TODOS os dados, clientes e configurações. Não pode ser desfeita.`)) return;

        // Double confirmation for safety
        if (!confirm(`Confirmação final: Apagar ${name}?`)) return;

        setIsLoading(true);
        try {
            const res = await deleteTenantAction(tenantId);
            if (res.error) throw new Error(res.error);
            toast.success("Tenant excluído com sucesso");
            // Force page reload to update the list
            setTimeout(() => window.location.reload(), 1000);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Erro ao excluir tenant.");
            setIsLoading(false);
        }
    };

    const handleImpersonate = async () => {
        setIsLoading(true);
        try {
            const res = await impersonateTenantAction(tenantId);
            if (res.error) throw new Error(res.error);
            toast.success(`Acessando como ${name}...`);
            // Redirect is handled by the server action or we force a reload
            window.location.href = "/overview";
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Erro na impersonificação.");
            setIsLoading(false);
        }
    };

    const handleOpenEdit = async () => {
        setIsLoading(true);
        try {
            const res = await getTenantFullDataAction(tenantId);
            if (res.error || !res.data) throw new Error(res.error || "Dados não encontrados");
            setTenantData(res.data as TenantData);
            setIsEditModalOpen(true);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Erro ao carregar dados do tenant.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRenewVpn = async () => {
        if (!confirm(`Deseja REGENERAR as chaves VPN para ${name}? O roteador do provedor precisará ser reconfigurado.`)) return;
        setIsLoading(true);
        try {
            await regenerateVpnTunnelAction(tenantId);
            toast.success("Link VPN renovado. Novas chaves geradas.");
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Erro ao renovar VPN.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenVpnManager = async () => {
        setIsLoading(true);
        try {
            const res = await getVpnDevicesAction(tenantId);
            if (res.data) {
                setVpnTunnels(res.data);
                setIsVpnModalOpen(true);
            }
        } catch (error: unknown) {
            toast.error("Erro ao carregar dispositivos VPN.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(tenantId)}>
                        Copiar ID
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleOpenEdit} disabled={isLoading}>
                        Editar Configurações
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={handleOpenVpnManager} disabled={isLoading}>
                        <ShieldCheck className="mr-2 h-4 w-4 text-blue-600" />
                        Gerenciar Dispositivos VPN
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={handleImpersonate} disabled={isLoading}>
                        <VenetianMask className="mr-2 h-4 w-4" />
                        Acessar Painel
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {status === "BLOCKED" ? (
                        <DropdownMenuItem onClick={handleUnblock} disabled={isLoading} className="text-emerald-600 focus:text-emerald-600">
                            <Unlock className="mr-2 h-4 w-4" />
                            Desbloquear
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem onClick={handleBlock} disabled={isLoading} className="text-amber-600 focus:text-amber-600">
                            <Lock className="mr-2 h-4 w-4" />
                            Bloquear Acesso
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={handleRenewVpn} disabled={isLoading}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Renovar Link VPN
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={handleDelete} disabled={isLoading} className="text-red-700 bg-red-50 focus:bg-red-100 focus:text-red-900 font-bold">
                        Excluir Provedor
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {tenantData && (
                <EditTenantModal
                    open={isEditModalOpen}
                    onOpenChange={setIsEditModalOpen}
                    tenant={tenantData}
                    plans={plans}
                />
            )}

            <Dialog open={isVpnModalOpen} onOpenChange={setIsVpnModalOpen}>
                <DialogContent className="max-w-6xl overflow-y-auto max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-blue-600" />
                            Gerenciar Dispositivos VPN - {name}
                        </DialogTitle>
                        <DialogDescription>
                            Configure acessos adicionais para técnicos ou roteadores para este cliente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <VpnDeviceManager
                            initialTunnels={vpnTunnels}
                            tenantId={tenantId}
                            isSuperAdmin={true}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
