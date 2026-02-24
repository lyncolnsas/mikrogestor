"use server";

import { prisma } from "@/lib/prisma";
import { getLandingConfigAction } from "@/modules/saas/actions/landing.actions";
import { getTestimonialsAndFAQsAction } from "@/modules/saas/actions/testimonial-faq.actions";
import { LandingSettingsForm } from "./landing-settings-form";
import { getSession } from "@/lib/auth/session";

import { serializeDecimal } from "@/lib/utils";

export default async function LandingSettingsPage() {
    const session = await getSession();
    if (!session || !session.tenantId) return null;

    // Busca dados do tenant
    const tenant = await prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: { slug: true }
    });

    if (!tenant) return null;

    // Busca configuração via action
    const configResult = await getLandingConfigAction();
    const config = configResult.data;

    // Busca testimonials e FAQs
    const contentResult = await getTestimonialsAndFAQsAction();
    const { testimonials, faqs } = contentResult.data || { testimonials: [], faqs: [] };

    // Busca planos do tenant atual para gerenciar visibilidade
    // O prisma já está com o contexto do tenant injetado pelo layout/auth
    const plans = await prisma.plan.findMany({
        orderBy: { price: "asc" }
    });

    const serializedPlans = serializeDecimal(plans);
    const serializedConfig = serializeDecimal(config);

    return (
        <div className="p-6 space-y-8">
            <div>
                <h2 className="text-xl font-bold text-foreground">Configuração do Site Público</h2>
                <p className="text-sm text-muted-foreground">Personalize como os clientes veem seu provedor na internet.</p>
            </div>

            <LandingSettingsForm
                initialConfig={serializedConfig}
                plans={serializedPlans}
                tenantSlug={tenant.slug}
                testimonials={testimonials}
                faqs={faqs}
            />
        </div>
    );
}

