import { CNABEngine } from '../cnab-engine';

/**
 * Layout CNAB 240 - Caixa Econômica Federal (SIGCB)
 */
export class CaixaCNAB240Layout {
    /**
     * Header do Arquivo
     */
    static generateHeader(config: {
        agencia: string;
        conta: string;
        dvConta: string;
        empresaNome: string;
        empresaCnpj: string;
        data: Date;
        sequencial: number;
    }): string {
        let line = "";
        line += "104"; // Banco Caixa
        line += "0000"; // Lote
        line += "0"; // Registro 0
        line += CNABEngine.alfanumerico("", 9);
        line += "2"; // CNPJ
        line += CNABEngine.numerico(config.empresaCnpj, 14);
        line += "0".repeat(20); // Branco
        line += CNABEngine.numerico(config.agencia, 5);
        line += CNABEngine.numerico(config.conta, 6);
        line += CNABEngine.numerico(config.dvConta, 1);
        line += "0"; // DV Ag/Conta
        line += CNABEngine.alfanumerico(config.empresaNome, 30);
        line += CNABEngine.alfanumerico("CAIXA ECONOMICA FEDERAL", 30);
        line += CNABEngine.alfanumerico("", 10);
        line += "1"; // Remessa
        line += CNABEngine.data(config.data, 'DDMMAAAA');
        line += CNABEngine.numerico(config.sequencial, 6);
        line += "050"; // Versão Layout
        line += "00000"; // Densidade
        return line.padEnd(240, " ");
    }

    /**
     * Segmento P (SIGCB exige campos específicos de convênio)
     */
    static generateSegmentP(item: {
        sequencial: number;
        agencia: string;
        operacao: string; // Ex: 003, 870
        conta: string;
        beneficiarioCodigo: string; // Código fornecido pela Caixa
        nossoNumero: string; // 17 posições
        vencimento: Date;
        valor: number;
        dataEmissao: Date;
    }): string {
        let line = "";
        line += "104"; // Banco Caixa
        line += "0001"; // Lote
        line += "3"; // Registro 3
        line += CNABEngine.numerico(item.sequencial, 5);
        line += "P";
        line += " ";
        line += "01"; // Inclusão
        line += CNABEngine.numerico(item.agencia, 5);
        line += "0"; // DV Ag
        line += CNABEngine.numerico(item.beneficiarioCodigo, 6);
        line += "0"; // Branco
        line += "00"; // Código Carteira
        line += CNABEngine.numerico(item.nossoNumero, 17); // Nosso Numero (SIGCB)
        line += "1"; // Carteira 1-Simples
        line += "1"; // Cadastramento: Com Registro
        line += "2"; // Tipo Doc: DM
        line += "2"; // Emissão: Banco
        line += "2"; // Entrega: Banco
        line += CNABEngine.alfanumerico(item.nossoNumero, 15); // Numero Documento
        line += CNABEngine.data(item.vencimento, 'DDMMAAAA');
        line += CNABEngine.monetario(item.valor, 15);
        line += "02"; // Espécie: Duplicata
        line += "N"; // Aceite
        line += CNABEngine.data(item.dataEmissao, 'DDMMAAAA');
        return line.padEnd(240, " ");
    }
}
