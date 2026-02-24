"use client"

import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

interface DashboardChartsProps {
    data: {
        name: string
        realizado: number
        previsto: number
    }[]
}

export function DashboardCharts({ data }: DashboardChartsProps) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
                <defs>
                    <linearGradient id="colorRealizado" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                <XAxis
                    dataKey="name"
                    stroke="var(--muted-foreground)"
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                    tick={{ fontSize: 12 }}
                />
                <YAxis
                    stroke="var(--muted-foreground)"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `R$${value / 1000}k`}
                    tick={{ fontSize: 12 }}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                        color: 'var(--foreground)',
                        borderRadius: '0.75rem',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                    }}
                    itemStyle={{ color: 'var(--foreground)' }}
                    labelStyle={{ color: 'var(--muted-foreground)' }}
                    formatter={(value: any, name: any) => {
                        const val = typeof value === 'number' ? value : 0;
                        const label = name === 'realizado' ? 'Realizado (Pago)' : 'Previsto (A Vencer/Vencido)';
                        return [
                            `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                            label
                        ]
                    }}
                />
                <Legend iconType="circle" />
                <Area
                    type="monotone"
                    dataKey="realizado"
                    name="realizado"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorRealizado)"
                    strokeWidth={2}
                />
                <Line
                    type="monotone"
                    dataKey="previsto"
                    name="previsto"
                    stroke="var(--muted-foreground)"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2 }}
                />
            </ComposedChart>
        </ResponsiveContainer>
    )
}
