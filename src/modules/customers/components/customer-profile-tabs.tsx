"use client"

import * as React from "react"
import {
    Activity,
    CreditCard,
    FileText,
    Wifi,
    Globe,
    Smartphone,
    CheckCircle2,
    XCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { getCustomerConsumptionAction } from "@/modules/customers/actions/customer-actions"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CustomerFinancialTab } from "./customer-financial-tab"

type Tab = "connection" | "financial" | "logs" | "settings"

interface CustomerProfileTabsProps {
    customerId: string
}

export function CustomerProfileTabs({ customerId }: CustomerProfileTabsProps) {
    const [activeTab, setActiveTab] = React.useState<Tab>("connection")

    const { data: logs = [], isLoading } = useQuery({
        queryKey: ['customer-consumption', customerId],
        queryFn: async () => {
            const result = await getCustomerConsumptionAction(customerId);
            if (result.error) throw new Error(result.error);
            return result.data || [];
        }
    })

    return (
        <div className="space-y-4">
            <div className="flex border-b">
                <TabButton
                    active={activeTab === "connection"}
                    onClick={() => setActiveTab("connection")}
                    icon={<Wifi className="h-4 w-4" />}
                    label="Conexão & Rede"
                />
                <TabButton
                    active={activeTab === "financial"}
                    onClick={() => setActiveTab("financial")}
                    icon={<CreditCard className="h-4 w-4" />}
                    label="Financeiro"
                />
                <TabButton
                    active={activeTab === "logs"}
                    onClick={() => setActiveTab("logs")}
                    icon={<FileText className="h-4 w-4" />}
                    label="Logs Radius"
                />
            </div>

            <div className="min-h-[400px]">
                {activeTab === "connection" && <ConnectionTab logs={logs} isLoading={isLoading} />}
                {activeTab === "financial" && <CustomerFinancialTab customerId={customerId} />}
                {activeTab === "logs" && <LogsTab logs={logs} isLoading={isLoading} />}
            </div>
        </div>
    )
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
        >
            {icon}
            {label}
        </button>
    )
}

function ConnectionTab({ logs, isLoading }: { logs: any[], isLoading: boolean }) {
    const latestLog = logs[0];
    const totalDownload = logs.reduce((acc, l) => acc + l.download, 0);
    const totalGB = (totalDownload / (1024 * 1024 * 1024)).toFixed(2);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="md:col-span-2 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <StatCard label="IP Atual" value={latestLog?.ip || "OFFLINE"} icon={<Globe className="h-4 w-4 text-blue-500" />} />
                    <StatCard label="MAC Address" value="N/A" icon={<Smartphone className="h-4 w-4 text-blue-500" />} />
                    <StatCard label="Sessão Atual" value={latestLog?.duration ? `${Math.floor(latestLog.duration / 3600)}h` : "0h"} icon={<Activity className="h-4 w-4 text-emerald-500" />} />
                    <StatCard label="Consumo (Logs)" value={`${totalGB} GB`} icon={<Activity className="h-4 w-4 text-emerald-500" />} />
                </div>
            </div>

            <div className="bg-card border rounded-lg p-6">
                <h3 className="font-semibold mb-4">Status da Sessão</h3>
                <div className="space-y-4">
                    {isLoading ? <Skeleton className="h-20 w-full" /> : logs.slice(0, 3).map((log, i) => (
                        <div key={i} className="flex gap-3">
                            {log.end ? <XCircle className="h-5 w-5 text-rose-500 shrink-0" /> : <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />}
                            <div>
                                <p className="text-sm font-medium">{log.end ? `Conexão encerrada: ${log.cause}` : "Sessão Ativa"}</p>
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(log.start), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function LogsTab({ logs, isLoading }: { logs: any[], isLoading: boolean }) {
    if (isLoading) return <div className="p-8 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>

    return (
        <div className="bg-card border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                    <tr>
                        <th className="px-4 py-3 text-left">Início</th>
                        <th className="px-4 py-3 text-left">Fim</th>
                        <th className="px-4 py-3 text-left">Duração</th>
                        <th className="px-4 py-3 text-right">Download</th>
                        <th className="px-4 py-3 text-right">Upload</th>
                        <th className="px-4 py-3 text-left">IP</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {logs.map((log) => (
                        <tr key={log.id}>
                            <td className="px-4 py-3">{format(new Date(log.start), "dd/MM HH:mm")}</td>
                            <td className="px-4 py-3">{log.end ? format(new Date(log.end), "dd/MM HH:mm") : "Ativa"}</td>
                            <td className="px-4 py-3">{Math.floor(log.duration / 60)} min</td>
                            <td className="px-4 py-3 text-right">{(log.download / (1024 * 1024)).toFixed(1)} MB</td>
                            <td className="px-4 py-3 text-right">{(log.upload / (1024 * 1024)).toFixed(1)} MB</td>
                            <td className="px-4 py-3 font-mono text-xs">{log.ip}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
    return (
        <div className="bg-card border rounded-lg p-4 flex items-center justify-between">
            <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{label}</p>
                <p className="text-lg font-bold mt-1 font-mono">{value}</p>
            </div>
            <div className="h-10 w-10 bg-muted flex items-center justify-center rounded-lg">
                {icon}
            </div>
        </div>
    )
}
