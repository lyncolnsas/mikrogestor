import { withApiAuth } from '@/lib/api/api-wrapper';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET /api/v1/support
 * 
 * Mimics MK-Auth chamado.api 'get_listar' or 'get_show'.
 */
export const GET = withApiAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id'); // uuid_suporte or chamado number
    const status = searchParams.get('status');

    try {
        if (id) {
            const ticket = await prisma.serviceOrder.findUnique({
                where: { id },
                include: { customer: true }
            });

            if (!ticket) {
                return NextResponse.json({ status: 'erro', mensagem: 'Chamado não encontrado' }, { status: 404 });
            }

            return NextResponse.json({
                chamado: ticket.id,
                uuid_suporte: ticket.id,
                assunto: ticket.subject,
                prioridade: ticket.priority.toLowerCase(),
                status: ticket.status === 'COMPLETED' ? 'fechado' : 'aberto',
                login: ticket.customer.email || ticket.customer.cpfCnpj,
                nome: ticket.customer.name,
                abertura: ticket.createdAt.toISOString(),
                fechamento: ticket.closedAt?.toISOString() || null,
                relatos: [
                    {
                        atendente: 'Sistema',
                        msg: ticket.description,
                        data: ticket.createdAt.toISOString()
                    }
                ]
            });
        }

        const whereClause: any = {};
        if (status === 'aberto') whereClause.status = { in: ['PENDING', 'IN_PROGRESS'] };
        if (status === 'fechado') whereClause.status = 'COMPLETED';

        const tickets = await prisma.serviceOrder.findMany({
            where: whereClause,
            include: { customer: true },
            orderBy: { createdAt: 'desc' }
        });

        const mappedTickets = tickets.map((t: any) => ({
            uuid: t.id,
            chamado: t.id.substring(0, 8),
            abertura: t.createdAt.toISOString(),
            login: t.customer.email || t.customer.cpfCnpj,
            nome: t.customer.name,
            assunto: t.subject,
            prioridade: t.priority.toLowerCase(),
            status: t.status === 'COMPLETED' ? 'fechado' : 'aberto'
        }));

        return NextResponse.json({
            status: 'sucesso',
            total_registros: tickets.length,
            chamados: mappedTickets
        });

    } catch (error) {
        console.error('❌ Error in Support API:', error);
        return NextResponse.json({ status: 'erro', mensagem: 'Erro interno' }, { status: 500 });
    }
});

/**
 * POST /api/v1/support
 * 
 * Mimics 'post_inserir' (Open Ticket)
 */
export const POST = withApiAuth(async (request) => {
    try {
        const body = await request.json();
        
        if (!body.customerId && !body.login) {
            return NextResponse.json({ status: 'erro', mensagem: 'Identificação do cliente é obrigatória' }, { status: 400 });
        }

        // Find customer if login was provided
        let customerId = body.customerId;
        if (body.login) {
            const customer = await prisma.customer.findFirst({
                where: { 
                    OR: [
                        { email: body.login },
                        { cpfCnpj: body.login }
                    ]
                }
            });
            if (!customer) return NextResponse.json({ status: 'erro', mensagem: 'Cliente não encontrado' }, { status: 404 });
            customerId = customer.id;
        }

        const newTicket = await prisma.serviceOrder.create({
            data: {
                customerId: customerId,
                subject: body.assunto || 'Suporte Geral',
                description: body.mensagem || body.relato || '',
                type: 'REPAIR', // Defaulting to Repair for general support
                priority: (body.prioridade?.toUpperCase() as any) || 'MEDIUM',
                status: 'PENDING',
                address: body.endereco || '',
                timeWindow: 'Qualquer horário'
            }
        });

        return NextResponse.json({
            status: 'sucesso',
            mensagem: 'Chamado aberto com sucesso',
            chamado: newTicket.id,
            uuid_suporte: newTicket.id
        });

    } catch (error) {
        console.error('❌ Error creating ticket:', error);
        return NextResponse.json({ status: 'erro', mensagem: 'Erro ao abrir chamado' }, { status: 500 });
    }
});

/**
 * PUT /api/v1/support
 * 
 * Mimics 'put_fechar' or 'put_editar'
 */
export const PUT = withApiAuth(async (request) => {
    try {
        const body = await request.json();
        const id = body.uuid || body.chamado;

        if (!id) return NextResponse.json({ status: 'erro', mensagem: 'ID do chamado é obrigatório' }, { status: 400 });

        const updateData: any = {};
        if (body.status === 'fechado') {
            updateData.status = 'COMPLETED';
            updateData.closedAt = new Date();
        }
        if (body.assunto) updateData.subject = body.assunto;
        if (body.prioridade) updateData.priority = body.prioridade.toUpperCase();

        const updated = await prisma.serviceOrder.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({
            status: 'sucesso',
            mensagem: 'Chamado atualizado com sucesso',
            dados: updated
        });

    } catch (error) {
        return NextResponse.json({ status: 'erro', mensagem: 'Chamado não encontrado ou erro ao atualizar' }, { status: 500 });
    }
});
