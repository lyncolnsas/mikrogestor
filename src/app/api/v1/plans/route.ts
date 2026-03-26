import { withApiAuth } from '@/lib/api/api-wrapper';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET /api/v1/plans
 * 
 * Mimics MK-Auth plano.api 'get_listar' functionality.
 */
export const GET = withApiAuth(async () => {
    try {
        const plans = await prisma.plan.findMany({
            orderBy: { price: 'asc' }
        });

        const mappedPlans = plans.map((p: any) => ({
            uuid_plano: p.id,
            nome: p.name,
            valor: p.price.toString(),
            velocidade: p.download.toString(),
            burst_limit: (p as any).burstLimit || '0/0',
            upload: p.upload.toString(),
            download: p.download.toString(),
            uuid: p.id
        }));

        return NextResponse.json({
            status: 'sucesso',
            total_registros: plans.length,
            planos: mappedPlans
        });

    } catch (error) {
        console.error('❌ Error in Plans API:', error);
        return NextResponse.json({ status: 'erro', mensagem: 'Erro interno ao recuperar planos' }, { status: 500 });
    }
});
