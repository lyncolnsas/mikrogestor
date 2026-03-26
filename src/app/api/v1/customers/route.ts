import { withApiAuth } from '@/lib/api/api-wrapper';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET /api/v1/customers
 * 
 * Mimics MK-Auth cliente.api 'get_listar' functionality.
 */
export const GET = withApiAuth(async (request, _params) => {
    try {
        const customers = await prisma.customer.findMany({
            include: {
                plan: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Explicitly type the customer iterator using Prisma's generated types
        const mappedCustomers = customers.map((customer: any) => ({
            uuid_cliente: customer.id,
            login: customer.email || customer.cpfCnpj,
            nome: customer.name,
            cpf_cnpj: customer.cpfCnpj,
            celular: customer.phone,
            status_corte: customer.status === 'ACTIVE' ? 'liberado' : 'bloqueado',
            cli_ativado: customer.status === 'ACTIVE' ? 's' : 'n',
            plano: customer.plan?.name || 'Sem Plano',
            valor: customer.plan?.price.toString() || '0.00',
            endereco: customer.street || '',
            bairro: customer.neighborhood || '',
            cidade: customer.city || '',
            estado: customer.state || '',
            cep: customer.zipCode || '',
            numero: customer.number || '',
            uuid: customer.id
        }));

        return NextResponse.json({
            status: 'sucesso',
            total_registros: customers.length,
            clientes: mappedCustomers
        });

    } catch (error) {
        console.error('❌ Error in Customers API:', error);
        return NextResponse.json({ status: 'erro', mensagem: 'Falha ao recuperar registros' }, { status: 500 });
    }
});

/**
 * POST /api/v1/customers
 */
export const POST = withApiAuth(async (request) => {
    try {
        const body = await request.json();
        
        if (!body.nome || !body.cpf_cnpj) {
            return NextResponse.json({ status: 'erro', mensagem: 'Campos nome e cpf_cnpj são obrigatórios.' }, { status: 400 });
        }

        const newCustomer = await prisma.customer.create({
            data: {
                name: body.nome,
                cpfCnpj: body.cpf_cnpj,
                email: body.email || null,
                phone: body.celular || body.telefone || null,
                radiusPassword: body.senha || null,
                street: body.endereco || '',
                number: body.numero || '',
                neighborhood: body.bairro || '',
                city: body.cidade || '',
                state: body.estado || '',
                zipCode: body.cep || '',
                status: 'ACTIVE'
            }
        });

        return NextResponse.json({
            status: 'sucesso',
            mensagem: 'Cliente cadastrado com sucesso!',
            id: newCustomer.id
        });

    } catch (error: any) {
        return NextResponse.json({ 
            status: 'erro', 
            mensagem: error.code === 'P2002' ? 'CPF/CNPJ já cadastrado' : 'Erro interno' 
        }, { status: 500 });
    }
});
