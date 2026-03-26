"use server"

import { prisma } from "@/lib/prisma";
import { protectedAction } from "@/lib/api/action-wrapper";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const subscriberProfileSchema = z.object({
    name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
    phone: z.string().min(10, "Telefone inválido (mínimo 10 dígitos)"),
    email: z.string().email("E-mail inválido"),
    street: z.string().min(1, "A rua é obrigatória"),
    number: z.string().min(1, "O número é obrigatório"),
    neighborhood: z.string().min(1, "O bairro é obrigatório"),
    city: z.string().min(1, "A cidade é obrigatória"),
    state: z.string().min(2, "O estado (UF) é obrigatório").max(2, "Use apenas a sigla (ex: SP)"),
    zipCode: z.string().min(8, "CEP inválido (mínimo 8 dígitos)"),
});

/**
 * Atualiza o perfil do assinante logado.
 */
export const updateSubscriberProfileAction = protectedAction(
    ["SUBSCRIBER"],
    async (input: unknown, session) => {
        // Validar dados
        const result = subscriberProfileSchema.safeParse(input);

        if (!result.success) {
            const errors = result.error.flatten().fieldErrors;
            throw new Error(Object.values(errors).flat().join(", "));
        }

        const data = result.data;

        // Atualizar no banco de dados
        // protectedAction já configura o runWithTenant internamente
        const customer = await prisma.customer.update({
            where: { id: session.userId },
            data: {
                name: data.name,
                phone: data.phone,
                email: data.email,
                street: data.street,
                number: data.number,
                neighborhood: data.neighborhood,
                city: data.city,
                state: data.state,
                zipCode: data.zipCode
            }
        });

        revalidatePath("/portal");
        revalidatePath("/profile");

        return customer;
    }
);
