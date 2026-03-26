import { CNABEngine } from '../cnab-engine';

/**
 * Layout CNAB 240 - Banco do Brasil (Simples/Faturamento)
 */
export class BBCNAB240Layout {
    /**
     * Gera o Header do Arquivo (Registro 0)
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
        line += "001"; // Banco BB
        line += "0000"; // Lote
        line += "0"; // Registro 0
        line += CNABEngine.alfanumerico("", 9); // Branco
        line += "2"; // Inscrição: 2-CNPJ
        line += CNABEngine.numerico(config.empresaCnpj, 14);
        line += CNABEngine.numerico(config.agencia, 5); // Convênio BB
        line += CNABEngine.alfanumerico("", 15); // Branco
        line += CNABEngine.numerico(config.agencia, 5);
        line += CNABEngine.alfanumerico("", 1); // Branco
        line += CNABEngine.numerico(config.conta, 12);
        line += CNABEngine.alfanumerico("", 1); // Branco
        line += CNABEngine.alfanumerico(config.dvConta, 1);
        line += CNABEngine.alfanumerico(config.empresaNome, 30);
        line += CNABEngine.alfanumerico("BANCO DO BRASIL", 30);
        line += CNABEngine.alfanumerico("", 10); // Branco
        line += "1"; // Código: 1-Remessa
        line += CNABEngine.data(config.data, 'DDMMAAAA');
        line += CNABEngine.numerico(new Date().getHours() * 10000 + new Date().getMinutes() * 100 + new Date().getSeconds(), 6);
        line += CNABEngine.numerico(config.sequencial, 6);
        line += "084"; // Versão Layout
        line += "00000"; // Densidade
        line += CNABEngine.alfanumerico("", 69); // Branco
        return line.padEnd(240, " ");
    }

    /**
     * Gera o Header do Lote (Registro 1)
     */
    static generateBatchHeader(config: any): string {
        // Implementar header de lote se necessário para 240 completo
        return ""; 
    }

    /**
     * Gera o Segmento P (Dados do Título)
     */
    static generateSegmentP(item: {
        sequencial: number;
        agencia: string;
        conta: string;
        dvAgencia: string;
        dvConta: string;
        nossoNumero: string; // sem DV
        vencimento: Date;
        valor: number;
        especie: string; // Ex: 01 (Duplicata)
        dataEmissao: Date;
    }): string {
        let line = "";
        line += "001"; // Banco BB
        line += "0001"; // Lote 0001
        line += "3"; // Registro 3 (Segmento)
        line += CNABEngine.numerico(item.sequencial, 5); // Seq Registro no Lote
        line += "P"; // Segmento P
        line += " "; // Branco
        line += "01"; // Movimentação: 01 (Inclusão)
        line += CNABEngine.numerico(item.agencia, 5);
        line += CNABEngine.alfanumerico(item.dvAgencia, 1);
        line += CNABEngine.numerico(item.conta, 12);
        line += CNABEngine.alfanumerico(item.dvConta, 1);
        line += CNABEngine.alfanumerico("", 1); // Branco
        line += CNABEngine.alfanumerico(item.nossoNumero, 20); // Nosso Número
        line += "1"; // Carteira 1-Cobrança Simples
        line += "2"; // Registro: 2-Escritural
        line += "0"; // Tipo Baixa
        line += CNABEngine.alfanumerico("99999", 5); // Convênio (ou Agência)
        line += CNABEngine.alfanumerico(item.nossoNumero, 15); // Numero do Documento
        line += CNABEngine.data(item.vencimento, 'DDMMAAAA');
        line += CNABEngine.monetario(item.valor, 15);
        line += "01"; // Espécie: 01-Título
        line += "N"; // Aceite: N
        line += CNABEngine.data(item.dataEmissao, 'DDMMAAAA');
        line += "1"; // Juros: 1-Valor por Dia
        line += CNABEngine.monetario(0, 8); // Juros
        line += "1"; // Desconto 1-Valor Fixo
        line += CNABEngine.monetario(0, 8); // Desconto
        line += CNABEngine.monetario(0, 15); // IOF
        line += CNABEngine.monetario(0, 15); // Abatimento
        return line.padEnd(240, " ");
    }
}
