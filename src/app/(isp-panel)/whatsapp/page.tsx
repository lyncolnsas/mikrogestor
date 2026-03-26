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
    Zap,
    Megaphone,
    AlertTriangle,
    ShieldAlert,
    Share2
} from "lucide-react"
import { useState, useEffect, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { startAnnouncementGroupAction, triggerPanicMigrationAction } from "@/modules/whatsapp/actions/broadcast.actions"
import { getSmtpConfigAction, saveSmtpConfigAction } from "@/modules/settings/actions/system-settings.actions"

export default function WhatsappPage() {
    const [isPending, startTransition] = useTransition();
    const [smtpConfig, setSmtpConfig] = useState({
        host: "smtp.gmail.com",
        port: "465",
        user: "",
        pass: "",
        subject: "Sua fatura da {{empresa}} chegou! 📡",
        body: "Olá {{nome}},<br><br>Sua fatura de {{mes}} no valor de {{valor}} já está disponível para pagamento.<br><br>Vencimento: {{vencimento}}<br><br>Você pode baixar o seu boleto ou pagar via PIX clicando no botão abaixo.<br><br>Agradecemos por ser nosso cliente!"
    });

    useEffect(() => {
        async function load() {
            const saved = await getSmtpConfigAction();
            if (saved) setSmtpConfig(saved as any);
        }
        load();
    }, []);

    const handleSaveSmtp = () => {
        startTransition(async () => {
            const res = await saveSmtpConfigAction(smtpConfig);
            if (res.success) {
                toast.success("Configurações de e-mail salvas com sucesso! 🛡️");
            } else {
                toast.error("Erro ao salvar configurações.");
            }
        });
    };

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
                <Button 
                    disabled={isPending} 
                    onClick={handleSaveSmtp}
                    className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
                        <TabsTrigger
                            value="email"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest px-0 pb-3 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400"
                        >
                            Configuração de E-mail
                        </TabsTrigger>
                        <TabsTrigger
                            value="broadcast"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-rose-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest px-0 pb-3 data-[state=active]:text-rose-700 dark:data-[state=active]:text-rose-400"
                        >
                            Transmissão & Crise
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-auto p-8">
                    {/* ... Existing contents ... */}
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card className="border-none bg-emerald-500/10 rounded-2xl shadow-none p-4 border-l-4 border-emerald-500">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <MessageCircle className="h-5 w-5 text-emerald-600" />
                                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">WhatsApp Dispatch</span>
                                        </div>
                                        <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none">ATIVO</Badge>
                                    </div>
                                </Card>
                                <Card className="border-none bg-blue-500/10 rounded-2xl shadow-none p-4 border-l-4 border-blue-500">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Mail className="h-5 w-5 text-blue-600" />
                                            <span className="text-sm font-bold text-blue-700 dark:text-blue-400">E-mail Corporativo</span>
                                        </div>
                                        <Badge className="bg-blue-500 hover:bg-blue-600 border-none">ATIVO</Badge>
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
                                            <Type className="h-4 w-4 text-emerald-500" /> Lembrete de Fatura (WhatsApp)
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
                                                    <p className="text-xs font-bold text-foreground">Aviso no dia do vencimento</p>
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

                    <TabsContent value="email" className="m-0 space-y-8 focus-visible:ring-0">
                        {/* 4. SMTP Configuration */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="rounded-full bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold">1</Badge>
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Configuração SMTP</h3>
                            </div>

                            <Card className="border-none bg-blue-500/5 rounded-3xl p-6 border-l-8 border-blue-600 shadow-2xl shadow-blue-500/5">
                                <div className="flex gap-4 items-start">
                                    <AlertTriangle className="h-10 w-10 text-blue-600 shrink-0" />
                                    <div className="space-y-3">
                                        <h4 className="font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Guia Rápido: E-mail de Cobrança Profissional</h4>
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                            O sistema enviará e-mails em nome do seu Provedor. Recomendamos criar uma conta Google exclusiva para cobrança.<br />
                                            <b>Exemplo de Nome:</b> financeiro.<b>NomedoProvedor</b>@gmail.com
                                        </p>
                                        <div className="pt-2">
                                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2 underline decoration-blue-500 underline-offset-4">Passo a Passo para o ISP:</p>
                                            <ol className="text-[11px] text-slate-500 space-y-1 list-decimal pl-4">
                                                <li>Ative a <b>Verificação em 2 Etapas</b> na sua conta Google.</li>
                                                <li>Acesse o link abaixo para gerar sua <b>Senha de App</b>:</li>
                                            </ol>
                                            <a 
                                                href="https://myaccount.google.com/apppasswords" 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black hover:bg-blue-700 transition-colors uppercase tracking-widest"
                                            >
                                                Gerar Minha Senha de App Google
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card className="border-none bg-muted/30 rounded-2xl shadow-none">
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Servidor SMTP</Label>
                                            <Textarea 
                                                className="min-h-[40px] h-10 py-2 rounded-xl font-bold" 
                                                value={smtpConfig.host}
                                                onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                                                placeholder="Sugerido: smtp.gmail.com" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Porta (SSL)</Label>
                                            <Textarea 
                                                className="min-h-[40px] h-10 py-2 rounded-xl font-bold" 
                                                value={smtpConfig.port}
                                                onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                                                placeholder="Sugerido: 465" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Usuário do ISP (Exemplo)</Label>
                                            <Textarea 
                                                className="min-h-[40px] h-10 py-2 rounded-xl font-bold" 
                                                value={smtpConfig.user}
                                                onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                                                placeholder="Ex: financeiro.provedor@gmail.com" 
                                            />
                                            <p className="text-[9px] text-blue-500 font-bold uppercase tracking-tighter">🏆 Dica: Use um e-mail com o nome do seu Provedor</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Senha de App do ISP</Label>
                                            <Textarea 
                                                className="min-h-[40px] h-10 py-2 rounded-xl font-bold tracking-[0.3em]" 
                                                value={smtpConfig.pass}
                                                onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                                                placeholder="Gere os 16 dígitos no link acima (Ex: abcd efgh ijkl mnop)" 
                                            />
                                            <p className="text-[10px] text-rose-500 font-black italic">⚠️ Cuidado: Nunca use a sua senha normal do e-mail!</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>

                        <Separator className="bg-border" />

                        {/* 5. Email Template */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="rounded-full bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold">2</Badge>
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Template de E-mail</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold">Assunto do E-mail</Label>
                                    <Textarea 
                                        className="min-h-[40px] h-10 py-2 rounded-xl" 
                                        value={smtpConfig.subject}
                                        onChange={(e) => setSmtpConfig({ ...smtpConfig, subject: e.target.value })}
                                        defaultValue="Sua fatura da {{empresa}} chegou! 📡" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold">Corpo do E-mail (HTML Suportado)</Label>
                                    <Textarea 
                                        className="min-h-[200px] rounded-2xl bg-muted/30" 
                                        value={smtpConfig.body}
                                        onChange={(e) => setSmtpConfig({ ...smtpConfig, body: e.target.value })}
                                        defaultValue="Olá {{nome}},<br><br>Sua fatura de {{mes}} no valor de {{valor}} já está disponível para pagamento.<br><br>Vencimento: {{vencimento}}<br><br>Você pode baixar o seu boleto ou pagar via PIX clicando no botão abaixo.<br><br>Agradecemos por ser nosso cliente!" 
                                    />
                                </div>
                            </div>
                        </section>
                    </TabsContent>

                    <TabsContent value="broadcast" className="m-0 space-y-10 focus-visible:ring-0">
                        {/* A. Canal de Avisos */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="rounded-full bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold">1</Badge>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Canais de Avisos Oficiais</h3>
                                </div>
                                <Megaphone className="h-5 w-5 text-blue-500" />
                            </div>

                            <Card className="border-none bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-8 border-l-8 border-blue-600 shadow-2xl shadow-blue-500/5">
                                <div className="grid md:grid-cols-2 gap-8 items-center">
                                    <div className="space-y-4">
                                        <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Criar Grupo de <span className="text-blue-600">Comunicados</span></h4>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                            O robô irá criar um grupo oficial para o seu Provedor, adicionará todos os clientes ativos e travará o chat para que <b>somente você (admin)</b> envie mensagens. Ideal para avisos de manutenção ou promoções.
                                        </p>
                                        <div className="pt-4 flex gap-3">
                                            <Button 
                                                onClick={async () => {
                                                  const name = prompt("Qual o nome do Grupo?");
                                                  if(!name) return;
                                                  toast.promise(startAnnouncementGroupAction(name), {
                                                    loading: 'Criando canal e adicionando clientes...',
                                                    success: 'Canal oficial criado com sucesso!',
                                                    error: 'Erro ao criar canal.'
                                                  });
                                                }}
                                                className="h-12 px-8 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                                            >
                                                Iniciar Transmissão
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex flex-col items-center text-center gap-4 opacity-75">
                                        <Share2 className="h-12 w-12 text-blue-600" />
                                        <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Preview do Canal</span>
                                        <div className="w-full h-2 bg-blue-100 dark:bg-blue-900/30 rounded-full" />
                                        <div className="w-2/3 h-2 bg-blue-100 dark:bg-blue-900/30 rounded-full" />
                                    </div>
                                </div>
                            </Card>
                        </section>

                        <Separator className="bg-border" />

                        {/* B. MODO PÂNICO (Red Zone) */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="rounded-full bg-rose-500/10 text-rose-600 border-rose-500/20 font-bold">2</Badge>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Zona de Crise (Contingência)</h3>
                                </div>
                                <AlertTriangle className="h-5 w-5 text-rose-500 animate-pulse" />
                            </div>

                            <Card className="border-none bg-rose-500/10 dark:bg-rose-950/20 rounded-3xl p-10 border-2 border-dashed border-rose-500/50 shadow-2xl shadow-rose-500/10 overflow-hidden relative">
                                <ShieldAlert className="absolute -bottom-10 -right-10 h-64 w-64 text-rose-500/10 rotate-12" />
                                
                                <div className="max-w-xl space-y-6 relative z-10">
                                    <h4 className="text-3xl font-black text-rose-700 dark:text-rose-400 uppercase tracking-tighter leading-none italic">O Número foi <span className="text-rose-600 underline decoration-wavy">Banido</span>?</h4>
                                    <p className="text-sm text-rose-900/70 dark:text-rose-200/50 font-bold leading-relaxed">
                                        Ative o <b>MODO PÂNICO</b> apenas se o seu número principal de atendimento cair. O Mikrogestor irá criar um novo grupo de emergência com todos os seus clientes ativos e enviará o seu <b>vCard (Novo Contato)</b> para que todos salvem o seu novo número instantaneamente.
                                    </p>
                                    
                                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                        <Button 
                                            variant="destructive"
                                            onClick={async () => {
                                              if(!confirm("⚠️ AVISO CRÍTICO: Você está trocando de número? Isso irá enviar avisos para TODOS os clientes. Deseja continuar?")) return;
                                              toast.promise(triggerPanicMigrationAction(), {
                                                loading: 'Iniciando operação de resgate da base...',
                                                success: 'Modo Pânico: Transmissão concluída com sucesso!',
                                                error: 'Erro na operação de resgate.'
                                              });
                                            }}
                                            className="h-16 px-10 rounded-2xl font-black text-lg bg-rose-600 hover:bg-rose-700 shadow-2xl shadow-rose-500/30 gap-3 transition-transform hover:scale-[1.02] active:scale-95"
                                        >
                                            <AlertTriangle size={24} />
                                            ATIVAR MODO PÂNICO
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </section>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}
