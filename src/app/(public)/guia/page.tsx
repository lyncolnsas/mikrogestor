"use client";

import { 
    Network, Server, Mail, MessageCircle, Shield, Zap, 
    ArrowLeft, CheckCircle2, ChevronRight, Globe, Code, 
    Key, LayoutDashboard, Wallet, Users, Radio, Settings,
    BarChart3, FileText, Map, Bell, Smartphone, HelpCircle,
    Cpu, Database, Lock, Search, SmartphoneIcon, ListFilter,
    CreditCard, Fingerprint, Image as ImageIcon, Trash2,
    Activity, ClipboardCheck, Info, AlertTriangle, Cloud,
    ArrowUpRight, Monitor, Wifi, HardDrive, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function DeepPRDManualPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 selection:bg-indigo-500/30 font-sans scroll-smooth">
            {/* Nav - High Detail Header */}
            <header className="fixed top-0 w-full z-50 px-6 h-20 flex items-center justify-between border-b bg-white/90 dark:bg-slate-950/90 backdrop-blur-3xl transition-all border-slate-200 dark:border-slate-800 shadow-sm">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 shrink-0 group-hover:scale-110 transition-transform">
                        <Network className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col -space-y-1">
                        <span className="font-black text-2xl tracking-tighter text-slate-900 dark:text-white uppercase italic">
                            Mikrogestor <span className="text-indigo-600 not-italic">PRD</span>
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Knowledge Base v2.5</span>
                    </div>
                </Link>

                <div className="flex items-center gap-6">
                    <nav className="hidden lg:flex items-center gap-8 text-[11px] font-black uppercase tracking-widest text-slate-500">
                        <a href="#deployment" className="hover:text-indigo-600 transition-colors">Setup</a>
                        <a href="#dashboard" className="hover:text-indigo-600 transition-colors">Dashboard</a>
                        <a href="#crm" className="hover:text-indigo-600 transition-colors">Clientes</a>
                        <a href="#rede" className="hover:text-indigo-600 transition-colors">Rede</a>
                        <a href="#security" className="hover:text-indigo-600 transition-colors text-emerald-600">Segurança</a>
                    </nav>
                    <Link href="/overview">
                        <Button className="rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black px-6 hover:scale-105 transition-transform text-xs">ACESSAR PAINEL</Button>
                    </Link>
                </div>
            </header>

            <main className="pt-32 pb-24 px-6 max-w-[1400px] mx-auto">
                
                {/* 00. INÍCIO / HERO */}
                <div className="grid lg:grid-cols-2 gap-16 items-center mb-40">
                    <div className="space-y-8">
                        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 uppercase font-black tracking-[0.2em] px-5 py-2 rounded-full text-[10px]">
                            Documentação Técnica & Manual de Uso
                        </Badge>
                        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 dark:text-white leading-[0.95]">
                            A Ciência da <span className="text-indigo-600">Gestão ISP.</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-xl font-medium leading-relaxed max-w-xl">
                            Este é o manual definitivo para provedores. De protocolos Radius RFC 2865 à automação de FinOps via WhatsApp. Tudo o que você precisa para escalar sem limites.
                        </p>
                        <div className="flex flex-wrap gap-4 pt-4">
                            <QuickStat icon={Shield} label="Segurança" value="Garantida" />
                            <QuickStat icon={Activity} label="Status" value="Online 24/7" />
                            <QuickStat icon={Globe} label="Cloud" value="Híbrida" />
                        </div>
                    </div>
                    <div className="relative">
                        <div className="absolute -inset-4 bg-indigo-500/10 rounded-[3rem] blur-3xl animate-pulse" />
                        <Card className="rounded-[3rem] bg-indigo-950 border-indigo-900 overflow-hidden shadow-2xl relative z-10">
                            <CardContent className="p-8 space-y-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                    <span className="ml-4 text-[10px] font-mono text-indigo-400 uppercase tracking-widest">tunnel_provisioning.sh</span>
                                </div>
                                <div className="font-mono text-[13px] text-white/90 leading-relaxed bg-black/40 p-6 rounded-2xl border border-white/5 space-y-1">
                                    <p><span className="text-indigo-400"># Definindo Variaveis</span></p>
                                    <p><span className="text-emerald-400">export</span> TUNNEL_ID=<span className="text-amber-300">"MGEST-ISP-044"</span></p>
                                    <p><span className="text-emerald-400">export</span> RADIUS_SRV=<span className="text-amber-300">"radius.cloud.io"</span></p>
                                    <p>&nbsp;</p>
                                    <p><span className="text-indigo-400"># Iniciando Conexão Segura</span></p>
                                    <p><span className="text-emerald-400">curl</span> -sSL mikrogestor.io/v2/setup | <span className="text-emerald-400">bash</span></p>
                                    <p>&nbsp;</p>
                                    <p><span className="text-sky-400">[SYSTEM]</span> Verificando Handshake...</p>
                                    <p><span className="text-emerald-500">[STATUS]</span> TÚNEL ESTABELECIDO COM SUCESSO</p>
                                    <p><span className="text-emerald-500">[STATUS]</span> LATÉNCIA MÉDIA: 14ms</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* 01. QUICK START GUIDE */}
                <section id="deployment" className="mb-40 space-y-12">
                    <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">0. Guia de Implementação Rápida</h2>
                        <p className="text-slate-500 font-medium">Siga este workflow para ativar sua operação em menos de 15 minutos.</p>
                    </div>
                    <div className="grid md:grid-cols-4 gap-6">
                        <StepItem num="01" title="Cadastro" text="Crie seu subdomínio exclusivo e configure sua identidade visual (Logo/Cores)." />
                        <StepItem num="02" title="Infra" text="Adicione seu MikroTik ao painel e execute o script de provisionamento de túnel." />
                        <StepItem num="03" title="Financeiro" text="Vincule seu Token (Asaas/MercadoPago) e crie seus planos de velocidade." />
                        <StepItem num="04" title="Radius" text="Aponte o AAA do seu concentrador para nosso IP de Radius seguro via VPN." />
                    </div>
                </section>

                <div className="grid lg:grid-cols-[1fr_350px] gap-20">
                    <div className="space-y-40">
                        {/* 02. DASHBOARD DETAIL */}
                        <section id="dashboard" className="scroll-mt-32 space-y-12">
                            <SectionHeader 
                                number="01" 
                                title="Centro de Operações (Dashboard)" 
                                desc="O cérebro do seu provedor. Dados transformados em estratégia."
                            />
                            <div className="grid md:grid-cols-2 gap-8">
                                <WikiCardDetailed 
                                    title="KPIs de Crescimento"
                                    icon={BarChart3}
                                    color="blue"
                                    features={[
                                        "MRR (Monthly Recurring Revenue): Cálculo líquido de faturas ativas.",
                                        "Churn Rate: Taxa de desistência calculada mensalmente.",
                                        "Inadimplência Real: Diferença entre faturado vs recebido.",
                                        "Ticket Médio: Quanto cada cliente traz de lucro para sua rede."
                                    ]}
                                    implementation="Algoritmo de varredura assíncrona que processa o banco de dados 'saas_faturas' a cada 5 segundos para refletir pagamentos PIX imediatos."
                                    proTip="Use o Churn Mensal para premiar sua equipe técnica se a taxa baixar de 3%."
                                />
                                <WikiCardDetailed 
                                    title="Monitoramento em Tempo Real"
                                    icon={Activity}
                                    color="blue"
                                    features={[
                                        "Handshake Radius: Monitora tentativas de login bem e mal sucedidas.",
                                        "Concentradores Online: Status da VPN de cada torre no mapa.",
                                        "Gráfico de Performance: Latência entre o servidor e seus MikroTiks.",
                                        "Alertas de Crise: Notificação instantânea em caso de quedas massivas."
                                    ]}
                                    implementation="Utiliza WebSockets para streaming de dados em tempo real, evitando a necessidade de refresh de página para ver novos usuários onlines."
                                    proTip="Mantenha uma aba do Dashboard aberta em um monitor dedicado no seu NOC."
                                />
                            </div>
                        </section>

                        {/* 03. CLIENTS/CRM DETAIL */}
                        <section id="crm" className="scroll-mt-32 space-y-12">
                            <SectionHeader 
                                number="02" 
                                title="Gestão Inteligente de Assinantes" 
                                desc="Muito além de um cadastro. É a vida financeira e técnica do seu cliente."
                            />
                            <div className="grid md:grid-cols-2 gap-8">
                                <WikiCardDetailed 
                                    title="CRM Avançado"
                                    icon={Users}
                                    color="indigo"
                                    features={[
                                        "Ficha Cadastral Completa: Dados fiscais, geolocalização e histórico.",
                                        "Histórico de Interações: Registro de cada mensagem enviada via bot.",
                                        "Georreferenciamento: Visualização do cliente no mapa para equipe de campo.",
                                        "Módulo de Bloqueio: Lógica de suspensão automática por débito."
                                    ]}
                                    implementation="Integração profunda entre o banco Postgres e o Servidor Radius. Quando o status muda para 'Bloqueado', o Radius envia um 'Disconnect Request' (CoA) para o MikroTik derrubar o cliente na hora."
                                    proTip="Sempre valide o CEP; isso permite que o sistema trace rotas automáticas para sua equipe de rua."
                                />
                                <WikiCardDetailed 
                                    title="Portal do Assinante 2.0"
                                    icon={SmartphoneIcon}
                                    color="indigo"
                                    features={[
                                        "Segunda Via Automática: PDF do boleto ou linha digitável PIX.",
                                        "Auto-Desbloqueio: O próprio cliente libera seu sinal após pagar e enviar anexo.",
                                        "Gráfico de Consumo: Histórico de download/upload do Radius.",
                                        "Acesso via Subdomínio: Totalmente customizado com sua marca."
                                    ]}
                                    implementation="Frontend responsivo otimizado para celulares Android/iOS de baixo custo, garantindo que o cliente consiga acessar mesmo com internet reduzida."
                                    proTip="Crie um QR Code físico para o seu escritório que leva direto para o Portal do Assinante."
                                />
                            </div>
                        </section>

                        {/* 04. NETWORK/RADIUS DETAIL */}
                        <section id="rede" className="scroll-mt-32 space-y-12">
                            <SectionHeader 
                                number="03" 
                                title="Radius, Rede & Engenharia de Túneis" 
                                desc="A infraestrutura de transporte que conecta sua rede ao mundo cloud."
                            />
                            <div className="grid md:grid-cols-2 gap-8">
                                <WikiCardDetailed 
                                    title="Radius Engine (RFC 2865)"
                                    icon={Server}
                                    color="rose"
                                    features={[
                                        "Autenticação PPPoE/IPoE de alta densidade.",
                                        "Atributos VSA MikroTik: Controle de banda (Rate-Limit) remoto.",
                                        "Accounting Rigoroso: Dados de bytes consumidos para auditoria técnica.",
                                        "Criptografia de Segredos: Radius Secret encriptado via TLS."
                                    ]}
                                    implementation="Servidor FreeRadius customizado rodando em cluster. Alta disponibilidade com backup geográfico para evitar que sua rede pare se um datacenter cair."
                                    proTip="Evite Radius Secret com caracteres especiais complexos para evitar bugs de encoding no RouterOS."
                                />
                                <WikiCardDetailed 
                                    title="Mikrogestor VPN Tunnels"
                                    icon={Zap}
                                    color="rose"
                                    features={[
                                        "Tecnologia WireGuard: A mais rápida do mercado para tunelamento.",
                                        "Bypass de NAT/CGNAT: Gerencie seu MikroTik mesmo sem IP Público.",
                                        "IP Protegido: Sua rede interna fica invisível para ataques externos via Web.",
                                        "Monitoramento ICMP: Polling de ping constante para medir jitter/latência."
                                    ]}
                                    implementation="Rede privada virtual (SD-WAN) que encapsula o tráfego Radius. O script de provisionamento já cria as rotas estáticas necessárias no seu MikroTik automaticamente."
                                    proTip="Se a latência subir muito, verifique o MTU do túnel; o padrão 1420 costuma ser ideal para a maioria das fibras."
                                />
                            </div>
                        </section>

                        {/* 05. SECURITY / SHARP SYSTEM */}
                        <section id="security" className="scroll-mt-32 space-y-12">
                            <div className="p-16 bg-slate-900 rounded-[4rem] text-white space-y-12 relative overflow-hidden border border-white/5 shadow-2xl">
                                <div className="absolute top-0 right-0 p-20 opacity-10 rotate-12">
                                    <Shield size={300} />
                                </div>
                                <div className="space-y-6 relative z-10 max-w-2xl">
                                    <Badge className="bg-emerald-500 text-white font-black px-6 py-2 rounded-full uppercase tracking-widest border-none">Security Whitepaper 2026</Badge>
                                    <h2 className="text-5xl font-black tracking-tighter uppercase leading-[0.9]">Proteção Ativa contra <br /><span className="text-emerald-500 italic">Injeção de Código.</span></h2>
                                    <p className="text-slate-400 font-medium text-lg leading-relaxed">Não somos apenas um ERP; somos uma fortaleza. Todo arquivo que entra no Mikrogestor passa por uma câmara de descontaminação digital.</p>
                                </div>

                                <div className="grid md:grid-cols-3 gap-8 relative z-10">
                                    <SecurityFeature 
                                        icon={Lock}
                                        title="Sanitização Sharp"
                                        desc="Imagens são totalmente recodificadas. EXIF, metadados e possíveis scripts poliglotos (JS dentro de JPG) são destruídos no upload."
                                    />
                                    <SecurityFeature 
                                        icon={Cpu}
                                        title="Isolamento Docker"
                                        desc="O ambiente de runtime é efêmero. Mesmo em caso de brecha, o atacante fica preso em um container isolado sem acesso ao host."
                                    />
                                    <SecurityFeature 
                                        icon={Key}
                                        title="Audit Log"
                                        desc="Cada bloqueio, exclusão ou alteração de plano é registrado com IP, Horário e UID do operador para total transparência."
                                    />
                                </div>

                                <div className="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-[2rem] flex items-center gap-6 relative z-10">
                                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shrink-0">
                                        <Info className="text-white" size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest leading-relaxed">AVISO TÉCNICO: O Mikrogestor NUNCA armazena sua senha de MikroTik. O script de túnel usa autenticação por chave SSH gerada dinamicamente via Dashboard.</p>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT SIDEBAR - GLOSSARY & FAQ */}
                    <aside className="space-y-12 sticky top-32 self-start hidden lg:block">
                        <div className="space-y-6">
                            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-500">Glossário Técnico</h4>
                            <div className="space-y-4">
                                <GlossaryItem term="PPPoE" desc="Protocolo principal para autenticação de clientes em redes de fibra/radio." />
                                <GlossaryItem term="CoA (RFC 3576)" desc="Capacidade de alterar a conexão do cliente sem precisar desconectá-lo manualmente." />
                                <GlossaryItem term="Burst Limit" desc="Limite de velocidade superior temporário para navegação rápida em sites leves." />
                                <GlossaryItem term="Asaas API" desc="Cérebro financeiro que gerencia as cobranças e baixas bancárias." />
                                <GlossaryItem term="Handshake" desc="Processo de negociação de chaves entre o Provedor e a Nuvem." />
                            </div>
                        </div>


                        <div className="p-8 bg-slate-900 rounded-[2.5rem] space-y-6 text-white text-center">
                            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-indigo-500/40 shadow-2xl">
                                <HelpCircle size={32} />
                            </div>
                            <h4 className="text-xl font-black italic tracking-tighter uppercase">Support NOC</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Atendimento VIP para ISPs com mais de 1000 assinantes.</p>
                            <Button className="w-full rounded-2xl bg-white text-slate-900 font-black hover:bg-indigo-100 uppercase tracking-widest text-[10px]">Chamar no WhatsApp</Button>
                        </div>
                    </aside>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-24 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-6 flex flex-col items-center space-y-12">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                            <Network className="h-6 w-6" />
                        </div>
                        <span className="font-black text-2xl tracking-tighter uppercase italic">MIKROGESTOR DOCS</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] text-center max-w-xl">A revolução na gestão de provedores de internet não é sobre hardware, é sobre a inteligência do software. Escalando ISPs desde 2024.</p>
                    <div className="flex gap-12 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <Link href="/terms" className="hover:text-indigo-600">Termos Legais</Link>
                        <Link href="/security" className="hover:text-indigo-600">Protocolo Security</Link>
                        <Link href="/status" className="hover:text-indigo-600">System Status</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function SectionHeader({ number, title, desc }: { number: string, title: string, desc: string }) {
    return (
        <div className="space-y-4 border-l-[6px] border-indigo-600 pl-10 relative">
            <div className="absolute -left-1.5 top-0 w-3 h-3 bg-indigo-600 rounded-full" />
            <div className="flex items-center gap-4 text-slate-400 font-black italic uppercase tracking-tighter text-xl scale-y-110 mb-2">
                <span>SEÇÃO_{number}</span>
                <div className="h-px flex-1 bg-slate-100" />
            </div>
            <h2 className="text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight italic">{title}</h2>
            <p className="text-slate-500 font-bold text-xl uppercase tracking-tight opacity-70 italic">{desc}</p>
        </div>
    );
}

