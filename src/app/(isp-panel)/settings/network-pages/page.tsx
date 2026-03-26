"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Save, RotateCcw, Monitor, Smartphone, Globe, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { updateNetworkPagesAction, getNetworkPagesAction } from "@/modules/saas/actions/config.actions";

const DEFAULT_BLOCK_HTML = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aviso de Suspensão</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 flex items-center justify-center min-h-screen p-4">
    <div class="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden text-center p-8 space-y-6">
        <div class="h-20 w-20 bg-red-500 rounded-full mx-auto flex items-center justify-center animate-pulse">
            <svg class="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        </div>
        <div class="space-y-2">
            <h1 class="text-2xl font-black text-slate-900">Conexão Suspensa</h1>
            <p class="text-slate-500">Identificamos uma pendência financeira que interrompeu seu acesso temporariamente.</p>
        </div>
        <div class="bg-red-50 p-4 rounded-2xl border border-red-100 text-sm text-red-700 font-bold mb-6">
            Pague via Pix agora e reative em segundos!
        </div>
        <button class="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95">
            Abrir Central do Assinante
        </button>
        <p class="text-slate-400 text-xs mt-4">Mikrogestor - Inteligência em Conectividade</p>
    </div>
</body>
</html>
`;

export default function NetworkPagesSettings() {
    const [blockHtml, setBlockHtml] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')

    // Carregar dados existentes
    useEffect(() => {
        async function load() {
            const result = await getNetworkPagesAction({}) as any;
            if (result.data?.blockHtml) {
                setBlockHtml(result.data.blockHtml);
            } else {
                setBlockHtml(DEFAULT_BLOCK_HTML);
            }
        }
        load();
    }, []);

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const result = await updateNetworkPagesAction({ blockHtml });
            if (result.error) throw new Error(result.error);
            toast.success("Páginas de rede atualizadas com sucesso!");
        } catch (error: any) {
            toast.error(error.message || "Erro ao salvar páginas.");
        } finally {
            setIsSaving(false)
        }
    }

    const handleReset = () => {
        if (confirm("Deseja voltar para o modelo padrão do sistema? Todas as suas alterações serão perdidas.")) {
            setBlockHtml(DEFAULT_BLOCK_HTML)
            toast.info("Código resetado para o padrão.")
        }
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Páginas de Redirecionamento</h1>
                    <p className="text-slate-500">Customize o que o seu cliente vê quando for bloqueado ou receber um aviso.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={handleReset} className="font-bold gap-2">
                        <RotateCcw className="h-4 w-4" /> Resetar
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="font-bold gap-2 bg-slate-900 hover:bg-slate-800 shadow-xl">
                        {isSaving ? "Salvando..." : <><Save className="h-4 w-4" /> Salvar Alterações</>}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[600px]">
                {/* Editor Section */}
                <Card className="shadow-2xl border-none ring-1 ring-slate-100 overflow-hidden flex flex-col">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-black uppercase text-slate-500 flex items-center gap-2">
                                <Globe className="h-4 w-4" /> Editor HTML / CSS
                            </CardTitle>
                        </div>
                        <Badge variant="outline" className="bg-white text-[10px] font-black border-slate-200 uppercase">
                            HTML5 + Tailwind Compatível
                        </Badge>
                    </CardHeader>
                    <CardContent className="p-0 flex-1">
                        <textarea
                            value={blockHtml}
                            onChange={(e) => setBlockHtml(e.target.value)}
                            className="w-full h-full min-h-[500px] p-6 font-mono text-sm bg-slate-950 text-indigo-400 focus:outline-none resize-none selection:bg-indigo-500/30 line-clamp-none overflow-y-auto"
                            placeholder="Insira seu código HTML aqui..."
                            spellCheck={false}
                        />
                    </CardContent>
                </Card>

                {/* Preview Section */}
                <div className="space-y-4 flex flex-col">
                    <div className="flex items-center justify-between bg-white border border-slate-100 p-2 rounded-2xl shadow-sm ring-1 ring-slate-100/50">
                        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                            <Button
                                size="sm"
                                variant={viewMode === 'desktop' ? 'secondary' : 'ghost'}
                                onClick={() => setViewMode('desktop')}
                                className="rounded-lg px-3 gap-2"
                            >
                                <Monitor className="h-4 w-4" /> Desktop
                            </Button>
                            <Button
                                size="sm"
                                variant={viewMode === 'mobile' ? 'secondary' : 'ghost'}
                                onClick={() => setViewMode('mobile')}
                                className="rounded-lg px-3 gap-2"
                            >
                                <Smartphone className="h-4 w-4" /> Mobile
                            </Button>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-500 px-3">
                            <AlertTriangle className="h-4 w-4" /> Visualização em Tempo Real
                        </div>
                    </div>

                    <Card className={`flex-1 overflow-hidden transition-all duration-500 shadow-2xl border-none ring-1 ring-slate-100 ${viewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'}`}>
                        <div className="bg-slate-200 h-6 flex items-center px-3 gap-1">
                            <div className="h-2 w-2 rounded-full bg-slate-400" />
                            <div className="h-2 w-2 rounded-full bg-slate-400" />
                            <div className="h-2 w-2 rounded-full bg-slate-400" />
                        </div>
                        <iframe
                            className="w-full h-full min-h-[500px] bg-white border-none"
                            srcDoc={blockHtml}
                            title="Block Page Preview"
                        />
                    </Card>
                </div>
            </div>
        </div>
    )
}
