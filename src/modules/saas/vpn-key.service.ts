import { generateKeyPairSync, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Serviço responsável pelo gerenciamento de chaves VPN (WireGuard).
 * Realiza a geração de pares de chaves e criptografia de chaves privadas para armazenamento seguro.
 */
export class VpnKeyService {
    // Configuração de Criptografia
    // Em produção, essas chaves DEVEM ser carregadas de variáveis de ambiente seguras (env vars).
    private static readonly ALGORITHM = 'aes-256-gcm';
    private static readonly SECRET_KEY = Buffer.from(process.env.APP_SECRET || 'a_very_insecure_default_key_32_chars__', 'utf-8').subarray(0, 32);

    /**
     * Gera um par de chaves Curve25519 compatível com WireGuard.
     * Retorna a chave pública em texto plano e a chave privada CRIPTOGRAFADA.
     */
    static generateKeyPair() {
        // 1. Gera as chaves usando o formato raw de 32 bytes (Node.js 12+)
        const { publicKey, privateKey } = generateKeyPairSync('x25519');

        const pubRaw = publicKey.export({ type: 'spki', format: 'der' }).slice(-32);
        const privRaw = privateKey.export({ type: 'pkcs8', format: 'der' }).slice(-32);

        // 2. Converte para Base64 (formato aceito pelo WireGuard)
        const pubParams = pubRaw.toString('base64');
        const privParams = privRaw.toString('base64');

        // 3. Criptografa a chave privada antes de retornar para o banco
        const encryptedPriv = this.encrypt(privParams);

        return {
            publicKey: pubParams,
            privateKey: encryptedPriv, // Armazenado como "iv:authTag:conteudoCriptografado"
        };
    }

    /**
     * Criptografa dados sensíveis (CHave Privada) usando AES-256-GCM.
     * Formato: "iv:authTag:conteudo" (partes codificadas em hexadecimal)
     */
    static encrypt(text: string): string {
        const iv = randomBytes(16);
        const cipher = createCipheriv(this.ALGORITHM, this.SECRET_KEY, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag().toString('hex');

        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    }

    /**
     * Descriptografa a chave privada armazenada.
     */
    static decrypt(encryptedText: string): string {
        try {
            const parts = encryptedText.split(':');
            if (parts.length !== 3) {
                // Suporte legado: Se não estiver no formato IV/Tag, assume texto plano (migração)
                // AVISO: Este suporte é temporário durante a fase de transição.
                if (encryptedText.length === 44 && encryptedText.endsWith('=')) {
                    return encryptedText;
                }

                // Se for um hex string longo (como detectado em alguns casos corrompidos)
                if (/^[0-9a-f]{64,}$/i.test(encryptedText)) {
                    throw new Error('Chave corrompida: detectado formato hexadecimal sem metadados GCM.');
                }

                throw new Error('Formato criptografado inválido: partes ausentes.');
            }


            const [ivHex, authTagHex, contentHex] = parts;

            const decipher = createDecipheriv(
                this.ALGORITHM,
                this.SECRET_KEY,
                Buffer.from(ivHex, 'hex')
            );

            decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

            let decrypted = decipher.update(contentHex, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('[VpnKeyService] Falha na descriptografia:', error);
            throw new Error('Falha ao descriptografar chave VPN. Chave mestra incorreta ou corrupção de dados.');
        }
    }
}
