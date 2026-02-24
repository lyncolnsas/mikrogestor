import { NextRequest, NextResponse } from 'next/server';

export const TENANT_HEADER = 'x-tenant-slug';

/**
 * Middleware para identificação e propagação do contexto de tenant.
 */
export function tenancyMiddleware(request: NextRequest) {
    // 1. Extração: Lê o slug do tenant do header (ou futuramente do subdomínio)
    const tenantSlug = request.headers.get(TENANT_HEADER);

    // Nota: A verificação contra o banco de dados geralmente ocorre na camada de API
    // ou via um serviço de cache se quisermos bloquear o acesso precocemente.
    // Por enquanto, apenas propagamos o valor.

    const response = NextResponse.next();

    // Garante que o header seja propagado (útil para rewrites de subdomínio)
    if (tenantSlug) {
        response.headers.set(TENANT_HEADER, tenantSlug);
    }

    return response;
}
