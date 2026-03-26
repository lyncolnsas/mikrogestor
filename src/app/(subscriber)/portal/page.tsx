import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Wifi,
    CreditCard,
    FileText,
    AlertCircle,
    Download,
    ShieldAlert
} from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { runWithTenant } from "@/shared/tenancy/tenancy.context";
import { InvoicePaymentModal } from "@/components/subscriber/invoice-payment-modal";
import { serializeDecimal } from "@/lib/utils";
import { SpeedTestButton } from "@/components/subscriber/speed-test-button";
import { GlobalNotificationListener } from "@/components/notifications/global-notification-listener";
import { getMyTenantNotificationsAction, markTenantNotificationAsReadAction } from "@/modules/customers/actions/notification.actions";
import { getCustomerUptimeAction } from "@/modules/network/actions/uptime.actions";

export default async function SubscriberDashboard() {
    const session = await getSession();

    if (!session || session.role !== "SUBSCRIBER" || !session.tenantSlug || !session.tenantId) {
        redirect("/login");
    }

    // Fetch Uptime Data
    const uptimeResult = await getCustomerUptimeAction(session.userId);
    const uptime = uptimeResult.data;

    // Determine Schema
    const schema = `tenant_${session.tenantSlug.replaceAll('-', '_')}`;

    // Fetch Customer Data in Verification Context
    const customerData = await runWithTenant({ tenantId: session.tenantId, schema }, async () => {
        return prisma.customer.findUnique({
            where: { id: session.userId },
            include: {
                plan: true,
                invoices: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            }
        });
    });

    // Fetch Landing Config for WhatsApp support
    const landingConfig = await prisma.landingConfig.findUnique({
        where: { tenantId: session.tenantId }
    });

    // Fetch Usage Stats from Radius Schema
    const radiusUsername = `t${session.tenantId}_${session.userId}`;
    const usage = await (prisma as any).radAcct.aggregate({
        where: { username: radiusUsername },
        _sum: {
            acctinputoctets: true,
            acctoutputoctets: true
        }
    });

    if (!customerData) return <div>Nenhum dado de assinante encontrado.</div>;
    const customer = serializeDecimal(customerData);

    const isActive = customer.status === "ACTIVE";
    const addr = customer.address as any || {};
    const isProfileIncomplete = !customer.phone || !addr.street || !addr.city;

    // Format usage (Bytes to GB)
    const downloadGB = (Number(usage._sum?.acctoutputoctets || 0) / (1024 ** 3)).toFixed(1);
    const uploadGB = (Number(usage._sum?.acctinputoctets || 0) / (1024 ** 3)).toFixed(1);

    const whatsappNumber = landingConfig?.whatsapp?.replace(/\D/g, '') || "";
    const whatsappLink = whatsappNumber ? `https://wa.me/55${whatsappNumber}?text=Olá,%20gostaria%20de%20suporte%20técnico.%20Assinante:%20${customer.name}` : "#";

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header: Status & Welcome */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">Olá, {customer.name.split(' ')[0]} 👋</h1>
                    <p className="text-muted-foreground mt-1">Bem-vindo à sua Central do Assinante.</p>
                </div>
                <div className="flex items-center gap-3 bg-card p-2 pr-4 rounded-2xl border shadow-sm">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${uptime?.online ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                        <Wifi className={`h-5 w-5 ${uptime?.online ? 'text-emerald-500' : 'text-red-500'}`} />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-black text-muted-foreground">Status da Conexão</p>
                        <p className={`text-sm font-bold ${uptime?.online ? 'text-emerald-500' : 'text-red-500'}`}>
                            {uptime?.online ? `Online há ${uptime?.uptime}` : `Offline (${uptime?.uptime || 'Sem sinal'})`}
                        </p>
                    </div>
                </div>
            </div>

            <GlobalNotificationListener
                fetchAction={getMyTenantNotificationsAction}
                markReadAction={async (id) => {
                    "use server";
                    await markTenantNotificationAsReadAction({ notificationId: id });
                }}
            />

            {
                isProfileIncomplete && (
                    <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-sm rounded-2xl animate-pulse">
                        <ShieldAlert className="h-5 w-5 text-amber-500" />
                        <AlertDescription className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <span>
                                <span className="font-black">Perfil Incompleto:</span> Detectamos que faltam informações importantes no seu cadastro.
                                Atualize seus dados para evitar o <span className="text-red-500 font-bold underline">bloqueio da sua conexão</span>.
                            </span>
                            <Button size="sm" variant="outline" className="border-amber-500/20 hover:bg-amber-500/10 text-amber-500 font-bold" asChild>
                                <Link href="/profile">Completar Cadastro</Link>
                            </Button>
                        </AlertDescription>
                    </Alert>
                )
            }

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Plan & Usage */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Plan Card */}
                    <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                            <Wifi className="h-40 w-40" />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-xl opacity-90">Seu Plano Atual</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-end gap-2">
                                <span className="text-5xl font-black">{customer.plan?.name || "Fibra 100MB"}</span>
                                <Badge className="mb-2 bg-white/20 text-white border-none hover:bg-white/30 backdrop-blur-md">ULTRA</Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                <div>
                                    <p className="text-xs opacity-70 uppercase font-bold">Download</p>
                                    <p className="text-2xl font-bold">{customer.plan?.download || 100} Mbps</p>
                                </div>
                                <div>
                                    <p className="text-xs opacity-70 uppercase font-bold">Upload</p>
                                    <p className="text-2xl font-bold">{customer.plan?.upload || 50} Mbps</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                <div>
                                    <p className="text-[10px] opacity-70 uppercase font-bold">Consumo Download (Mês)</p>
                                    <p className="text-xl font-bold">{downloadGB} GB</p>
                                </div>
                                <div>
                                    <p className="text-[10px] opacity-70 uppercase font-bold">Consumo Upload (Mês)</p>
                                    <p className="text-xl font-bold">{uploadGB} GB</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pending Invoices */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                            <CreditCard className="h-5 w-5 text-indigo-500" />
                            Faturas Recentes
                        </h2>
                        <div className="grid gap-4">
                            {customer.invoices.map((inv: any) => (
                                <Card key={inv.id} className="hover:border-indigo-500/50 transition-colors shadow-sm bg-card border-border">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 bg-muted rounded-xl flex items-center justify-center">
                                                <FileText className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground">Mensalidade - {format(inv.createdAt, "MMMM", { locale: ptBR })}</p>
                                                <p className="text-xs text-muted-foreground">Vencimento: {format(inv.createdAt, "dd/MM/yyyy")}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-lg font-black text-foreground">R$ {Number(inv.total).toFixed(2)}</p>
                                                <Badge variant={inv.status === 'PAID' ? 'secondary' : 'destructive'} className="text-[10px] h-4">
                                                    {inv.status === 'PAID' ? 'PAGO' : 'PENDENTE'}
                                                </Badge>
                                            </div>
                                            {inv.status !== 'PAID' && (
                                                <InvoicePaymentModal invoice={inv} />
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Support & Info */}
                <div className="space-y-6">
                    <Card className="border-border bg-card overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full -mr-12 -mt-12 blur-2xl" />
                        <CardHeader>
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                                <AlertCircle className="h-4 w-4 text-indigo-500" />
                                Precisa de Ajuda?
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground leading-relaxed">Nosso suporte técnico está disponível 24h por dia para garantir sua conexão.</p>
                            <Button
                                variant="outline"
                                className="w-full border-indigo-500/20 text-indigo-500 hover:bg-indigo-500/10 font-bold h-11 rounded-xl shadow-sm"
                                asChild
                            >
                                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                                    Abrir Chamado no WhatsApp
                                </a>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-border rounded-3xl bg-card">
                        <CardHeader>
                            <CardTitle className="text-sm font-black text-muted-foreground uppercase tracking-widest">Auto-Atendimento</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            <Button variant="ghost" className="w-full justify-start text-foreground text-sm h-11 gap-4 font-semibold hover:bg-muted rounded-xl">
                                <div className="h-8 w-8 bg-muted rounded-lg flex items-center justify-center"><Download className="h-4 w-4 text-muted-foreground" /></div> Copiar 2ª Via do Contrato
                            </Button>
                            <SpeedTestButton />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div >
    );
}
