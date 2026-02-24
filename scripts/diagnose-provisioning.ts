
import { exec } from "child_process";
import { promisify } from "util";
import { PrismaClient } from "@prisma/client";

const execAsync = promisify(exec);
const prisma = new PrismaClient();

async function diagnose() {
    console.log("🔍 Starting Provisioning Diagnostics...\n");

    // 1. Check Env
    console.log("--- Environment ---");
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? "set" : "MISSING"}`);
    console.log(`VPN_SERVER_ID: ${process.env.VPN_SERVER_ID || "not set"}`);
    console.log("");

    // 2. Check Tools
    console.log("--- Tools ---");
    const tools = ["pg_dump", "psql", "sed"];
    for (const tool of tools) {
        try {
            const { stdout } = await execAsync(`${tool} --version`).catch(() => execAsync(tool));
            console.log(`✅ ${tool}: ${stdout.split('\n')[0]}`);
        } catch (e: any) {
            console.error(`❌ ${tool}: NOT FOUND or failed (${e.message})`);
        }
    }
    console.log("");

    // 3. Check DB Connection
    console.log("--- Database ---");
    try {
        await prisma.$connect();
        console.log("✅ Database connection successful.");

        const servers = await prisma.vpnServer.findMany();
        console.log(`✅ Found ${servers.length} VPN Servers.`);
        servers.forEach(s => {
            console.log(`  - ${s.name}: Endpoint=${s.publicEndpoint || 'EMPTY'}, Key=${s.publicKey ? 'Present' : 'EMPTY'}`);
        });

        const plans = await prisma.saasPlan.count();
        console.log(`✅ Found ${plans} SaaS Plans.`);

    } catch (e: any) {
        console.error("❌ Database connection failed:", e.message);
    } finally {
        await prisma.$disconnect();
    }
    console.log("");

    // 4. Test Schema Creation (Optional/Safe)
    console.log("--- Schema Test (Dry Run) ---");
    console.log("To fully test, run: npx tsx src/shared/tenancy/schema.service.ts (if exported)");
    console.log("\nDiagnostics Complete.");
}

diagnose().catch(console.error);
