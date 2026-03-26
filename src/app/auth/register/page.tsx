import Link from "next/link";
import { getPublicPlansAction } from "@/modules/saas/actions/plan.actions";
import { RegisterFormClient } from "./register-form-client";
import { Network } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
    searchParams,
}: {
    searchParams: Promise<{ plan?: string }>;
}) {
    // Fetch active public plans on the server
    const plans = await getPublicPlansAction();
    const resolvedSearchParams = await searchParams;
    const initialPlanId = resolvedSearchParams.plan;

    return (
        <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-slate-950">
            {/* Background Aesthetic */}
            <div className="absolute top-0 left-0 w-full h-full -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30"></div>
            </div>

            <div className="w-full max-w-lg z-10">
                <div className="flex justify-center mb-8">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20 group-hover:scale-110 transition-transform">
                            <Network className="h-7 w-7" />
                        </div>
                        <span className="font-black text-3xl tracking-tighter text-slate-900 dark:text-white uppercase">
                            Mikrogestor
                        </span>
                    </Link>
                </div>

                <RegisterFormClient plans={plans} initialPlanId={initialPlanId} />
            </div>
        </div>
    );
}
