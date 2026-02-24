import crypto from "node:crypto";

/**
 * Generates a valid random CPF
 */
export function generateCpf(): string {
    const randomDigits = () => Math.floor(Math.random() * 9);
    const n = Array.from({ length: 9 }, randomDigits);

    const calculateCheckDigit = (digits: number[]) => {
        const weights = Array.from({ length: digits.length + 1 }, (_, i) => digits.length + 1 - i);
        const sum = digits.reduce((acc, digit, i) => acc + digit * weights[i], 0);
        const remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    };

    const d1 = calculateCheckDigit(n);
    const d2 = calculateCheckDigit([...n, d1]);

    return [...n, d1, d2].join("");
}

/**
 * Validates a CPF string
 */
export function validateCpf(cpf: string): boolean {
    const cleanCpf = cpf.replace(/\D/g, "");

    if (cleanCpf.length !== 11) return false;

    // Reject known invalid patterns
    if (/^(\d)\1{10}$/.test(cleanCpf)) return false;

    const digits = cleanCpf.split("").map(Number);

    const calculateCheckDigit = (slice: number[]) => {
        const weights = Array.from({ length: slice.length + 1 }, (_, i) => slice.length + 1 - i);
        const sum = slice.reduce((acc, digit, i) => acc + digit * weights[i], 0);
        const remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    };

    const d1 = calculateCheckDigit(digits.slice(0, 9));
    const d2 = calculateCheckDigit(digits.slice(0, 10));

    return d1 === digits[9] && d2 === digits[10];
}

/**
 * Generates a random email based on the subscriber name
 */
export function generateRandomEmail(name: string): string {
    const cleanName = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");

    const randomSuffix = Math.random().toString(36).substring(2, 7);
    return `${cleanName}.${randomSuffix}@radius.mikrogestor.com`;
}

/**
 * Generates a random alphanumeric password
 */
export function generateRandomPassword(length = 12): string {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += charset.charAt(crypto.randomInt(0, charset.length));
    }
    return password;
}
