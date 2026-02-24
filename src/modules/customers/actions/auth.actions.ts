'use server';

import { z } from 'zod';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { runWithTenant } from '@/shared/tenancy/tenancy.context';
import { encrypt, getSession } from "@/lib/auth/session"; // Assuming this exists based on middleware
import { TENANT_HEADER } from "@/shared/tenancy/tenancy.middleware";

const loginSchema = z.object({
    cpf: z.string().min(11, "CPF inválido").transform(val => val.replace(/\D/g, '')),
});

type LoginState = { error: string } | null;

export async function loginWithCpf(prevState: LoginState, formData: FormData) {
    const cpfRaw = formData.get('cpf') as string;

    // 1. Validar Entrada
    const result = loginSchema.safeParse({ cpf: cpfRaw });
    if (!result.success) {
        return { error: 'CPF inválido. Verifique os números digitados.' };
    }
    const cpf = result.data.cpf;

    // 2. Identificar Tenant (Provedor)
    // Esperamos que o middleware tenha definido o header x-tenant-slug
    // ou precisamos resolvê-lo.
    // 2. Identificar Tenant (Provedor)
    const headerStore = await headers();
    let tenantSlug = headerStore.get(TENANT_HEADER);

    // Se não veio no header (acesso ppublico), tenta pegar do form
    if (!tenantSlug) {
        tenantSlug = formData.get('tenantSlug') as string;
    }

    if (!tenantSlug) {
        return { error: 'Não foi possível identificar o provedor de internet.' };
    }

    // 3. Buscar Assinante no Schema do Tenant
    // Precisamos envolver a chamada do prisma no contexto do tenant para que a extensão funcione.
    // Buscar o Tenant no schema de Gerenciamento primeiro para garantir existência.
    const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
        select: { id: true, slug: true, status: true }
    });

    if (!tenant) {
        return { error: 'Provedor não encontrado.' };
    }

    // Convenção: Assumimos que o nome do schema seja 'tenant_<slug_com_underscores>'
    const schema = `tenant_${tenantSlug.replaceAll('-', '_')}`;

    let customer = null;

    try {
        customer = await runWithTenant({ tenantId: tenant.id, schema }, async () => {
            return prisma.customer.findUnique({
                where: { cpfCnpj: cpf } // CPF é único por tenant
            });
        });
    } catch (err) {
        console.error("Erro no Login:", err);
        // Pode falhar se o schema não existir
        return { error: 'Erro ao buscar assinante. Tente novamente.' };
    }

    if (!customer) {
        return { error: 'CPF não encontrado neste provedor.' };
    }

    if (customer.status !== 'ACTIVE') {
        return { error: 'Assinatura inativa ou bloqueada. Entre em contato com o suporte.' };
    }

    // 4. Criar Sessão
    // Precisamos corresponder exatamente ao SessionPayload.
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const token = await encrypt({
        userId: customer.id,
        role: 'SUBSCRIBER',
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantStatus: tenant.status,
        expires
    });

    const cookieStore = await cookies();
    cookieStore.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        // maxAge?
    });

    redirect('/portal');
}

export async function logoutSubscriber() {
    const session = await getSession();
    const tenantSlug = session?.tenantSlug;

    const cookieStore = await cookies();
    cookieStore.delete('session');

    if (tenantSlug) {
        redirect(`/p/${tenantSlug}`);
    }

    redirect('/');
}
