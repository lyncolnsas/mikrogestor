import { CNABEngine } from '../cnab-engine';

/**
 * Layout CNAB 240 - SICOOB (Banco 756)
 */
export class SicoobCNAB240Layout {
    /**
     * Header do Arquivo (Registro 0)
     */
    static generateHeader(config: {
        agencia: string;
        dvAgencia: string;
        conta: string;
        dvConta: string;
        beneficiarioCodigo: string; // Convênio Sicoob
        empresaNome: string;
        empresaCnpj: string;
        data: Date;
        sequencial: number;
    }): string {
        let line = "";
        line += "756"; // Banco Sicoob
        line += "0000"; // Lote
        line += "0"; // Registro 0
        line += CNABEngine.alfanumerico("", 9);
        line += "2"; // CNPJ
        line += CNABEngine.numerico(config.empresaCnpj, 14);
        line += CNABEngine.alfanumerico("", 20); // Convênio
        line += CNABEngine.numerico(config.agencia, 5);
        line += CNABEngine.alfanumerico(config.dvAgencia, 1);
        line += CNABEngine.numerico(config.conta, 12);
        line += CNABEngine.alfanumerico(config.dvConta, 1);
        line += " "; // DV Agência/Conta
        line += CNABEngine.alfanumerico(config.empresaNome, 30);
        line += CNABEngine.alfanumerico("SICOOB", 30);
        line += CNABEngine.alfanumerico("", 10);
        line += "1"; // Remessa
        line += CNABEngine.data(config.data, 'DDMMAAAA');
        line += CNABEngine.numerico(config.sequencial, 6);
        line += "081"; // Versão Layout
        line += "00000"; // Densidade
        return line.padEnd(240, " ");
    }

    /**
     * Segmento P (Sicoob)
     */
    static generateSegmentP(item: {
        sequencial: number;
        agencia: string;
        dvAgencia: string;
        conta: string;
        dvConta: string;
        beneficiarioCodigo: string;
        nossoNumero: string; // 20 posições
        vencimento: Date;
        valor: number;
        dataEmissao: Date;
    }): string {
        let line = "";
        line += "756"; // Banco Sicoob
        line += "0001"; // Lote
        line += "3"; // Registro 3
        line += CNABEngine.numerico(item.sequencial, 5);
        line += "P";
        line += " ";
        line += "01"; // Inclusão
        line += CNABEngine.numerico(item.agencia, 5);
        line += CNABEngine.alfanumerico(item.dvAgencia, 1);
        line += CNABEngine.numerico(item.conta, 12);
        line += CNABEngine.alfanumerico(item.dvConta, 1);
        line += " "; // DV Ag/Conta
        line += CNABEngine.numerico(item.nossoNumero, 20); // Nosso Numero Sicoob
        line += "1"; // Carteira: 1-Cobranca Simples
        line += "1"; // Cadastramento: Com Registro
        line += "2"; // Tipo Doc: DM
        line += "2"; // Emissão: Beneficiário
        line += "2"; // Entrega: Beneficiário
        line += CNABEngine.alfanumerico(item.nossoNumero.slice(0, 10), 15); // Numero Documento
        line += CNABEngine.data(item.vencimento, 'DDMMAAAA');
        line += CNABEngine.monetario(item.valor, 15);
        line += "01"; // Espécie: Duplicata
        line += "N"; // Aceite
        line += CNABEngine.data(item.dataEmissao, 'DDMMAAAA');
        return line.padEnd(240, " ");
    }
}
