"use client"

import * as React from "react"
import Link from "next/link"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { RegisterFormInner } from "@/components/auth/register-form-inner"

export function RegisterFormClient({
    plans,
    initialPlanId
}: {
    plans: any[],
    initialPlanId?: string
}) {
    return (
        <Card className="border-none shadow-2xl shadow-blue-500/10 rounded-[2.5rem] overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800/50">
            <CardHeader className="p-8 pb-4 text-center">
                <CardTitle className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    Comece seu teste grátis
                </CardTitle>
                <CardDescription className="text-lg font-medium">
                    Tudo pronto para levar seu provedor ao próximo nível?
                </CardDescription>
            </CardHeader>

            <CardContent className="p-8 pt-4">
                <RegisterFormInner plans={plans} initialPlanId={initialPlanId} />
            </CardContent>

            <CardFooter className="p-8 pt-0 flex flex-col gap-6">
                <p className="text-center text-slate-500 dark:text-slate-400 font-medium">
                    Já tem uma conta?{" "}
                    <Link href="/auth/login" className="text-blue-600 font-black hover:underline underline-offset-4">
                        Entrar no Painel
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
}
