import { SchemaService } from "../src/shared/tenancy/schema.service";

async function main() {
    console.log("🔧 Criando schema para o tenant isp-demo...\n");

    try {
        const schemaName = await SchemaService.createTenantSchema("isp-demo");
        console.log(`✅ Schema criado com sucesso: ${schemaName}`);
    } catch (error) {
        console.error("❌ Erro ao criar schema:", error);
        process.exit(1);
    }
}

main();
