import { getSession, type SessionPayload } from "@/lib/auth/session";
import { runWithTenant } from "@/shared/tenancy/tenancy.context";
import { serializeDecimal } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export type ActionState<T> = {
    data?: T;
    error?: string;
};

/**
 * Wrapper para Actions protegidas por autenticação e papéis (roles).
 * Configura automaticamente o contexto de multi-tenancy baseado na sessão.
 */
export function protectedAction<T, P = unknown>(
    allowedRoles: SessionPayload["role"][],
    handler: (data: P, session: SessionPayload) => Promise<T>
) {
    return async (data?: P): Promise<ActionState<T>> => {
        
        try {
            const session = await getSession();

            if (!session) {
                return { error: "Não autorizado. Por favor, faça login." };
            }

            if (!allowedRoles.includes(session.role)) {
                return { error: "Você não tem permissão para realizar esta ação." };
            }

            // Define o contexto do tenant se o slug estiver presente
            let tenantSlug = session.tenantSlug;

            // Fallback: Se tiver tenantId mas não tiver slug (ex: sessão antiga ou bug no impersonate)
            // buscamos o slug agora para garantir que as queries caiam no schema correto.
            if (!tenantSlug && session.tenantId && session.tenantId !== 'system') {
                console.warn(`[Tenancy] Session has tenantId ${session.tenantId} but missing tenantSlug. Performing fallback lookup.`);
                const tenant = await prisma.tenant.findUnique({
                    where: { id: session.tenantId },
                    select: { slug: true }
                });
                if (tenant) {
                    tenantSlug = tenant.slug;
                    // Note: We don't update the session/cookie here to avoid side-effects in a simple action wrapper,
                    // but we ensure the current request uses the correct schema.
                }
            }

            const tenantContext = tenantSlug ? {
                tenantId: session.tenantId || "system",
                schema: `tenant_${tenantSlug.replace(/-/g, '_')}`
            } : {
                tenantId: session.tenantId || "system",
                schema: "management"
            };

            
            // Executa o handler dentro do contexto de tenancy
            const result = await runWithTenant(tenantContext, async () => {
                
                return await handler(data as P, session);
            });

            // Serializa Decimais para compatibilidade com Client Components
            return { data: serializeDecimal(result) };
        } catch (error: unknown) {
            console.error("Erro na Action:", error);
            return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." };
        }
    };
}
