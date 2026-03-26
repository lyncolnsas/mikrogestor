import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runWithTenant } from '@/shared/tenancy/tenancy.context';

export type ApiHandler = (req: NextRequest, { params }: { params: any }, tenantId: string) => Promise<Response>;

/**
 * Unified API Wrapper for mikrogestor v1 (Migrated from MK-Auth)
 */
export function withApiAuth(handler: ApiHandler) {
    return async (request: NextRequest, { params }: { params: any }) => {
        try {
            // 1. Get API Key from headers (X-API-Key)
            const apiKey = request.headers.get('x-api-key');

            if (!apiKey) {
                return NextResponse.json({ 
                    status: 'erro', 
                    mensagem: 'X-API-Key não fornecida nos cabeçalhos' 
                }, { status: 401 });
            }

            // 2. Find the user linked to this key (on the management schema)
            // Querying without tenant context yet because we need to find WHERE to go
            const user = await prisma.user.findFirst({
                where: { apiKey: apiKey },
                include: { tenant: true }
            });

            if (!user || !user.tenant) {
                return NextResponse.json({ 
                    status: 'erro', 
                    mensagem: 'Chave de API inválida ou não associada a um Provedor (ISP)' 
                }, { status: 403 });
            }

            // 3. Setup Tenancy Context
            const tenantContext = {
                tenantId: user.tenant.id,
                schema: `tenant_${user.tenant.slug.replace(/-/g, '_')}`
            };

            // 4. Run handler within the tenant context (Prisma Tenancy Extension will auto-SET search_path)
            return await runWithTenant(tenantContext, async () => {
                return await handler(request, { params }, user.tenant!.id);
            });

        } catch (error: any) {
            console.error('❌ API Error in withApiAuth wrapper:', error);
            return NextResponse.json({ 
                status: 'erro', 
                mensagem: 'Erro interno ao processar requisição API' 
            }, { status: 500 });
        }
    };
}
