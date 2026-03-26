"use client"

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    generateVouchersAction, 
    getVouchersAction, 
    deleteVoucherAction 
} from "../actions/hotspot-voucher.actions";
import { 
    Ticket, 
    Plus, 
    Trash2, 
    Download, 
    Loader2, 
    CheckCircle2, 
    Clock, 
    Zap,
    Filter,
    Search,
    Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter,
    DialogTrigger
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function HotspotVoucherManager() {
    const queryClient = useQueryClient();
    const [isGenerating, setIsGenerating] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    // Form Stats
    const [voucherCount, setVoucherCount] = useState(10);
    const [duration, setDuration] = useState(60); // 1 hour
    const [dataLimit, setDataLimit] = useState(0); // 0 = unlimited

    const { data: vouchers, isLoading } = useQuery({
        queryKey: ["hotspot-vouchers"],
        queryFn: () => getVouchersAction()
    });

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const res = await generateVouchersAction({
                count: voucherCount,
                duration: duration,
                dataLimitGb: dataLimit > 0 ? dataLimit : undefined
            });

            if (res.data?.success) {
                toast.success(res.data.message);
                queryClient.invalidateQueries({ queryKey: ["hotspot-vouchers"] });
                // Reset form or close dialog if we add one
            } else {
                toast.error(res.error || "Erro ao gerar vouchers");
            }
        } catch (err) {
            toast.error("Erro crítico ao gerar vouchers");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir este voucher permanentemente?")) return;
        try {
            const res = await deleteVoucherAction(id);
            if (res.data?.success) {
                toast.success("Voucher removido");
                queryClient.invalidateQueries({ queryKey: ["hotspot-vouchers"] });
            }
        } catch (err) {
            toast.error("Erro ao remover voucher");
        }
    };

    const filteredVouchers = (vouchers?.data || vouchers || []) as any[];
    const searchFiltered = filteredVouchers.filter(v => {
        const matchesSearch = v.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "ALL" || v.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-8">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/5 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input 
                            placeholder="Buscar código..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none pl-10 focus-visible:ring-0 font-bold"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-40 bg-white/5 border-none h-10 rounded-xl font-bold">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 text-white border-white/10 rounded-xl">
                            <SelectItem value="ALL" className="font-bold">Todos</SelectItem>
                            <SelectItem value="ACTIVE" className="font-bold">Ativos</SelectItem>
                            <SelectItem value="USED" className="font-bold">Usados</SelectItem>
                            <SelectItem value="EXPIRED" className="font-bold">Expirados</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="h-14 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black italic shadow-xl shadow-indigo-600/10 gap-2">
                            <Plus className="h-4 w-4" /> Gerar Lote de Vouchers
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-white/5 text-white max-w-md rounded-[2.5rem] p-10">
                        <DialogHeader className="space-y-4 text-center">
                            <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center border border-indigo-600/20 mb-2">
                                <Ticket className="h-6 w-6 text-indigo-400" />
                            </div>
                            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Gerar Novos Vouchers</DialogTitle>
                            <DialogDescription className="text-slate-500 text-xs font-bold leading-relaxed">
                                Crie centenas de códigos de acesso de uma só vez para vender ou distribuir aos seus clientes.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 py-6">
                            <div className="space-y-3">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Quantidade de Vouchers</Label>
                                <Input 
                                    type="number" 
                                    value={voucherCount} 
                                    onChange={(e) => setVoucherCount(Number(e.target.value))}
                                    className="h-14 bg-white/5 rounded-2xl border-white/5 font-black text-lg"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <Label className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Duração (Minutos)</Label>
                                    <Input 
                                        type="number" 
                                        value={duration} 
                                        onChange={(e) => setDuration(Number(e.target.value))}
                                        className="h-14 bg-white/5 rounded-2xl border-white/5 font-bold"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Limite Dados (GB)</Label>
                                    <Input 
                                        type="number" 
                                        value={dataLimit} 
                                        onChange={(e) => setDataLimit(Number(e.target.value))}
                                        placeholder="0 p/ ilimitado"
                                        className="h-14 bg-white/5 rounded-2xl border-white/5 font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button 
                                onClick={handleGenerate} 
                                disabled={isGenerating}
                                className="w-full h-16 rounded-3xl bg-indigo-600 font-black uppercase text-xs tracking-widest italic shadow-xl shadow-indigo-600/20"
                            >
                                {isGenerating ? <Loader2 className="animate-spin h-5 w-5 mr-3" /> : <Zap className="h-5 w-5 mr-3" />} 
                                Confirmar e Gerar Lote
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* List Table */}
            <div className="rounded-[2rem] border border-white/5 overflow-hidden bg-slate-900/40 backdrop-blur-xl">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-left">
                            <tr>
                                <th className="px-8 py-5">Código (Voucher)</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5">Duração / Dados</th>
                                <th className="px-8 py-5">Utilizado Em</th>
                                <th className="px-8 py-5 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto opacity-50" />
                                    </td>
                                </tr>
                            ) : searchFiltered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center text-slate-500 font-bold italic">
                                        Nenhum voucher encontrado.
                                    </td>
                                </tr>
                            ) : (
                                searchFiltered.map((v) => (
                                    <tr key={v.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/10 group-hover:bg-indigo-500/20 transition-all">
                                                    <Hash className="h-4 w-4 text-indigo-400" />
                                                </div>
                                                <span className="text-lg font-black italic text-indigo-400 tracking-tighter uppercase">{v.code}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <Badge variant="outline" className={cn(
                                                "text-[9px] font-black uppercase tracking-widest border-none px-3 py-1",
                                                v.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-500" :
                                                v.status === "USED" ? "bg-amber-500/10 text-amber-500" :
                                                "bg-slate-500/10 text-slate-500"
                                            )}>
                                                {v.status === "ACTIVE" ? "Disponível" : v.status === "USED" ? "Consumido" : "Expirado"}
                                            </Badge>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                                                    <Clock className="h-3 w-3 text-slate-500" /> {v.duration} min
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase italic">
                                                    <Zap className="h-3 w-3" /> {v.dataLimit ? `${(Number(v.dataLimit) / 1024 / 1024 / 1024).toFixed(1)} GB` : "ILIMITADO"}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {v.usedAt ? (
                                                <div className="text-xs font-bold text-slate-400">
                                                    {format(new Date(v.usedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black text-slate-700 italic uppercase">Aguardando...</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => handleDelete(v.id)}
                                                className="h-10 w-10 p-0 rounded-xl hover:bg-red-500/10 text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
