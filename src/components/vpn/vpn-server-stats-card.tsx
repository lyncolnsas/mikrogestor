
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Server, HardDrive, Cpu, Activity } from "lucide-react";

interface VpnServerStatsCardProps {
    serverName: string;
    cpu: number;
    memory: { used: number; total: number };
    disk: { used: number; total: number };
}

export function VpnServerStatsCard({ serverName, cpu, memory, disk }: VpnServerStatsCardProps) {

    // Converter bytes para GB
    const toGB = (bytes: number) => (bytes / (1024 * 1024 * 1024)).toFixed(1);

    const memPercent = (memory.used / memory.total) * 100;
    const diskPercent = (disk.used / disk.total) * 100;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Servidor: {serverName}
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4 mt-2">
                    {/* CPU */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <Cpu className="h-4 w-4 text-blue-500" />
                                <span>CPU</span>
                            </div>
                            <span className="font-bold">{cpu.toFixed(1)}%</span>
                        </div>
                        <Progress value={cpu} className="h-2" />
                    </div>

                    {/* RAM */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <Server className="h-4 w-4 text-green-500" />
                                <span>Memória</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {toGB(memory.used)} / {toGB(memory.total)} GB ({memPercent.toFixed(0)}%)
                            </span>
                        </div>
                        <Progress value={memPercent} className="h-2" />
                    </div>

                    {/* DISK */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <HardDrive className="h-4 w-4 text-orange-500" />
                                <span>Disco</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {toGB(disk.used)} / {toGB(disk.total)} GB ({diskPercent.toFixed(0)}%)
                            </span>
                        </div>
                        <Progress value={diskPercent} className="h-2" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
