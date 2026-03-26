import { withApiAuth } from '@/lib/api/api-wrapper';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET /api/v1/billing
 * 
 * Mimics MK-Auth titulo.api 'get_listar' or 'get_titulos' functionality.
 */
export const GET = withApiAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const cpfCnpj = searchParams.get('cpf_cnpj');
    const status = searchParams.get('status');

    try {
        const whereClause: any = {};
        
        if (customerId) whereClause.customerId = customerId;
        if (cpfCnpj) whereClause.customer = { cpfCnpj };
        
        if (status) {
            if (status === 'aberto') whereClause.status = 'OPEN';
            if (status === 'pago') whereClause.status = 'PAID';
            if (status === 'vencido') whereClause.status = 'OVERDUE';
        }

        const invoices = await prisma.invoice.findMany({
            where: whereClause,
            include: {
                customer: true
            },
            orderBy: {
                dueDate: 'desc'
            }
        });

        const mappedInvoices = invoices.map((inv: any) => ({
            uuid_lanc: inv.id,
            id: inv.id,
            titulo: inv.id.substring(0, 8),
            valor: inv.total.toString(),
            valorpag: inv.status === 'PAID' ? inv.total.toString() : '0.00',
            datavenc: inv.dueDate.toISOString().split('T')[0],
            datapag: inv.paidAt ? inv.paidAt.toISOString().split('T')[0] : null,
            status: inv.status === 'PAID' ? 'pago' : (inv.status === 'OVERDUE' ? 'vencido' : 'aberto'),
            linhadig: '',
            login: inv.customer?.email || inv.customer?.cpfCnpj || 'api',
            nome: inv.customer?.name || 'Cliente API',
            pix_link: inv.paymentUrl || '',
            uuid: inv.id
        }));

        return NextResponse.json({
            status: 'sucesso',
            total: invoices.length,
            titulos: mappedInvoices
        });

    } catch (error) {
        console.error('❌ Error in Billing API:', error);
        return NextResponse.json({ status: 'erro', mensagem: 'Erro interno' }, { status: 500 });
    }
});

/**
 * PUT /api/v1/billing/receive
 */
export const PUT = withApiAuth(async (request) => {
    try {
        const body = await request.json();
        const uuid = body.uuid || body.uuid_lanc;

        if (!uuid) {
            return NextResponse.json({ status: 'erro', mensagem: 'UUID é obrigatório' }, { status: 400 });
        }

        const updatedInvoice = await prisma.invoice.update({
            where: { id: uuid },
            data: {
                status: 'PAID',
                paidAt: new Date(),
                paymentId: body.forma || 'API_MANUAL'
            }
        });

        return NextResponse.json({
            status: 'sucesso',
            mensagem: 'Título liquidado com sucesso!',
            dados: updatedInvoice
        });

    } catch (error) {
        return NextResponse.json({ status: 'erro', mensagem: 'Erro ao liquidar título' }, { status: 500 });
    }
});
