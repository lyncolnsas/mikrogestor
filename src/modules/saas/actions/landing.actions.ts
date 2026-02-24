"use server";

import { prisma } from "@/lib/prisma";
import { protectedAction } from "@/lib/api/action-wrapper";
import { revalidatePath } from "next/cache";
import * as z from "zod";

const landingConfigSchema = z.object({
    title: z.string().min(3, "Título é muito curto"),
    subtitle: z.string().nullish(),
    heroDescription: z.string().nullish(),
    primaryColor: z.string().min(3, "Cor inválida"),
    secondaryColor: z.string().min(3, "Cor inválida"),
    logoUrl: z.string().nullish(),
    bannerUrl: z.string().nullish(),
    bannerUrls: z.array(z.string()).optional().default([]),
    whatsapp: z.string().nullish(),
    address: z.string().nullish(),
    showCoverageChecker: z.boolean().default(true),
    showTestimonials: z.boolean().default(true),
    showFAQ: z.boolean().default(true),
    showFloatingCTA: z.boolean().default(true),
    isActive: z.boolean().default(true),
});

/**
 * Obtém a configuração de landing page do tenant atual
 */
export const getLandingConfigAction = protectedAction(
    ["ISP_ADMIN"],
    async (_, session) => {
        const tenantId = session.tenantId;
        if (!tenantId) return null;

        let config = await prisma.landingConfig.findUnique({
            where: { tenantId }
        });

        // Se não existir, cria uma padrão
        if (!config) {
            config = await prisma.landingConfig.create({
                data: {
                    tenantId,
                    title: "Nossa Internet",
                    subtitle: "A melhor conexão para você e sua família.",
                    primaryColor: "#2563eb",
                    secondaryColor: "#10b981",
                }
            });
        }

        return config;
    }
);

/**
 * Atualiza a configuração de landing page
 */
export const updateLandingConfigAction = protectedAction(
    ["ISP_ADMIN"],
    async (input: z.infer<typeof landingConfigSchema>, session) => {
        const tenantId = session.tenantId;
        if (!tenantId) throw new Error("Tenant não identificado");

        const data = landingConfigSchema.parse(input);

        const config = await prisma.landingConfig.upsert({
            where: { tenantId },
            update: data,
            create: {
                ...data,
                tenantId
            }
        });

        revalidatePath("/settings/landing");
        revalidatePath(`/p/${session.tenantSlug}`);
        return config;
    }
);

/**
 * Altera a visibilidade de um plano na landing page
 */
export const togglePlanVisibilityAction = protectedAction(
    ["ISP_ADMIN"],
    async ({ planId, show }: { planId: string, show: boolean }, session) => {
        const result = await prisma.plan.update({
            where: { id: planId },
            data: { showOnLanding: show }
        });

        revalidatePath("/settings/landing");
        revalidatePath(`/p/${session.tenantSlug}`);
        return result;
    }
);

/**
 * Busca dados públicos para a Landing Page de um Tenant
 * (Não usa protetionAction pois é público)
 */
export async function getPublicLandingDataAction(slug: string) {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { slug },
            include: {
                landingConfig: {
                    include: {
                        testimonials: {
                            orderBy: { createdAt: "desc" },
                            take: 6
                        },
                        faqs: {
                            orderBy: { order: "asc" }
                        }
                    }
                },
            }
        });

        if (!tenant || !tenant.landingConfig?.isActive) {
            return null;
        }

        // Busca planos marcados para exibição
        // Precisamos rodar isso no contexto do tenant
        const schemaName = `tenant_${slug.replace(/-/g, '_')}`;
        const { runWithTenant } = await import("@/shared/tenancy/tenancy.context");

        const plans = await runWithTenant({ tenantId: tenant.id, schema: schemaName }, async () => {
            return await prisma.plan.findMany({
                where: {
                    isActive: true,
                    showOnLanding: true
                },
                orderBy: { price: "asc" }
            });
        });

        // Serializar Decimal para evitar erro de serialização em Client Components
        const { serializeDecimal } = await import("@/lib/utils");

        return {
            tenant: {
                name: tenant.name,
                slug: tenant.slug,
            },
            config: tenant.landingConfig,
            plans: serializeDecimal(plans),
            testimonials: tenant.landingConfig.testimonials,
            faqs: tenant.landingConfig.faqs
        };
    } catch (error) {
        console.error("Erro ao buscar dados da landing:", error);
        return null;
    }
}
