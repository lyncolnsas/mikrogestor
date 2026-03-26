import { CNABEngine } from '../cnab-engine';

/**
 * Layout CNAB 240 - SICREDI (Banco 748)
 */
export class SicrediCNAB240Layout {
    /**
     * Header do Arquivo
     */
    static generateHeader(config: {
        agencia: string;
        conta: string;
        dvConta: string;
        empresaNome: string;
        empresaCnpj: string;
        beneficiarioCodigo: string; // Convênio Sicredi
        data: Date;
        sequencial: number;
    }): string {
        let line = "";
        line += "748"; // Banco Sicredi
        line += "0000"; // Lote
        line += "0"; // Registro 0
        line += CNABEngine.numerico("", 9);
        line += "2"; // CNPJ
        line += CNABEngine.numerico(config.empresaCnpj, 14);
        line += CNABEngine.numerico(config.beneficiarioCodigo, 20); // Código do Beneficiário
        line += CNABEngine.numerico(config.agencia, 5);
        line += " "; // DV Ag
        line += CNABEngine.numerico(config.conta, 12);
        line += CNABEngine.numerico(config.dvConta, 1);
        line += " "; // DV Ag/Conta
        line += CNABEngine.alfanumerico(config.empresaNome, 30);
        line += CNABEngine.alfanumerico("SICREDI", 30);
        line += CNABEngine.alfanumerico("", 10);
        line += "1"; // Remessa
        line += CNABEngine.data(config.data, 'DDMMAAAA');
        line += CNABEngine.numerico(config.sequencial, 6);
        line += "081"; // Versão
        line += "00000"; // Densidade
        return line.padEnd(240, " ");
    }

    /**
     * Segmento P (Sicredi)
     */
    static generateSegmentP(item: {
        sequencial: number;
        agencia: string;
        conta: string;
        dvConta: string;
        nossoNumero: string; // 20 posições (específico Sicredi)
        vencimento: Date;
        valor: number;
        dataEmissao: Date;
    }): string {
        let line = "";
        line += "748"; // Banco Sicredi
        line += "0001"; // Lote
        line += "3"; // Registro 3
        line += CNABEngine.numerico(item.sequencial, 5);
        line += "P";
        line += " ";
        line += "01"; // Inclusão
        line += CNABEngine.numerico(item.agencia, 5);
        line += " "; 
        line += CNABEngine.numerico(item.conta, 12);
        line += CNABEngine.numerico(item.dvConta, 1);
        line += " ";
        line += CNABEngine.numerico(item.nossoNumero.replace(/\-/g, ''), 20); // Nosso Número
        line += "1"; // Cobrança Simples
        line += "1"; // Com Registro
        line += "2"; // DM
        line += "2"; // Emissão: Beneficiário
        line += "2"; // Entrega: Beneficiário
        line += CNABEngine.alfanumerico(item.nossoNumero.slice(-10), 10); // Numero Doc
        line += CNABEngine.data(item.vencimento, 'DDMMAAAA');
        line += CNABEngine.monetario(item.valor, 15);
        line += "01"; // Espécie
        line += "N"; // Aceite
        line += CNABEngine.data(item.dataEmissao, 'DDMMAAAA');
        return line.padEnd(240, " ");
    }
}
