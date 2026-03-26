import { BBCNAB240Layout } from './layouts/bb-cnab240.layout';
import { CaixaCNAB240Layout } from './layouts/caixa-cnab240.layout';
import { ItauCNAB400Layout } from './layouts/itau-cnab400.layout';
import { BradescoCNAB400Layout } from './layouts/bradesco-cnab400.layout';
import { SicoobCNAB240Layout } from './layouts/sicoob-cnab240.layout';
import { SicrediCNAB240Layout } from './layouts/sicredi-cnab240.layout';

export interface RemessaConfig {
    bank: string;
    agencia: string;
    dvAgencia?: string;
    conta: string;
    dvConta: string;
    convenio: string;
    carteira: string;
    empresaNome: string;
    empresaCnpj: string;
    sequencial: number;
}

export interface RemessaItem {
    nossoNumero: string;
    vencimento: Date;
    valor: number;
    sacadoNome: string;
    sacadoDocumento: string;
    sacadoEndereco: string;
    sacadoCep: string;
    dataEmissao: Date;
}

/**
 * Orquestrador de Geração de Arquivos CNAB (Remessa)
 */
export class CNABGenerator {
    static generate(config: RemessaConfig, items: RemessaItem[]): string {
        const lines: string[] = [];
        const now = new Date();

        switch (config.bank.toUpperCase()) {
            case 'BB':
                lines.push(BBCNAB240Layout.generateHeader({ ...config, data: now }));
                items.forEach((item, idx) => {
                    lines.push(BBCNAB240Layout.generateSegmentP({
                        ...config,
                        ...item,
                        sequencial: idx + 1,
                        especie: '01',
                        dvAgencia: config.dvAgencia || '0',
                    }));
                });
                break;

            case 'CAIXA':
                lines.push(CaixaCNAB240Layout.generateHeader({ ...config, data: now }));
                items.forEach((item, idx) => {
                    lines.push(CaixaCNAB240Layout.generateSegmentP({
                        ...config,
                        ...item,
                        sequencial: idx + 1,
                        beneficiarioCodigo: config.convenio,
                        operacao: '003', // Exemplo
                    }));
                });
                break;
            
            case 'ITAU':
                lines.push(ItauCNAB400Layout.generateHeader({ ...config, data: now }));
                items.forEach((item, idx) => {
                    lines.push(ItauCNAB400Layout.generateDetail({
                        ...config,
                        ...item,
                        sequencial: idx + 1,
                        numeroDoc: item.nossoNumero,
                        emissao: item.dataEmissao,
                    }));
                });
                break;

            case 'BRADESCO':
                lines.push(BradescoCNAB400Layout.generateHeader({ ...config, data: now, empresaCodigo: config.convenio }));
                items.forEach((item, idx) => {
                    lines.push(BradescoCNAB400Layout.generateDetail({
                        ...config,
                        ...item,
                        sequencial: idx + 1,
                        numeroDoc: item.nossoNumero,
                        emissao: item.dataEmissao,
                        beneficiarioCodigo: config.convenio,
                    }));
                });
                break;

            case 'SICOOB':
                lines.push(SicoobCNAB240Layout.generateHeader({ ...config, data: now, dvAgencia: config.dvAgencia || '0', beneficiarioCodigo: config.convenio }));
                items.forEach((item, idx) => {
                    lines.push(SicoobCNAB240Layout.generateSegmentP({
                        ...config,
                        ...item,
                        sequencial: idx + 1,
                        dvAgencia: config.dvAgencia || '0',
                        beneficiarioCodigo: config.convenio,
                    }));
                });
                break;

            case 'SICREDI':
                lines.push(SicrediCNAB240Layout.generateHeader({ ...config, data: now, beneficiarioCodigo: config.convenio }));
                items.forEach((item, idx) => {
                    lines.push(SicrediCNAB240Layout.generateSegmentP({
                        ...config,
                        ...item,
                        sequencial: idx + 1,
                    }));
                });
                break;

            default:
                throw new Error(`Orquestrador não encontrado para o banco: ${config.bank}`);
        }

        // Trailer (Simples)
        if (config.bank === 'ITAU' || config.bank === 'BRADESCO') {
            lines.push("9" + "".padEnd(393, " ") + (items.length + 2).toString().padStart(6, "0"));
        } else {
            lines.push("0019999" + "".padEnd(233, " "));
        }

        return lines.join("\r\n");
    }
}
