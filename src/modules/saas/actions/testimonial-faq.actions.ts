"use server";

import { prisma } from "@/lib/prisma";
import { protectedAction } from "@/lib/api/action-wrapper";
import { revalidatePath } from "next/cache";
import * as z from "zod";

// Testimonial Actions
const testimonialSchema = z.object({
    customerName: z.string().min(2, "Nome muito curto"),
    customerRole: z.string().optional(),
    content: z.string().min(5, "Depoimento muito curto"),
    rating: z.number().int().min(1).max(5).default(5),
    avatarUrl: z.string().url("URL inválida").optional().or(z.literal("")),
});

export const createTestimonialAction = protectedAction(
    ["ISP_ADMIN"],
    async (input: z.infer<typeof testimonialSchema>, session) => {
        const tenantId = session.tenantId;
        if (!tenantId) throw new Error("Tenant não identificado");

        const data = testimonialSchema.parse(input);

        // Get landing config
        const config = await prisma.landingConfig.findUnique({
            where: { tenantId }
        });

        if (!config) throw new Error("Configuração de landing page não encontrada");

        const testimonial = await prisma.testimonial.create({
            data: {
                ...data,
                landingConfigId: config.id
            }
        });

        revalidatePath("/settings/landing");
        revalidatePath(`/p/${session.tenantSlug}`);
        return testimonial;
    }
);

const updateTestimonialSchema = testimonialSchema.extend({
    id: z.string().uuid("ID inválido"),
});

export const updateTestimonialAction = protectedAction(
    ["ISP_ADMIN"],
    async (input: z.infer<typeof updateTestimonialSchema>, session) => {
        const tenantId = session.tenantId;
        if (!tenantId) throw new Error("Tenant não identificado");

        const data = updateTestimonialSchema.parse(input);
        const { id, ...updateData } = data;

        // Verify ownership
        const existing = await prisma.testimonial.findUnique({
            where: { id },
            include: { landingConfig: true }
        });

        if (!existing || existing.landingConfig.tenantId !== tenantId) {
            throw new Error("Depoimento não encontrado ou sem permissão");
        }

        const testimonial = await prisma.testimonial.update({
            where: { id },
            data: updateData
        });

        revalidatePath("/settings/landing");
        revalidatePath(`/p/${session.tenantSlug}`);
        return testimonial;
    }
);

export const deleteTestimonialAction = protectedAction(
    ["ISP_ADMIN"],
    async (testimonialId: string, session) => {
        await prisma.testimonial.delete({
            where: { id: testimonialId }
        });

        revalidatePath("/settings/landing");
        revalidatePath(`/p/${session.tenantSlug}`);
        return { success: true };
    }
);

// FAQ Actions
const faqSchema = z.object({
    question: z.string().min(5, "Pergunta muito curta"),
    answer: z.string().min(10, "Resposta muito curta"),
    order: z.number().int().default(0),
});

export const createFAQAction = protectedAction(
    ["ISP_ADMIN"],
    async (input: z.infer<typeof faqSchema>, session) => {
        const tenantId = session.tenantId;
        if (!tenantId) throw new Error("Tenant não identificado");

        const data = faqSchema.parse(input);

        // Get landing config
        const config = await prisma.landingConfig.findUnique({
            where: { tenantId }
        });

        if (!config) throw new Error("Configuração de landing page não encontrada");

        const faq = await prisma.fAQ.create({
            data: {
                ...data,
                landingConfigId: config.id
            }
        });

        revalidatePath("/settings/landing");
        revalidatePath(`/p/${session.tenantSlug}`);
        return faq;
    }
);

export const deleteFAQAction = protectedAction(
    ["ISP_ADMIN"],
    async (faqId: string, session) => {
        await prisma.fAQ.delete({
            where: { id: faqId }
        });

        revalidatePath("/settings/landing");
        revalidatePath(`/p/${session.tenantSlug}`);
        return { success: true };
    }
);

export const getTestimonialsAndFAQsAction = protectedAction(
    ["ISP_ADMIN"],
    async (_, session) => {
        const tenantId = session.tenantId;
        if (!tenantId) return { testimonials: [], faqs: [] };

        const config = await prisma.landingConfig.findUnique({
            where: { tenantId },
            include: {
                testimonials: {
                    orderBy: { createdAt: "desc" }
                },
                faqs: {
                    orderBy: { order: "asc" }
                }
            }
        });

        return {
            testimonials: config?.testimonials || [],
            faqs: config?.faqs || []
        };
    }
);
