
import { prisma } from "../src/lib/prisma";
import { VpnKeyService } from "../src/modules/saas/vpn-key.service";

async function fixIspUser() {
    console.log("-----------------------------------------");
    console.log("Fixing 'isp@mikrogestor.com' User");
    console.log("-----------------------------------------");

    try {
        const user = await prisma.user.findUnique({
            where: { email: "isp@mikrogestor.com" },
            include: { tenant: true }
        });

        if (!user) {
            console.log("User 'isp@mikrogestor.com' not found.");
            return;
        }

        if (user.tenantId) {
            console.log("User already has a tenant:", user.tenant?.name);
            return;
        }

        console.log("User found but has no tenant. Creating/Linking one...");

        // Create a new Tenant
        const { publicKey, privateKey } = VpnKeyService.generateKeyPair();
        const slug = "isp-demo-net-" + Math.random().toString(36).substring(2, 5);

        const tenant = await prisma.tenant.create({
            data: {
                name: "NetFast ISP Demo",
                slug: slug,
                publicKey: publicKey,
                privateKey: privateKey // Encrypt in real app
            }
        });

        console.log(`Tenant Created: ${tenant.name} (${tenant.slug})`);

        // Update User
        await prisma.user.update({
            where: { id: user.id },
            data: { tenantId: tenant.id }
        });

        console.log("SUCCESS: User 'isp@mikrogestor.com' is now linked to the tenant.");
        console.log("Please LOGOUT and LOGIN again to refresh the session.");

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

fixIspUser();
