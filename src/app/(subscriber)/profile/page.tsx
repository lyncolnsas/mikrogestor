import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { runWithTenant } from "@/shared/tenancy/tenancy.context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubscriberInfoForm } from "@/components/subscriber/subscriber-info-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";
import { serializeDecimal } from "@/lib/utils";

export default async function ProfilePage() {
    const session = await getSession();

    if (!session || session.role !== "SUBSCRIBER" || !session.tenantSlug || !session.tenantId) {
        redirect("/login");
    }

    const schema = `tenant_${session.tenantSlug.replaceAll('-', '_')}`;

    const customerData = await runWithTenant({ tenantId: session.tenantId, schema }, async () => {
        return prisma.customer.findUnique({
            where: { id: session.userId },
        });
    });

    if (!customerData) {
        return <div className="p-8 text-center">Assinante não encontrado.</div>;
    }

    const customer = serializeDecimal(customerData);

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Meu Perfil</h1>
                <p className="text-slate-500">Gerencie suas informações cadastrais e dados de contato.</p>
            </div>

            <Alert className="bg-amber-50 border-amber-200 text-amber-900 shadow-sm rounded-2xl">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                <AlertDescription className="font-medium">
                    <span className="font-black">Atenção Assinante:</span> Mantenha seus dados sempre atualizados.
                    Informações cadastrais incompletas ou desatualizadas podem resultar no <span className="text-red-600 font-black underline">bloqueio automático</span> do seu acesso por motivos de segurança e conformidade.
                </AlertDescription>
            </Alert>

            <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b">
                    <CardTitle className="text-lg font-bold">Editar Informações</CardTitle>
                </CardHeader>
                <CardContent className="p-6 md:p-8">
                    <SubscriberInfoForm initialData={{
                        ...customer,
                        phone: customer.phone || "",
                        address: customer.address || {}
                    }} />
                </CardContent>
            </Card>
        </div>
    );
}
