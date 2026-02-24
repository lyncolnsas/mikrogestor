"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    MapPin,
    CheckCircle2,
    ChevronRight,
    ChevronLeft,
    Loader2,
    Scan
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { activateCustomer } from "../actions/activation.actions"
import { toast } from "sonner"

type Step = "SCAN" | "LOCATION" | "PLAN" | "PROVISION" | "SUCCESS"

interface Plan {
    id: string;
    name: string;
    price: number | string;
    upload: number;
    download: number;
}

export function ActivationWizard({
    customerId,
    plans,
    customerName
}: {
    customerId: string,
    plans: Plan[],
    customerName: string
}) {
    const [step, setStep] = React.useState<Step>("SCAN")
    const [mac, setMac] = React.useState("")
    const [selectedPlan, setSelectedPlan] = React.useState<string | null>(null)
    const [location, setLocation] = React.useState<{ lat: number; lng: number } | null>(null)
    const [isCapturingLocation, setIsCapturingLocation] = React.useState(false)

    const handleNext = () => {
        if (step === "SCAN") {
            if (!mac) {
                toast.error("Por favor, informe o MAC do equipamento")
                return
            }
            setStep("LOCATION")
        }
        else if (step === "LOCATION") setStep("PLAN")
        else if (step === "PLAN") {
            if (!selectedPlan) {
                toast.error("Selecione um plano antes de continuar")
                return
            }
            startProvisioning()
        }
    }

    const handleBack = () => {
        if (step === "LOCATION") setStep("SCAN")
        else if (step === "PLAN") setStep("LOCATION")
    }

    const startProvisioning = async () => {
        setStep("PROVISION")
        try {
            const result = await activateCustomer({
                customerId,
                mac,
                planId: selectedPlan!,
                location: location || undefined
            })

            if (result.success) {
                setStep("SUCCESS")
            } else {
                toast.error(result.error as string)
                setStep("PLAN")
            }
        } catch {
            toast.error("Erro inesperado durante ativação.")
            setStep("PLAN")
        }
    }

    const captureLocation = () => {
        setIsCapturingLocation(true)
        if (!navigator.geolocation) {
            toast.error("Geolocalização não suportada neste navegador.")
            setIsCapturingLocation(false)
            return
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setIsCapturingLocation(false)
                toast.success("GPS capturado com sucesso!")
            },
            () => {
                toast.error("Erro ao obter GPS. Verifique as permissões.")
                setIsCapturingLocation(false)
            }
        )
    }

    return (
        <div className="max-w-md mx-auto h-[calc(100vh-140px)] flex flex-col justify-between p-4">
            <div className="space-y-6">
                {/* Progress Header */}
                <div className="flex justify-between items-center px-2">
                    <h2 className="text-xl font-black text-slate-900">Ativação <span className="text-slate-400 font-normal">| {customerName}</span></h2>
                    <Badge variant="outline" className="font-mono text-[10px] border-slate-200">PASS {step === "SCAN" ? "1/4" : step === "LOCATION" ? "2/4" : step === "PLAN" ? "3/4" : "4/4"}</Badge>
                </div>

                <AnimatePresence mode="wait">
                    {step === "SCAN" && (
                        <motion.div
                            key="scan"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div
                                className="aspect-square bg-slate-100 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer active:scale-95 transition-all"
                            >
                                <Scan className="h-12 w-12 text-primary/40 group-hover:scale-110 transition-transform" />
                                <p className="mt-4 text-xs text-muted-foreground font-bold uppercase tracking-widest">Escanear ONT/ONU</p>
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-active:opacity-100 transition-opacity" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">MAC do Equipamento</label>
                                <Input
                                    placeholder="EX: CC:2D:E0..."
                                    value={mac}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMac(e.target.value)}
                                    className="h-16 text-xl font-mono uppercase text-center bg-white border-2 border-slate-100 shadow-sm focus:border-primary transition-all rounded-2xl"
                                />
                            </div>
                        </motion.div>
                    )}

                    {step === "LOCATION" && (
                        <motion.div
                            key="location"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8 py-4"
                        >
                            <div className="text-center space-y-4">
                                <div className="h-24 w-24 bg-primary/10 rounded-3xl rotate-12 flex items-center justify-center mx-auto shadow-sm">
                                    <MapPin className="h-12 w-12 text-primary -rotate-12" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Geolocalização</h3>
                                    <p className="text-sm text-slate-500 mt-1 uppercase text-[10px] font-bold">Obrigatório para o mapa de CTOs</p>
                                </div>
                            </div>

                            <Button
                                className={cn(
                                    "w-full h-16 text-lg rounded-2xl gap-3 shadow-xl transition-all active:scale-95",
                                    location ? "bg-emerald-600 hover:bg-emerald-700 text-white border-none" : "bg-primary shadow-primary/20"
                                )}
                                onClick={captureLocation}
                                disabled={isCapturingLocation}
                            >
                                {isCapturingLocation ? <Loader2 className="h-6 w-6 animate-spin" /> : <MapPin className="h-6 w-6" />}
                                {location ? "GPS Capturado!" : "Capturar Coordenadas"}
                            </Button>

                            {location && (
                                <div className="text-center font-mono text-[10px] text-emerald-600 font-black bg-emerald-50 p-3 rounded-2xl border border-emerald-100 animate-in zoom-in-95">
                                    LAT: {location.lat.toFixed(6)} | LNG: {location.lng.toFixed(6)}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {step === "PLAN" && (
                        <motion.div
                            key="plan"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4 h-full"
                        >
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Escolha o Plano de Venda</h3>
                            <div className="grid gap-3 overflow-y-auto max-h-[350px] pr-1">
                                {plans.map((p) => (
                                    <PlanSelect
                                        key={p.id}
                                        label={p.name}
                                        price={`R$ ${Number(p.price).toFixed(2)}`}
                                        active={selectedPlan === p.id}
                                        onClick={() => setSelectedPlan(p.id)}
                                    />
                                ))}
                                {plans.length === 0 && (
                                    <p className="text-sm text-slate-500 p-8 text-center bg-slate-50 rounded-2xl border border-dashed">Nenhum plano disponível.</p>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {step === "PROVISION" && (
                        <motion.div
                            key="provision"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-64 space-y-8"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                                <div className="relative h-20 w-20 bg-white shadow-xl rounded-full flex items-center justify-center border border-slate-100">
                                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                </div>
                            </div>
                            <div className="text-center space-y-1">
                                <p className="font-black text-xl text-slate-900 tracking-tight">Provisionando...</p>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Sincronizando Radius e MikroTik</p>
                            </div>
                            <div className="w-full max-w-xs h-1 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: "0%" }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 4 }}
                                    className="h-full bg-primary"
                                />
                            </div>
                        </motion.div>
                    )}

                    {step === "SUCCESS" && (
                        <motion.div
                            key="success"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col items-center justify-center space-y-8 py-4"
                        >
                            <div className="h-28 w-28 bg-emerald-500 rounded-[2.5rem] rotate-12 flex items-center justify-center shadow-2xl shadow-emerald-500/40">
                                <CheckCircle2 className="h-14 w-14 text-white -rotate-12" />
                            </div>
                            <div className="text-center space-y-2">
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Sucesso!</h2>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">Cliente ativo na rede. A conexão PPPoE já deve estar subindo.</p>
                            </div>

                            <div className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 rounded-3xl p-6 space-y-4">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider">Usuário:</span>
                                    <span className="font-black text-indigo-600">t_customer_{customerId.split('-')[0]}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider">Senha:</span>
                                    <span className="font-black text-slate-900">mgestor_pwd</span>
                                </div>
                            </div>

                            <Button className="w-full h-16 rounded-2xl shadow-xl hover:shadow-primary/20 text-lg font-bold" onClick={() => window.location.href = "/technician/tasks"}>
                                Ir para Próxima Tarefa
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {step !== "PROVISION" && step !== "SUCCESS" && (
                <div className="flex gap-4 p-2">
                    {step !== "SCAN" && (
                        <Button variant="ghost" className="h-16 w-16 rounded-2xl bg-slate-100 text-slate-500" onClick={handleBack}>
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                    )}
                    <Button size="lg" className="flex-1 h-16 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20" onClick={handleNext} disabled={step === "LOCATION" && !location}>
                        {step === "PLAN" ? "Concluir Ativação" : "Avançar"} <ChevronRight className="h-5 w-5 ml-2" />
                    </Button>
                </div>
            )}
        </div>
    )
}

function PlanSelect({
    label,
    price,
    active = false,
    onClick
}: {
    label: string,
    price: string,
    active?: boolean,
    onClick: () => void
}) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "p-5 rounded-3xl border-2 transition-all cursor-pointer flex justify-between items-center group",
                active ? "border-primary bg-primary/5 shadow-md scale-[1.02]" : "border-slate-100 bg-white hover:border-slate-200"
            )}>
            <div className="flex items-center gap-3">
                <div className={cn("h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all", active ? "border-primary" : "border-slate-200")}>
                    {active && <div className="h-2 w-2 bg-primary rounded-full" />}
                </div>
                <div>
                    <p className={cn("font-bold tracking-tight", active ? "text-primary" : "text-slate-900")}>{label}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Sincronizado com Radius</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-xl font-black text-slate-900">{price}</p>
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">/Mês</p>
            </div>
        </div>
    )
}
