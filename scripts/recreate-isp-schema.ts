import { PrismaClient } from "@prisma/client";
import { SchemaService } from "../src/shared/tenancy/schema.service";

const prisma = new PrismaClient();

async function main() {
    console.log("♻️ Recriando schema para o tenant isp-demo...\n");

    const schemaName = "tenant_isp_demo";

    try {
        // 1. Drop existing schema
        console.log(`🔥 Removendo schema antigo: ${schemaName}`);
        await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);

        // 2. Create new schema using SchemaService
        console.log(`✨ Criando novo schema...`);
        const createdName = await SchemaService.createTenantSchema("isp-demo");
        console.log(`✅ Schema recriado com sucesso: ${createdName}`);

    } catch (error) {
        console.error("❌ Erro ao recriar schema:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
