export interface ReturnItem {
    nossoNumero: string;
    valorPago: number;
    dataPagamento: Date;
    status: 'PAID' | 'REJECTED' | 'PENDING';
    ocorrencia: string;
}

/**
 * Leitor de Arquivos CNAB (Retorno)
 * Suporta identificação de pagamentos em layouts 240 e 400
 */
export class CNABReturnParser {
    static parse(fileContent: string): ReturnItem[] {
        const lines = fileContent.split(/\r?\n/).filter(line => line.length > 50);
        const results: ReturnItem[] = [];

        for (const line of lines) {
            const type = line.substring(0, 3); // 001 (BB), 104 (Caixa), 756 (Sicoob)...
            const recordType = line.substring(7, 8); // CNAB 240 usa Segmentos no campo 8

            // --- LÓGICA PARA CNAB 240 (BB, Caixa, Sicoob, Sicredi) ---
            if (line.length === 240) {
                const segment = line.substring(13, 14); // Segmento T ou U

                if (segment === 'U') {
                    // O Segmento U contém dados do pagamento
                    const ocorrencia = line.substring(15, 17);
                    
                    // Ocorrência 06 = Liquidação (Pago)
                    if (ocorrencia === '06') {
                        results.push({
                            nossoNumero: line.substring(40, 50).trim(), // Aproximado, varia por banco
                            valorPago: Number(line.substring(77, 92)) / 100,
                            dataPagamento: this.parseDate(line.substring(137, 145)),
                            status: 'PAID',
                            ocorrencia: ocorrencia
                        });
                    }
                }
            }

            // --- LÓGICA PARA CNAB 400 (Itau, Bradesco) ---
            else if (line.length === 400) {
                const recordType400 = line.substring(0, 1);
                
                if (recordType400 === '1') { // Registro Detalhe
                    const ocorrencia = line.substring(108, 110); // Localização varia, aqui é Bradesco aprox.
                    
                    if (ocorrencia === '06') {
                        results.push({
                            nossoNumero: line.substring(70, 81).trim(),
                            valorPago: Number(line.substring(253, 266)) / 100,
                            dataPagamento: this.parseDate(line.substring(110, 116)), // DDMMYY
                            status: 'PAID',
                            ocorrencia: ocorrencia
                        });
                    }
                }
            }
        }

        return results;
    }

    private static parseDate(val: string): Date {
        if (val.length === 8) { // DDMMYYYY
            const d = parseInt(val.substring(0, 2));
            const m = parseInt(val.substring(2, 4)) - 1;
            const y = parseInt(val.substring(4, 8));
            return new Date(y, m, d);
        } else if (val.length === 6) { // DDMMYY
            const d = parseInt(val.substring(0, 2));
            const m = parseInt(val.substring(2, 4)) - 1;
            const y = 2000 + parseInt(val.substring(4, 6));
            return new Date(y, m, d);
        }
        return new Date();
    }
}
