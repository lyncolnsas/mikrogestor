"use server";

import { prisma } from "@/lib/prisma";
import { SchemaService } from "@/shared/tenancy/schema.service";
import { VpnService } from "@/modules/saas/services/vpn.service";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { ProvisioningService } from "@/modules/saas/services/provisioning.service";
import { redirect } from "next/navigation";
import { createSession, deleteSession, getSession } from "@/lib/auth/session";

const registerSchema = z.object({
    name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string(),
    slug: z.string().min(3, "O slug deve ter pelo menos 3 caracteres").regex(/^[a-z0-9-]+$/, "O slug deve conter apenas letras minúsculas, números e hífens"),
    planId: z.string().min(1, "Plano inválido ou não selecionado"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
});

/**
 * Registra um novo usuário e provisiona um ambiente SaaS completo.
 */
export async function registerUser(prevState: unknown, formData: FormData) {
    const data = Object.fromEntries(formData.entries());
    const result = registerSchema.safeParse(data);

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors };
    }

    const { name, email, password, planId, slug } = result.data;

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return { error: { email: ["Este email já está em uso."] } };
        }

        const existingTenant = await prisma.tenant.findUnique({
            where: { slug },
        });

        if (existingTenant) {
            return { error: { slug: ["Este slug já está em uso."] } };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        try {
            // Use ProvisioningService for consistent flow
            await ProvisioningService.provision({
                name: `Empresa de ${name}`,
                slug: slug,
                adminEmail: email,
                adminPassword: password,
                planId: planId,
                financialConfig: {
                    interestRate: 1,
                    penaltyAmount: 2,
                    gracePeriod: 5,
                    autoBlock: true,
                    autoUnblock: true,
                }
            });

        } catch (error) {
            console.error("Erro no registro/provisionamento:", error);
            return { error: { _form: ["Erro ao provisionar seu ambiente. Tente novamente."] } };
        }

    } catch (error) {
        console.error("Erro no registro:", error);
        return { error: { _form: ["Erro ao criar conta. Tente novamente mais tarde."] } };
    }

    redirect("/auth/login?registered=true");
}

const loginSchema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(1, "Senha é obrigatória"),
});

/**
 * Autentica o usuário e inicia a sessão com o contexto do tenant.
 */
export async function loginUser(prevState: unknown, formData: FormData) {
    const data = Object.fromEntries(formData.entries());
    const result = loginSchema.safeParse(data);

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors };
    }

    const { email, password } = result.data;

    try {
        

        const user = await prisma.user.findUnique({
            where: { email },
            include: { tenant: true }
        });

        if (!user || !user.password) {
            
            return { error: { _form: ["Credenciais inválidas."] } };
        }

        

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            
            return { error: { _form: ["Credenciais inválidas."] } };
        }

        const role = user.role;
        const tenantStatus = user.tenant?.status;
        const tenantSlug = user.tenant?.slug;

        

        await createSession({
            userId: user.id,
            email: user.email,
            role: role,
            tenantId: user.tenantId || undefined,
            tenantSlug: tenantSlug,
            tenantStatus: tenantStatus
        });

        

        if (role === "SUPER_ADMIN") {
            redirect("/saas-admin/tower");
        } else if (role === "ISP_ADMIN") {
            redirect("/overview");
        } else if (role === "TECHNICIAN") {
            redirect("/technician/dashboard");
        } else {
            redirect("/overview");
        }

    } catch (error: unknown) {
        if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error;
        console.error("[Login] Erro detalhado no login:", error);
        console.error("[Login] Stack trace:", (error as Error).stack);
        return { error: { _form: ["Erro ao realizar login. Tente novamente."] } };
    }
}

/**
 * Encerra a sessão do usuário.
 */
export async function logoutUser() {
    const session = await getSession();
    const tenantSlug = session?.tenantSlug;
    await deleteSession();

    if (tenantSlug) {
        redirect(`/p/${tenantSlug}`);
    }

    redirect("/");
}
const forgotPasswordSchema = z.object({
    email: z.string().email("Email inválido"),
});

/**
 * Envia um email para recuperação de senha.
 */
export async function forgotPassword(prevState: unknown, formData: FormData) {
    const data = Object.fromEntries(formData.entries());
    const result = forgotPasswordSchema.safeParse(data);

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors };
    }

    const { email } = result.data;

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        // For security reasons, we should not reveal if the email exists or not.
        // However, we can log it internally.
        if (!user) {
            
            return { error: { email: ["Este email não está cadastrado em nossa base."] } };
        }

        

        // TODO: Implement real email sending service (e.g. Resend, NodeMailer)
        // For now, we simulate the logic.

        // const resetToken = await generateResetToken(user.id);
        // await sendResetEmail(user.email, resetToken);

        return { success: "Se este email estiver cadastrado, você receberá um link para redefinir sua senha." };

    } catch (error) {
        console.error("[ForgotPassword] Erro:", error);
        return { error: { _form: ["Erro ao processar solicitação. Tente novamente."] } };
    }
}
