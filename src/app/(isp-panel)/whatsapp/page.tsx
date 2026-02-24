"use client"

import { WhatsAppConnect } from "@/modules/whatsapp/components/whatsapp-connect"
import {
    MessageCircle,
    Mail,
    Smartphone,
    Save,
    Loader2,
    Eye,
    Type,
    Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState } from "react"

export default function WhatsappPage() {
    const [isSaving] = useState(false);

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600/10 flex items-center justify-center">
                        <MessageCircle className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-foreground">WhatsApp Business</h2>
                        <p className="text-xs text-muted-foreground font-medium">Central de comunicação com seus clientes.</p>
                    </div>
                </div>
                <Button disabled={isSaving} className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 gap-2">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar Alterações
                </Button>
            </div>

            <Tabs defaultValue="connection" className="flex-1 flex flex-col p-0 overflow-hidden">
                <div className="px-8 pt-4 bg-muted/10 border-b border-border">
                    <TabsList className="bg-transparent border-none gap-8 h-12 p-0">
                        <TabsTrigger
                            value="connection"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest px-0 pb-3 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400"
                        >
                            Conexão
                        </TabsTrigger>
                        <TabsTrigger
                            value="notifications"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest px-0 pb-3 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400"
                        >
                            Notificações
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-auto p-8">
                    <TabsContent value="connection" className="m-0 space-y-6 focus-visible:ring-0">
                        {/* 1. WhatsApp Connection */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="rounded-full bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">1</Badge>
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Status da Instância</h3>
                            </div>

                            <WhatsAppConnect />
                        </section>
                    </TabsContent>

                    <TabsContent value="notifications" className="m-0 space-y-10 focus-visible:ring-0">
                        {/* 2. Channels */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="rounded-full bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">1</Badge>
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Canais de Entrega</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="border-none bg-emerald-500/10 rounded-2xl shadow-none p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <MessageCircle className="h-5 w-5 text-emerald-600" />
                                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">WhatsApp</span>
                                        </div>
                                        <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none">ATIVO</Badge>
                                    </div>
                                </Card>
                                <Card className="border-none bg-muted/50 rounded-2xl shadow-none p-4 opacity-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Mail className="h-5 w-5 text-muted-foreground" />
                                            <span className="text-sm font-bold text-muted-foreground">E-mail</span>
                                        </div>
                                        <Badge variant="outline" className="border-slate-300">EM BREVE</Badge>
                                    </div>
                                </Card>
                                <Card className="border-none bg-muted/50 rounded-2xl shadow-none p-4 opacity-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Smartphone className="h-5 w-5 text-muted-foreground" />
                                            <span className="text-sm font-bold text-muted-foreground">SMS</span>
                                        </div>
                                        <Badge variant="outline" className="border-slate-300">EM BREVE</Badge>
                                    </div>
                                </Card>
                            </div>
                        </section>

                        <Separator className="bg-border" />

                        {/* 3. Templates */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="rounded-full bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">2</Badge>
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Templates Automáticos</h3>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <Label className="text-sm font-bold flex items-center gap-2">
                                            <Type className="h-4 w-4 text-emerald-500" /> Lembrete de Fatura
                                        </Label>
                                        <Textarea
                                            className="min-h-[160px] rounded-2xl border-input focus:ring-emerald-500 bg-muted/30"
                                            defaultValue="Olá, *{{nome}}*! 👋\n\nSua fatura de *{{mes}}* já está disponível.\n\n💰 *Valor:* R$ {{valor}}\n📅 *Vencimento:* {{vencimento}}\n\nPara pagar agora via *PIX*, acesse sua Central do Assinante."
                                        />
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {["nome", "mes", "valor", "vencimento", "link_pix"].map(tag => (
                                                <code key={tag} className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground">
                                                    {"{{"}{tag}{"}}"}
                                                </code>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-4">
                                        <Label className="text-sm font-bold flex items-center gap-2">
                                            <Zap className="h-4 w-4 text-emerald-500" /> Regras de Automação
                                        </Label>
                                        <Card className="border-none bg-muted/30 rounded-2xl shadow-none">
                                            <CardContent className="p-5 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-bold text-foreground">Notificar ao gerar fatura</p>
                                                    <Switch defaultChecked />
                                                </div>
                                                <div className="flex items-center justify-between border-t border-border pt-4">
                                                    <p className="text-xs font-bold text-foreground">Aviso 2 dias antes do vencimento</p>
                                                    <Switch defaultChecked />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-sm font-bold flex items-center gap-2">
                                        <Eye className="h-4 w-4 text-emerald-500" /> Pré-visualização Real
                                    </Label>
                                    <div className="bg-[#E4DDD6] dark:bg-slate-950 rounded-3xl p-6 min-h-[300px] relative overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
                                        <div className="bg-white dark:bg-[#075E54] rounded-2xl p-4 shadow-sm max-w-[85%] text-[13px] relative animate-in fade-in slide-in-from-bottom-2">
                                            <p className="whitespace-pre-wrap dark:text-white">
                                                Olá, *João*! 👋<br /><br />
                                                Sua fatura de *Janeiro* já está disponível.<br /><br />
                                                💰 *Valor:* R$ 99.90<br />
                                                📅 *Vencimento:* 10/06/2026<br /><br />
                                                Para pagar agora via *PIX*, acesse sua Central do Assinante.
                                            </p>
                                            <span className="text-[10px] text-slate-400 dark:text-emerald-200/50 absolute bottom-1 right-3">14:20</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}
