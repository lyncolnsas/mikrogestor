/**
 * Ferramentas de manipulação de campos para arquivos CNAB (Posição Fixa)
 */
export class CNABEngine {
    /**
     * Formata um campo alfanumérico com espaços à direita
     */
    static alfanumerico(value: string | null | undefined, length: number): string {
        const str = (value || "").substring(0, length).toUpperCase();
        return str.padEnd(length, " ");
    }

    /**
     * Formata um campo numérico com zeros à esquerda
     */
    static numerico(value: number | string | null | undefined, length: number): string {
        const str = String(value || "0").replace(/\D/g, "").substring(0, length);
        return str.padStart(length, "0");
    }

    /**
     * Formata um valor monetário (sem ponto decimal) com zeros à esquerda
     */
    static monetario(value: number | string | null | undefined, length: number): string {
        const amount = Number(value || 0);
        const cents = Math.round(amount * 100);
        return this.numerico(cents, length);
    }

    /**
     * Formata uma data no formato DDMMAA ou DDMMAAAA
     */
    static data(date: Date | null | undefined, format: 'DDMMAA' | 'DDMMAAAA' = 'DDMMAA'): string {
        if (!date) return "0".repeat(format.length);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear().toString();
        
        return format === 'DDMMAA' 
            ? `${day}${month}${year.slice(-2)}`
            : `${day}${month}${year}`;
    }
}
