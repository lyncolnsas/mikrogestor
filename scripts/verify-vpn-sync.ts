import { prisma } from "../src/lib/prisma";
import { VpnKeyService } from "../src/modules/saas/vpn-key.service";

async function verify() {
    console.log("--- VPN Sync Verification ---");

    // 1. Get a server from DB
    const server = await prisma.vpnServer.findFirst();

    if (!server) {
        console.log("No VPN server found in DB.");
        return;
    }

    console.log(`Server found: ${server.name} (${server.id})`);

    const secret = (server as any).secret;
    const encryptedKey = (server as any).privateKey;

    if (!encryptedKey) {
        console.log("Warning: Server does not have a private key in DB yet.");
        console.log("Run a key regeneration in the UI or via code to test full sync.");
    } else {
        console.log("Encrypted Private Key found in DB.");
        try {
            const decypted = VpnKeyService.decrypt(encryptedKey);
            console.log("Decryption test: SUCCESS");
        } catch (e) {
            console.error("Decryption test: FAILED", e);
        }
    }

    // 2. Test the API logic (mocking the req/res context or just calling the logic)
    // Since we are running in Node, we can just check the decryption logic works as used in the route.
    console.log("API logic verification: Checking if decrypted key would be returned...");

    let serverPrivateKey: string | null = null;
    if (encryptedKey) {
        serverPrivateKey = VpnKeyService.decrypt(encryptedKey);
    }

    if (serverPrivateKey) {
        console.log("Result: Decrypted key is READY to be sent via API.");
    } else {
        console.log("Result: Decrypted key is MISSING (expected if not regenerated yet).");
    }

    console.log("--- Verification Complete ---");
}

verify().catch(console.error);
