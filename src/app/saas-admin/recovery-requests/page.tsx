
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, AlertTriangle, Mail, Phone, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { resolveRecoveryRequestAction } from "@/modules/saas/actions/auth-recovery.actions";
import { revalidatePath } from "next/cache";

export default async function RecoveryRequestsPage() {
    const requests = await prisma.passwordRecoveryRequest.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50
    });

    async function handleResolve(id: string) {
        "use server";
        await resolveRecoveryRequestAction(id);
        revalidatePath("/saas-admin/recovery-requests");
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                    <Clock className="h-8 w-8 text-blue-600" /> Solicitações de Recuperação
                </h1>
                <p className="text-muted-foreground mt-1 font-medium">ISPs que solicitaram renovação de senha via e-mail ou suporte.</p>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl bg-white dark:bg-slate-950">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-widest">Usuário</th>
                            <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-widest">Contatos</th>
                            <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-widest">Status / Ação Tomada</th>
                            <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-widest">Data</th>
                            <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {requests.map((req) => (
                            <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                <td className="p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div className="font-bold text-slate-900 dark:text-white">{req.name || "N/A"}</div>
                                    </div>
                                </td>
                                <td className="p-6 space-y-1">
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                                        <Mail className="h-3 w-3" /> {req.email || "N/A"}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                                        <Phone className="h-3 w-3" /> {req.phone || "N/A"}
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="flex flex-col gap-2">
                                        <Badge 
                                            variant={req.status === 'SENT_EMAIL' ? 'default' : req.status === 'ATTENTION_REQUIRED' ? 'destructive' : 'secondary'}
                                            className="w-fit font-black rounded-lg uppercase text-[10px] px-2"
                                        >
                                            {req.status === 'SENT_EMAIL' ? 'E-mail Enviado' : 
                                             req.status === 'ATTENTION_REQUIRED' ? 'Atenção Requerida' : 
                                             req.status === 'RESOLVED' ? 'Resolvido' : req.status}
                                        </Badge>
                                        <p className="text-xs italic text-slate-500">{req.message}</p>
                                    </div>
                                </td>
                                <td className="p-6 text-sm font-medium text-slate-500">
                                    {new Date(req.createdAt).toLocaleString('pt-BR')}
                                </td>
                                <td className="p-6 text-right">
                                    {req.status !== 'RESOLVED' && (
                                        <form action={handleResolve.bind(null, req.id)}>
                                            <Button size="sm" variant="outline" className="rounded-xl font-bold h-10 border-slate-200">
                                                <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" /> Marcar como Resolvido
                                            </Button>
                                        </form>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {requests.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-20 text-center space-y-4">
                                    <CheckCircle2 className="h-12 w-12 text-emerald-200 mx-auto" />
                                    <p className="text-slate-400 font-bold italic tracking-tight">Nenhuma solicitação de recuperação pendente.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
