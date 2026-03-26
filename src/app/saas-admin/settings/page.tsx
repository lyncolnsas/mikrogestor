
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SmtpSettingsCard } from "@/modules/saas/components/smtp-settings-card";
import { Cog } from "lucide-react";

export default function SaasSettingsPage() {
    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3 underline decoration-blue-500/30">
                    <Cog className="h-8 w-8 text-blue-600" /> Configurações Globais
                </h1>
                <p className="text-muted-foreground mt-1 font-medium">Gestão de infraestrutura, comunicação e comportamento do SaaS.</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                <SmtpSettingsCard />
            </div>
        </div>
    );
}
