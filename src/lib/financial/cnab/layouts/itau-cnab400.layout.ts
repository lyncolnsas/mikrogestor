import { CNABEngine } from '../cnab-engine';

/**
 * Layout CNAB 400 - Itaú (Cobrança Escritural)
 */
export class ItauCNAB400Layout {
    /**
     * Header do Arquivo (Registro 0)
     */
    static generateHeader(config: {
        agencia: string;
        conta: string;
        dvConta: string;
        empresaNome: string;
        data: Date;
        sequencial: number;
    }): string {
        let line = "";
        line += "0"; // Registro 0
        line += "1"; // Remessa
        line += "REMESSA"; // Literal
        line += "01"; // Cobrança
        line += "COBRANCA       "; // Literal
        line += CNABEngine.numerico(config.agencia, 4);
        line += "00"; // Branco
        line += CNABEngine.numerico(config.conta, 5);
        line += CNABEngine.numerico(config.dvConta, 1);
        line += CNABEngine.alfanumerico("", 8); // Branco
        line += CNABEngine.alfanumerico(config.empresaNome, 30);
        line += "341"; // Banco Itaú
        line += "BANCO ITAU SA  "; // Literal
        line += CNABEngine.data(config.data, 'DDMMAA');
        line += CNABEngine.numerico("", 294); // Branco
        line += CNABEngine.numerico(config.sequencial, 6);
        return line.padEnd(400, " ");
    }

    /**
     * Detalhe (Registro 1)
     */
    static generateDetail(item: {
        sequencial: number;
        agencia: string;
        conta: string;
        dvConta: string;
        carteira: string; // Ex: 109, 112
        nossoNumero: string; // 8 posições
        numeroDoc: string;
        vencimento: Date;
        valor: number;
        emissao: Date;
        sacadoNome: string;
        sacadoDocumento: string;
        sacadoEndereco: string;
        sacadoCep: string;
    }): string {
        let line = "";
        line += "1"; // Registro 1
        line += "02"; // Empresa: 02-CGC/CPF
        line += CNABEngine.numerico(item.sacadoDocumento, 14);
        line += CNABEngine.numerico(item.agencia, 4);
        line += "00"; // Zeros
        line += CNABEngine.numerico(item.conta, 5);
        line += CNABEngine.numerico(item.dvConta, 1);
        line += CNABEngine.alfanumerico("", 4); // Branco
        line += "0000"; // Cod. Instrução
        line += CNABEngine.alfanumerico(item.numeroDoc, 25); // Documento
        line += CNABEngine.numerico(item.nossoNumero, 8);
        line += CNABEngine.numerico("", 13); // Quantidade
        line += CNABEngine.numerico(item.carteira, 3);
        line += CNABEngine.alfanumerico("", 21); // Branco
        line += " "; // Código Ocorrencia
        line += "01"; // Movimento: 01 (Remessa)
        line += CNABEngine.alfanumerico(item.numeroDoc, 10);
        line += CNABEngine.data(item.vencimento, 'DDMMAA');
        line += CNABEngine.monetario(item.valor, 13);
        line += "341"; // Banco
        line += "00000"; // Agência Cobradora
        line += "01"; // Espécie: 01-DM
        line += "N"; // Aceite
        line += CNABEngine.data(item.emissao, 'DDMMAA');
        line += "01"; // Tipo Doc
        line += "00"; // Instrução 1
        line += "00"; // Instrução 2
        line += CNABEngine.numerico(item.sacadoDocumento, 14);
        line += CNABEngine.alfanumerico(item.sacadoNome, 40);
        line += CNABEngine.alfanumerico(item.sacadoEndereco, 40);
        line += CNABEngine.alfanumerico("", 12); // Bairro
        line += CNABEngine.numerico(item.sacadoCep, 8);
        line += CNABEngine.alfanumerico("", 15); // Cidade/Estado
        line += CNABEngine.numerico(item.sequencial, 6);
        return line.padEnd(400, " ");
    }
}
