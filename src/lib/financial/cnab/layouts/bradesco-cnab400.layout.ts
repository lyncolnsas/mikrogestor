import { CNABEngine } from '../cnab-engine';

/**
 * Layout CNAB 400 - Bradesco (Cobrança Simples)
 */
export class BradescoCNAB400Layout {
    /**
     * Header do Arquivo (Registro 0)
     */
    static generateHeader(config: {
        agencia: string;
        conta: string;
        dvConta: string;
        empresaNome: string;
        empresaCodigo: string; // Código de Empresa no Bradesco
        data: Date;
        sequencial: number;
    }): string {
        let line = "";
        line += "0"; // Identificação Registro
        line += "1"; // Operação: 1-Remessa
        line += "REMESSA"; // Literal Remessa
        line += "01"; // Código de Serviço: 01-Cobranca
        line += "COBRANCA       "; // Literal Cobrança
        line += CNABEngine.numerico(config.empresaCodigo, 20); // Código da Empresa
        line += CNABEngine.alfanumerico(config.empresaNome, 30);
        line += "237"; // Banco Bradesco
        line += "BRADESCO       "; // Literal Banco
        line += CNABEngine.data(config.data, 'DDMMAA');
        line += CNABEngine.numerico("", 8); // Branco
        line += "MX"; // Identificação do Sistema: MX
        line += CNABEngine.numerico(config.sequencial, 7);
        line += CNABEngine.numerico("", 277); // Brancos
        line += CNABEngine.numerico(config.sequencial, 6); // Seq. Arquivo
        return line.padEnd(400, " ");
    }

    /**
     * Registro de Transação (Registro 1) - Detalhe do Título
     */
    static generateDetail(item: {
        sequencial: number;
        agencia: string;
        conta: string;
        dvConta: string;
        carteira: string; // Ex: 09 (Simples)
        beneficiarioCodigo: string;
        nossoNumero: string; // 11 posições
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
        line += "1"; // Identificação Registro: Detalhe
        line += "00000"; // Agência de Débito
        line += " "; // Digito Agência
        line += "00000"; // Razão da Conta
        line += "00000"; // Conta Corrente
        line += " "; // Digito Conta
        line += "0"; // Identificação Empresa (Branco)
        line += CNABEngine.numerico(item.carteira, 3); // Carteira
        line += CNABEngine.numerico(item.agencia, 5);
        line += CNABEngine.numerico(item.conta, 7);
        line += CNABEngine.alfanumerico(item.dvConta, 1);
        line += CNABEngine.alfanumerico(item.nossoNumero, 25); // Nosso Numero / Numero Controle
        line += "237"; // Bradesco
        line += "0"; // Condição Emissão: 0-A Cargo do Banco
        line += "0"; // Identificação Operação (Branco)
        line += CNABEngine.alfanumerico("", 10); // Branco
        line += " "; // Endereçamento: 1-Banco, 2-Beneficiário
        line += " "; // Branco
        line += "01"; // Movimentação: 01 (Remessa)
        line += CNABEngine.alfanumerico(item.numeroDoc, 10);
        line += CNABEngine.data(item.vencimento, 'DDMMAA');
        line += CNABEngine.monetario(item.valor, 13);
        line += "00000000"; // Branco
        line += "01"; // Espécie: 01-DM
        line += "N"; // Aceite: N
        line += CNABEngine.data(item.emissao, 'DDMMAA');
        line += "1"; // Moeda: Real
        line += CNABEngine.numerico(item.sacadoDocumento, 14); // CPF/CNPJ
        line += CNABEngine.alfanumerico(item.sacadoNome, 40);
        line += CNABEngine.alfanumerico(item.sacadoEndereco, 40);
        line += CNABEngine.alfanumerico("", 12); // Branco
        line += CNABEngine.numerico(item.sacadoCep, 8);
        line += CNABEngine.numerico(item.sequencial, 6);
        return line.padEnd(400, " ");
    }
}
