import { SchemaService } from "../shared/tenancy/schema.service";
import { ProvisioningService } from "../modules/saas/services/provisioning.service";
import { prisma } from "../lib/prisma";

async function verify() {
    console.log("=== PROVISIONING TOOL VERIFICATION ===");

    // 1. Check Tools
    console.log("Checking database tools (pg_dump, psql, sed)...");
    const tools = await SchemaService.testTools();
    if (tools.success) {
        console.log("✅ Tools found!");
    } else {
        console.error("❌ Tools missing:", tools.error);
        process.exit(1);
    }

    // 2. Dry Run / Test Provisioning
    const testSlug = `verify-flow-${Math.floor(Math.random() * 1000)}`;
    console.log(`\nStarting test provisioning for: ${testSlug}`);

    try {
        const result = await ProvisioningService.provision({
            name: "Verify Tenant",
            slug: testSlug,
            adminEmail: `verify-${testSlug}@example.com`,
            adminPassword: "Password123!",
            planId: "40d02773-f140-4204-9c02-4fc46bba90b9", // Assumes this plan exists or adjust if needed
            financialConfig: {
                interestRate: 1.5,
                penaltyAmount: 10,
                gracePeriod: 3,
                autoBlock: true,
                autoUnblock: true
            }
        });

        console.log("✅ Provisioning completed successfully!");
        console.log("Tenant ID:", result.tenant.id);
        console.log("VPN Provisioned:", result.vpnProvisioned);

        // 3. Cleanup (Optional but good for repetitive tests)
        console.log("\nCleaning up test data...");
        // In a real environment we might want to drop the schema, but let's just keep it for manual check if needed.
        // For now, we'll just exit.

    } catch (error: any) {
        console.error("\n❌ PROVISIONING FLOW FAILED:");
        console.error(error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
