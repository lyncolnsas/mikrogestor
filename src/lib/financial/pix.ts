/**
 * Utility to simulate PIX (Instant Payment) payloads
 */
export function generatePixPayload(amount: number, receiverName: string, pixKey: string) {
    // This is a simplified simulation of a PIX Copy-and-Paste string
    // A real one follows the EMV QRCPS Merchant Presented Mode standard
    const payload = `00020126360014BR.GOV.BCB.PIX0114${pixKey}520400005303986540${amount.toFixed(2)}5802BR59${receiverName.substring(0, 20).toUpperCase()}6009SAO PAULO62070503***6304`;

    return {
        payload,
        qrCodePlaceholder: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payload)}`
    };
}
