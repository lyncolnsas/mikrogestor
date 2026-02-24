const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();

    try {
        console.log("🔧 Aplicando migração CASCADE...");

        // Drop existing constraint
        await prisma.$executeRawUnsafe(`
            ALTER TABLE management.vpn_traffic_logs 
            DROP CONSTRAINT IF EXISTS vpn_traffic_logs_tunnel_id_fkey;
        `);

        // Add new constraint with CASCADE
        await prisma.$executeRawUnsafe(`
            ALTER TABLE management.vpn_traffic_logs 
            ADD CONSTRAINT vpn_traffic_logs_tunnel_id_fkey 
            FOREIGN KEY (tunnel_id) 
            REFERENCES management.vpn_tunnels(id) 
            ON DELETE CASCADE;
        `);

        console.log("✅ Migração CASCADE aplicada com sucesso!");
    } catch (error) {
        console.error("❌ Erro ao aplicar migração:", error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
