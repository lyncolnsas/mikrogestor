"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    getIpPoolsAction, 
    createIpPoolAction, 
    deleteIpPoolAction 
} from "../actions/ip-pool.actions";
import { getTenantNasList } from "../actions/nas.actions";
import { 
    Plus, 
    Trash2, 
    Database, 
    Info, 
    Loader2, 
    Save, 
    X,
    Network,
    Server
} from "lucide-react";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NeonCard, NeonCardContent, NeonCardHeader, NeonCardTitle, NeonCardDescription } from "@/components/ui/neon-card";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

export function IpPoolManager() {
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
        name: "",
        rangeStart: "",
        rangeEnd: "",
        description: "",
        nasId: undefined as number | undefined
    });

    // Queries
    const { data: pools, isLoading } = useQuery({
        queryKey: ["network-ip-pools"],
        queryFn: async () => {
            const res = await getIpPoolsAction();
            if (res.error) throw new Error(res.error || "Erro ao carregar Pools");
            return res.data;
        }
    });
    
    // NAS Query
    const { data: nasList, isLoading: isLoadingNas } = useQuery({
        queryKey: ["network-nas-list"],
        queryFn: async () => {
            const res = await getTenantNasList();
            return res || [];
        }
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const res = await createIpPoolAction(data);
            if (res.error) throw new Error(res.error);
            return res.data;
        },
        onSuccess: () => {
            toast.success("Pool de IP criado e sincronizado com o Radius!");
            setIsAdding(false);
            setFormData({ name: "", rangeStart: "", rangeEnd: "", description: "", nasId: undefined });
            queryClient.invalidateQueries({ queryKey: ["network-ip-pools"] });
        },
        onError: (err: any) => {
            toast.error(err.message || "Erro ao criar Pool");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await deleteIpPoolAction(id);
            if (res.error) throw new Error(res.error);
            return res.data;
        },
        onSuccess: () => {
            toast.success("Pool removido com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["network-ip-pools"] });
        },
        onError: (err: any) => {
            toast.error(err.message || "Erro ao remover Pool");
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest italic">Carregando Pools de IP...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Actions */}
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h3 className="text-lg font-black italic uppercase tracking-tight text-foreground">Gestão de Pools (IPAM)</h3>
                    <p className="text-xs text-muted-foreground font-medium italic">Defina as faixas de IP que o Radius enviará para seus assinantes.</p>
                </div>
                {!isAdding && (
                    <Button 
                        onClick={() => setIsAdding(true)}
                        size="sm"
                        className="rounded-xl font-black bg-primary hover:bg-primary/90 gap-2 shadow-lg italic px-6 uppercase text-[10px] tracking-wider"
                    >
                        <Plus className="h-4 w-4" /> Novo Pool
                    </Button>
                )}
            </div>

            {/* Create Form */}
            {isAdding && (
                <NeonCard className="border-border/50 bg-card/40 backdrop-blur-xl animate-in slide-in-from-top-4 duration-500 overflow-hidden">
                    <NeonCardHeader className="bg-primary/5 border-b border-primary/10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/20 rounded-lg">
                                    <Database className="h-4 w-4 text-primary" />
                                </div>
                                <NeonCardTitle className="text-sm font-black uppercase tracking-widest italic">Configurar Novo IP Pool</NeonCardTitle>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)} className="rounded-lg h-8 w-8">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </NeonCardHeader>
                    <NeonCardContent className="p-8">
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest italic text-muted-foreground">Nome do Pool (Igual ao do Plano)</Label>
                                <Input 
                                    placeholder="Ex: pool_fibra_clientes"
                                    className="h-11 rounded-xl font-mono text-sm uppercase placeholder:normal-case"
                                    value={formData.name}
                                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest italic text-muted-foreground">Nota / Descrição</Label>
                                <Input 
                                    placeholder="Ex: Clientes Planos acima de 200MB"
                                    className="h-11 rounded-xl"
                                    value={formData.description}
                                    onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest italic text-muted-foreground">Concentrador (NAS)</Label>
                                <Select 
                                    value={formData.nasId?.toString()} 
                                    onValueChange={(val) => setFormData(p => ({ ...p, nasId: parseInt(val) }))}
                                >
                                    <SelectTrigger className="h-11 rounded-xl">
                                        <SelectValue placeholder="Global (Todos os NAS)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">Global (Compatilhada)</SelectItem>
                                        {nasList?.map((nas: any) => (
                                            <SelectItem key={nas.id} value={nas.id.toString()}>
                                                {nas.shortname} ({nas.nasname})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest italic text-muted-foreground">IP Inicial</Label>
                                <Input 
                                    placeholder="Ex: 172.16.1.10"
                                    className="h-11 rounded-xl font-mono text-sm"
                                    value={formData.rangeStart}
                                    onChange={(e) => setFormData(p => ({ ...p, rangeStart: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest italic text-muted-foreground">IP Final</Label>
                                <Input 
                                    placeholder="Ex: 172.16.1.250"
                                    className="h-11 rounded-xl font-mono text-sm"
                                    value={formData.rangeEnd}
                                    onChange={(e) => setFormData(p => ({ ...p, rangeEnd: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="md:col-span-2 pt-4 flex justify-end gap-3 border-t border-border/50 border-dashed">
                                <Button type="button" variant="ghost" onClick={() => setIsAdding(false)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest italic">Cancelar</Button>
                                <Button type="submit" disabled={createMutation.isPending} className="rounded-xl font-black bg-primary h-11 px-10 gap-2 italic uppercase text-xs tracking-wider shadow-lg shadow-primary/20">
                                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Salvar e Sincronizar
                                </Button>
                            </div>
                        </form>
                    </NeonCardContent>
                </NeonCard>
            )}

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {pools?.length === 0 ? (
                    <Card className="col-span-full border-2 border-dashed border-border bg-muted/5 py-16 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mb-4">
                            <Network className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h4 className="text-sm font-black text-foreground italic uppercase">Nenhum Pool Configurado</h4>
                        <p className="text-xs text-muted-foreground max-w-xs mt-2 font-medium">
                            Configure as faixas de IP que o Radius deve distribuir automaticamente para seus clientes.
                        </p>
                    </Card>
                ) : (
                    pools?.map((pool: any) => (
                        <NeonCard key={pool.id} className="group overflow-hidden border-border/40 bg-card/60 hover:bg-card/80 transition-all duration-300">
                            <div className="h-1 bg-primary/20 group-hover:bg-primary transition-colors" />
                            <NeonCardHeader className="p-6 pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <Badge variant="outline" className="rounded-lg h-10 px-4 bg-primary/5 text-primary border-primary/20 font-black italic text-xs uppercase tracking-tighter">
                                            {pool.name}
                                        </Badge>
                                        {pool.nasId && (
                                            <div className="flex items-center gap-1.5 pl-1 pt-1">
                                                <Server className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-80">{pool.nas?.shortname || `NAS #${pool.nasId}`}</span>
                                            </div>
                                        )}
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors"
                                        onClick={() => {
                                            if(confirm(`Remover Pool "${pool.name}"? Isso também limpará as faixas no banco RADIUS.`)) {
                                                deleteMutation.mutate(pool.id);
                                            }
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <NeonCardTitle className="text-xs font-medium text-muted-foreground/70 pt-4 truncate">{pool.description || "Sem descrição"}</NeonCardTitle>
                            </NeonCardHeader>
                            <NeonCardContent className="p-6 pt-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 border border-border/50 rounded-2xl border-dashed">
                                    <div>
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 italic">IP Inicial</p>
                                        <p className="text-xs font-mono font-black text-foreground">{pool.rangeStart}</p>
                                    </div>
                                    <div className="border-l border-border/50 border-dashed pl-4">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 italic">IP Final</p>
                                        <p className="text-xs font-mono font-black text-foreground">{pool.rangeEnd}</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 px-1">
                                    <Info className="h-3 w-3 text-emerald-500" />
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase italic tracking-tighter">Sincronizado via radippool (Online)</p>
                                </div>
                            </NeonCardContent>
                        </NeonCard>
                    ))
                )}
            </div>

            {/* Dica do Provedor */}
            <div className="p-5 bg-blue-500/5 border border-blue-500/20 rounded-3xl flex items-start gap-4">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 italic">Dica de Provisionamento</p>
                    <p className="text-xs font-medium text-blue-600/80 leading-relaxed italic">
                        Ao criar um Pool aqui, o Mikrogestor gera milhares de entradas na tabela <code className="bg-blue-500/20 px-1 py-0.5 rounded text-[10px]">radippool</code>. 
                        Isso garante que o Firewall/MikroTik não precise de Pools locais, centralizando todo o controle de IP no servidor Radius.
                    </p>
                </div>
            </div>
        </div>
    );
}
