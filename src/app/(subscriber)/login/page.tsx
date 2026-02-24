'use client';

import { useActionState } from 'react';
import { loginWithCpf } from '@/modules/customers/actions/auth.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SubscriberLoginPage() {
    const [state, action, isPending] = useActionState(loginWithCpf, null);

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">
                        Acesso do Assinante
                    </h1>
                    <p className="text-slate-500">
                        Informe seu CPF para acessar suas faturas e serviços.
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800">
                    <form action={action} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="cpf">CPF</Label>
                            <Input
                                id="cpf"
                                name="cpf"
                                type="text"
                                placeholder="000.000.000-00"
                                required
                                className="text-lg h-12 tracking-wider"
                            // Nota: Poderíamos adicionar uma máscara no cliente aqui usando uma lib ou onChange simples
                            // Mantendo simples por enquanto, o servidor remove não-dígitos.
                            />
                        </div>

                        {state?.error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{state.error}</AlertDescription>
                            </Alert>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verificando...
                                </>
                            ) : (
                                <>
                                    Acessar Painel <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>
                </div>

                <p className="text-center text-xs text-slate-400">
                    Ao acessar, você concorda com nossos termos de uso.
                    <br />
                    Protegido por Mikrogestor.
                </p>
            </div>
        </div>
    );
}
