import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    WASocket
} from "@whiskeysockets/baileys";
import pino from "pino";
import path from "path";
import fs from "fs";

/**
 * WhatsAppInstanceManager
 * Manages multiple WhatsApp sessions using Baileys.
 * 
 * LIMIT: Max 5 concurrent instances (for dev/performance).
 */
export class WhatsAppInstanceManager {
    private static instance: WhatsAppInstanceManager;
    private sessions = new Map<string, WASocket>();
    private retryCount = new Map<string, number>();
    private MAX_INSTANCES = 5;
    private logger = pino({ level: "info" });

    private constructor() {
        // Ensure storage directory exists
        const storageDir = path.join(process.cwd(), "storage", "whatsapp-sessions");
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }
    }

    public static getInstance(): WhatsAppInstanceManager {
        if (!WhatsAppInstanceManager.instance) {
            WhatsAppInstanceManager.instance = new WhatsAppInstanceManager();
        }
        return WhatsAppInstanceManager.instance;
    }

    /**
     * Initializes a WhatsApp instance for a specific tenant.
     */
    public async initInstance(tenantId: string, onQrCode: (qr: string) => void, onConnected?: () => void) {
        if (this.sessions.has(tenantId)) {
            this.logger.warn(`Closing existing session for ${tenantId} before re-init.`);
            await this.closeInstance(tenantId);
        }

        // 1. Check current instance count
        if (this.sessions.size >= this.MAX_INSTANCES) {
            throw new Error(`Limite de instâncias WhatsApp atingido (${this.MAX_INSTANCES}).`);
        }

        // 2. Prepare auth state
        const sessionPath = path.join(process.cwd(), "storage", "whatsapp-sessions", tenantId);
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();

        // 3. Create socket
        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false, // We'll handle QR via callback
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            logger: this.logger as any,
        });

        // 4. Handle Events
        sock.ev.on("connection.update", (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                onQrCode(qr);
            }

            if (connection === "close") {
                const error = lastDisconnect?.error as { output?: { statusCode?: number } } | undefined;
                const shouldReconnect = error?.output?.statusCode !== DisconnectReason.loggedOut;
                this.logger.info(`Session ${tenantId} closed. Reconnecting: ${shouldReconnect}`);

                this.sessions.delete(tenantId);

                if (shouldReconnect) {
                    this.initInstance(tenantId, onQrCode, onConnected);
                }
            } else if (connection === "open") {
                this.logger.info(`Session ${tenantId} opened successfully!`);
                this.sessions.set(tenantId, sock);
                this.retryCount.set(tenantId, 0);
                if (onConnected) onConnected();
            }
        });

        sock.ev.on("creds.update", saveCreds);

        return sock;
    }

    /**
     * Gets an active socket for a tenant.
     */
    public getInstance(tenantId: string): WASocket | undefined {
        return this.sessions.get(tenantId);
    }

    /**
     * Closes a specific session.
     */
    public async closeInstance(tenantId: string) {
        const sock = this.sessions.get(tenantId);
        if (sock) {
            await sock.logout();
            this.sessions.delete(tenantId);
        }
    }

    /**
     * Returns the count of active sessions.
     */
    public getActiveCount(): number {
        return this.sessions.size;
    }
}
