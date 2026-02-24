"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, ShieldCheck, Database, MessageSquare, Globe, AlertCircle, CheckCircle2, WifiOff } from "lucide-react"
import { motion } from "framer-motion"
import { SystemHealth, ServiceHealth } from "../services/health.service"

interface HealthStatusCardProps {
    health: SystemHealth | undefined;
}

export function HealthStatusCard({ health }: HealthStatusCardProps) {
    if (!health) return null;

    const services = [
        {
            name: "Banco de Dados",
            key: "database",
            icon: <Database className="h-4 w-4" />,
            data: health.database
        },
        {
            name: "Cache & Filas",
            key: "redis",
            icon: <Activity className="h-4 w-4" />,
            data: health.redis
        },
        {
            name: "Mensageria WhatsApp",
            key: "whatsapp",
            icon: <MessageSquare className="h-4 w-4" />,
            data: health.whatsapp
        },
        {
            name: "Infraestrutura VPN",
            key: "vpnServers",
            icon: <Globe className="h-4 w-4" />,
            data: health.vpnServers
        },
    ];

    return (
        <Card className="bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-3xl rounded-[32px] overflow-hidden border">
            <CardHeader className="flex flex-row items-center justify-between p-8 border-b border-slate-800/50 pb-6">
                <div>
                    <CardTitle className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        Saúde do Sistema
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    </CardTitle>
                    <p className="text-sm text-slate-400 mt-1 font-medium text-balance">Status operacional em tempo real dos serviços críticos.</p>
                </div>
                <div className="h-10 px-4 rounded-xl bg-slate-800/50 flex items-center gap-2 border border-slate-700/50 font-bold text-xs text-slate-400 hidden md:flex">
                    <ShieldCheck className="h-4 w-4 text-blue-400" />
                    SISTEMA SEGURO
                </div>
            </CardHeader>
            <CardContent className="p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {services.map((service, index) => (
                        <ServiceItem
                            key={service.key}
                            name={service.name}
                            icon={service.icon}
                            health={service.data}
                            delay={index * 0.1}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function ServiceItem({ name, icon, health, delay }: { name: string, icon: React.ReactNode, health: ServiceHealth, delay: number }) {
    const isOnline = health.status === 'ONLINE';
    const isError = health.status === 'ERROR';
    // const isOffline = health.status === 'OFFLINE';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, duration: 0.5 }}
            className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/30 transition-all group"
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${isOnline ? "bg-emerald-500/10 text-emerald-400" :
                        isError ? "bg-red-500/10 text-red-400" :
                            "bg-slate-700/10 text-slate-400"
                        }`}>
                        {icon}
                    </div>
                    <span className="font-bold text-slate-200 text-sm">{name}</span>
                </div>
                {isOnline ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : isError ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                    <WifiOff className="h-5 w-5 text-slate-500" />
                )}
            </div>

            <div className="flex items-center justify-between mt-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</span>
                <Badge className={`rounded-full px-3 py-1 text-[10px] font-black tracking-wider uppercase border-none ${isOnline ? "bg-emerald-500/10 text-emerald-400" :
                    isError ? "bg-red-500/10 text-red-400" :
                        "bg-slate-800 text-slate-500"
                    }`}>
                    {health.status}
                </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 font-medium truncate group-hover:text-slate-400 transition-colors">
                {health.message}
            </p>
        </motion.div>
    );
}
