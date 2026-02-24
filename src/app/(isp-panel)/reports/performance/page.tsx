"use client"

import { NeonCard, NeonCardContent, NeonCardHeader, NeonCardTitle } from "@/components/ui/neon-card"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import {
    Zap,
    Clock,
    CheckCircle2,
    Users,
    Medal,
    UserCheck
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function PerformanceReportPage() {
    const osData = [
        { type: 'Instalação', count: 42, avgTime: '1h 45m', color: 'oklch(0.65 0.18 250)' },
        { type: 'Reparo', count: 28, avgTime: '55m', color: 'oklch(0.7 0.15 150)' },
        { type: 'Retirada', count: 12, avgTime: '30m', color: 'oklch(0.8 0.12 80)' },
        { type: 'Configuração', count: 8, avgTime: '20m', color: 'oklch(0.6 0.18 320)' },
    ];

    const technicianRanking = [
        { name: "Ricardo Santos", finished: 34, score: 9.8, avatar: "RS" },
        { name: "Felipe Oliveira", finished: 29, score: 9.5, avatar: "FO" },
        { name: "Marcos Lima", finished: 22, score: 9.2, avatar: "ML" },
    ];

    return (
        <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-700 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic text-primary">Performance de Campo</h1>
                    <p className="text-muted-foreground mt-1 font-medium">Métricas de eficiência, tempo médio e satisfação por técnico.</p>
                </div>
                <div className="flex gap-3">
                    <Badge variant="outline" className="bg-muted/5 border-border rounded-lg px-3 py-1.5 h-auto text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Últimos 30 Dias</Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiSmall title="Média de Finalização" value="52 min" sub="VS 68 min mensal" icon={<Clock className="text-primary" />} />
                <KpiSmall title="OS Concluídas" value="94" sub="+12% em relação a Março" icon={<CheckCircle2 className="text-emerald-500" />} />
                <KpiSmall title="Ativações Hoje" value="6" sub="Meta diária: 8" icon={<Zap className="text-amber-500" />} />
                <KpiSmall title="Taxa de Retorno" value="2.1%" sub="Reparos na mesma semana" icon={<UserCheck className="text-destructive" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <NeonCard className="lg:col-span-8 overflow-hidden">
                    <NeonCardHeader className="p-8 border-b border-border bg-muted/5 flex flex-row items-center justify-between">
                        <div>
                            <NeonCardTitle className="text-xl font-black uppercase tracking-tight">Volume por Tipo de OS</NeonCardTitle>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">Comparativo de carga de trabalho e tempo médio.</p>
                        </div>
                        <Users className="h-5 w-5 text-muted-foreground/50" />
                    </NeonCardHeader>
                    <NeonCardContent className="h-[400px] p-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={osData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="type"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fontWeight: 800, fill: '#64748B' }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                    contentStyle={{
                                        backgroundColor: '#0f172a',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)'
                                    }}
                                    itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                                />
                                <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24}>
                                    {osData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </NeonCardContent>
                </NeonCard>

                <NeonCard className="lg:col-span-4 flex flex-col overflow-hidden">
                    <NeonCardHeader className="p-8 border-b border-border bg-muted/5">
                        <NeonCardTitle className="text-xl font-black flex items-center gap-2 uppercase tracking-tight">
                            <Medal className="h-6 w-6 text-amber-500" /> Ranking Técnico
                        </NeonCardTitle>
                    </NeonCardHeader>
                    <NeonCardContent className="p-0 flex-1 flex flex-col">
                        <div className="divide-y divide-border flex-1">
                            {technicianRanking.map((tech, i) => (
                                <div key={tech.name} className="p-6 flex items-center justify-between hover:bg-muted/10 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-black text-muted-foreground uppercase opacity-40">#{i + 1}</span>
                                        <div className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center font-black text-primary text-xs border border-border shadow-sm group-hover:border-primary/30 transition-all">
                                            {tech.avatar}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-foreground group-hover:text-primary transition-colors">{tech.name}</p>
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{tech.finished} OS FINALIZADAS</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-primary italic leading-none">{tech.score}</p>
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mt-1">NPS Score</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 mt-auto border-t border-border bg-muted/5">
                            <Button variant="ghost" className="w-full rounded-xl font-black text-[10px] uppercase tracking-widest h-11 border border-border hover:bg-muted/10 italic">Relatório Individual</Button>
                        </div>
                    </NeonCardContent>
                </NeonCard>
            </div>
        </div>
    )
}

function KpiSmall({ title, value, sub, icon }: { title: string, value: string, sub: string, icon: React.ReactNode }) {
    return (
        <NeonCard>
            <NeonCardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="h-10 w-10 rounded-xl bg-muted/20 flex items-center justify-center border border-border">
                        {icon}
                    </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</p>
                <h3 className="text-2xl font-black mt-1 text-foreground italic">{value}</h3>
                <p className="text-[10px] font-bold text-muted-foreground/60 mt-1 uppercase tracking-tight">{sub}</p>
            </NeonCardContent>
        </NeonCard>
    )
}