function WikiCardDetailed({ title, icon: Icon, color, features, implementation, proTip }: { 
    title: string, icon: any, color: 'blue' | 'indigo' | 'rose', 
    features: string[], implementation: string, proTip: string 
}) {
    return (
        <Card className="rounded-[4rem] border-slate-200 dark:border-slate-800 shadow-2xl shadow-indigo-500/5 overflow-hidden hover:border-indigo-500/40 transition-all group bg-white dark:bg-slate-900/50">
            <CardContent className="p-0">
                <div className="p-12 space-y-10">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl transition-transform group-hover:scale-110 duration-500 
                        ${color === 'blue' ? 'bg-blue-600' : color === 'indigo' ? 'bg-indigo-600' : 'bg-rose-600'}`}>
                        <Icon size={32} />
                    </div>
                    <div className="space-y-6">
                        <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">{title}</h3>
                        <ul className="space-y-4">
                            {features.map((f, i) => (
                                <li key={i} className="flex gap-4 group/item">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                                    <span className="text-[13px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight leading-relaxed">{f}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="p-10 border-t border-slate-50 dark:border-slate-800 space-y-4">
                    <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase block mb-2">Back-end & Lógica de Software</span>
                    <p className="text-[11px] font-bold leading-relaxed text-slate-500 dark:text-slate-400 items-start flex gap-3 italic">
                        <Code size={16} className="shrink-0 mt-0.5 text-indigo-500" />
                        "{implementation}"
                    </p>
                </div>
                
                <div className="p-10 bg-slate-900 text-white relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Zap size={120} />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <Badge className="bg-amber-500 text-slate-900 font-black border-none px-4 py-1.5 uppercase tracking-widest text-[10px]">Star Tip</Badge>
                        <span className="h-px flex-1 bg-white/10" />
                    </div>
                    <p className="text-[14px] font-black leading-relaxed italic pr-8 text-indigo-100">"{proTip}"</p>
                </div>
            </CardContent>
        </Card>
    );
}

function QuickStat({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
    return (
        <div className="flex items-center gap-3 px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                <Icon size={16} />
            </div>
            <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</span>
                <span className="text-sm font-black text-slate-900 dark:text-white uppercase italic">{value}</span>
            </div>
        </div>
    );
}

function StepItem({ num, title, text }: { num: string, title: string, text: string }) {
    return (
        <div className="p-10 rounded-[3rem] bg-indigo-600 text-white space-y-6 relative overflow-hidden group hover:-translate-y-2 transition-transform shadow-2xl shadow-indigo-500/20">
            <span className="text-6xl font-black opacity-10 absolute -right-4 -top-4 italic">{num}</span>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl font-black italic">{num}</div>
            <h3 className="text-2xl font-black uppercase tracking-tighter italic">{title}</h3>
            <p className="text-[11px] font-bold text-indigo-100 uppercase leading-relaxed tracking-wider opacity-80">{text}</p>
        </div>
    );
}

function GlossaryItem({ term, desc }: { term: string, desc: string }) {
    return (
        <div className="space-y-1 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-none">
            <span className="text-xs font-black text-indigo-600 uppercase italic tracking-tighter">{term}</span>
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight tracking-tight">{desc}</p>
        </div>
    );
}


function SecurityFeature({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="space-y-4 p-8 bg-white/5 border border-white/10 rounded-[2.5rem] hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                <Icon size={24} />
            </div>
            <h4 className="text-xl font-black uppercase tracking-tighter">{title}</h4>
            <p className="text-[11px] font-medium text-slate-400 leading-relaxed uppercase tracking-tight">{desc}</p>
        </div>
    );
}
