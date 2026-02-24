import { Button } from "@/components/ui/button";
import { Lock, PhoneCall } from "lucide-react";
import Link from "next/link";
import { logoutUser } from "@/actions/auth";

export default function LockedPage() {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock className="h-10 w-10 text-red-600" />
                </div>

                <h1 className="text-2xl font-black text-slate-900 mb-2">Acesso Temporariamente Suspenso</h1>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    Identificamos uma pendência administrativa em sua conta.
                    Por favor, entre em contato com nosso suporte financeiro para regularização imediata e desbloqueio.
                </p>

                <div className="space-y-3">
                    <Button className="w-full gap-2 font-bold h-12 rounded-xl bg-green-600 hover:bg-green-700" asChild>
                        <Link href="https://wa.me/5511999999999">
                            <PhoneCall className="h-5 w-5" /> Falar com Suporte
                        </Link>
                    </Button>

                    <form action={logoutUser}>
                        <Button variant="ghost" className="w-full font-bold text-slate-400 hover:text-slate-600">
                            Sair da conta
                        </Button>
                    </form>
                </div>

                <p className="mt-8 text-xs text-slate-400">
                    Se você acredita que isso é um erro, verifique sua conexão ou tente novamente em alguns minutos.
                </p>
            </div>
        </div>
    );
}
