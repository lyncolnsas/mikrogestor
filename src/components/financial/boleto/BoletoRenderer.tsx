import React from 'react';

interface AccountInfo {
    bankCode: string; // Ex: 001, 104, 341
    bankName: string;
    logoUrl?: string;
    agencia: string;
    conta: string;
    dvConta: string;
    beneficiario: string;
    cnpj: string;
}

interface BoletoProps {
    account: AccountInfo;
    nossoNumero: string;
    vencimento: string;
    emissao: string;
    valor: string;
    linhaDigitavel: string;
    barcodeValue: string;
    sacado: {
        nome: string;
        documento: string;
        endereco: string;
    };
    instrucoes: string[];
}

/**
 * Componente Visual para Impressão de Boletos (Padrão FEBRABAN)
 */
export const BoletoRenderer: React.FC<BoletoProps> = ({
    account,
    nossoNumero,
    vencimento,
    emissao,
    valor,
    linhaDigitavel,
    barcodeValue,
    sacado,
    instrucoes
}) => {
    return (
        <div className="max-w-[800px] mx-auto p-4 bg-white text-black font-sans text-xs border border-gray-200">
            {/* Header / Banco */}
            <div className="flex items-center border-b-2 border-black pb-2 mb-4">
                <div className="w-1/4">
                   <span className="font-bold text-lg">{account.bankName}</span>
                </div>
                <div className="w-1/6 border-x-2 border-black px-4 text-center">
                    <span className="font-bold text-xl">{account.bankCode}</span>
                </div>
                <div className="flex-1 pl-4 text-right">
                    <span className="font-bold text-lg">{linhaDigitavel}</span>
                </div>
            </div>

            {/* Recibo do Pagador */}
            <div className="grid grid-cols-6 border border-black mb-10">
                <div className="col-span-4 p-2 border-b border-r border-black">
                   <p className="text-[9px] uppercase">Local de Pagamento</p>
                   <p className="font-bold">Pagável em qualquer banco até o vencimento</p>
                </div>
                <div className="col-span-2 p-2 border-b border-black bg-gray-50">
                   <p className="text-[9px] uppercase">Vencimento</p>
                   <p className="font-bold text-right">{vencimento}</p>
                </div>

                <div className="col-span-4 p-2 border-b border-r border-black">
                   <p className="text-[9px] uppercase">Beneficiário</p>
                   <p className="font-bold">{account.beneficiario}</p>
                </div>
                <div className="col-span-2 p-2 border-b border-black">
                   <p className="text-[9px] uppercase">Agência/Código Beneficiário</p>
                   <p className="font-bold text-right">{account.agencia} / {account.conta}-{account.dvConta}</p>
                </div>

                <div className="col-span-1 p-2 border-b border-r border-black">
                    <p className="text-[9px] uppercase">Data do Doc.</p>
                    <p className="font-bold">{emissao}</p>
                </div>
                <div className="col-span-1 p-2 border-b border-r border-black">
                    <p className="text-[9px] uppercase">Nº do Doc.</p>
                    <p className="font-bold">{nossoNumero}</p>
                </div>
                <div className="col-span-1 p-2 border-b border-r border-black">
                    <p className="text-[9px] uppercase">Espécie Doc.</p>
                    <p className="font-bold">DM</p>
                </div>
                <div className="col-span-1 p-2 border-b border-r border-black">
                    <p className="text-[9px] uppercase">Aceite</p>
                    <p className="font-bold">N</p>
                </div>
                <div className="col-span-2 p-2 border-b border-black bg-gray-50">
                    <p className="text-[9px] uppercase">Valor do Doc.</p>
                    <p className="font-bold text-right">{valor}</p>
                </div>

                <div className="col-span-4 p-4 min-h-[100px] border-r border-black">
                   <p className="text-[9px] uppercase mb-2">Instruções</p>
                   {instrucoes.map((ins, i) => (
                       <p key={i}>{ins}</p>
                   ))}
                </div>
                <div className="col-span-2">
                   <div className="p-2 border-b border-black h-1/2">
                       <p className="text-[9px] uppercase">(-) Descontos / Abatimentos</p>
                   </div>
                   <div className="p-2 border-black h-1/2">
                       <p className="text-[9px] uppercase">(+) Juros / Multas</p>
                   </div>
                </div>

                <div className="col-span-6 p-4 border-t border-black bg-gray-100">
                    <p className="text-[9px] uppercase">Pagador</p>
                    <p className="font-bold">{sacado.nome} - {sacado.documento}</p>
                    <p>{sacado.endereco}</p>
                </div>
            </div>

            {/* Código de Barras (Representação Simbolica) */}
            <div className="mt-4 flex flex-col items-center">
                <div className="w-full h-12 bg-black flex items-center justify-center text-white font-mono text-xs">
                    [ CÓDIGO DE BARRAS: {barcodeValue} ]
                </div>
                <p className="mt-2 text-gray-500 font-mono">AUTENTICAÇÃO MECÂNICA - FICHA DE COMPENSAÇÃO</p>
            </div>
            
            <div className="mt-4 border-t-2 border-dotted border-gray-400 pt-2 text-center text-gray-400 italic">
                Corte aqui para separar o recibo
            </div>
        </div>
    );
};
