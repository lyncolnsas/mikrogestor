import { NextResponse } from 'next/server';

export async function GET() {
    // Mock data representing customers in the ISP Panel
    const customers = [
        {
            id: "1",
            name: "João Silva",
            cpfCnpj: "123.456.789-00",
            status: "online",
        },
        {
            id: "2",
            name: "Maria Oliveira",
            cpfCnpj: "987.654.321-11",
            status: "offline",
        },
        {
            id: "3",
            name: "Empresa de Transportes LTDA",
            cpfCnpj: "12.345.678/0001-99",
            status: "blocked",
        },
        {
            id: "4",
            name: "Ricardo Santos",
            cpfCnpj: "456.789.123-55",
            status: "online",
        },
        {
            id: "5",
            name: "Ana Costa",
            cpfCnpj: "321.654.987-88",
            status: "online",
        }
    ];

    return NextResponse.json(customers);
}
