import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Iniciando seed de usuários administrativos...\n");

    // 1. Criar SUPER_ADMIN (SaaS)
    const saasEmail = "saas@mikrogestor.com";
    const saasPassword = "saas-admin-2026";
    const saasHashedPassword = await bcrypt.hash(saasPassword, 10);

    const saasAdmin = await prisma.user.upsert({
        where: { email: saasEmail },
        update: {
            password: saasHashedPassword,
            role: "SUPER_ADMIN",
            name: "SaaS Administrator",
        },
        create: {
            email: saasEmail,
            name: "SaaS Administrator",
            password: saasHashedPassword,
            role: "SUPER_ADMIN",
            tenantId: null, // SUPER_ADMIN não tem tenant
        },
    });

    console.log(`✅ SUPER_ADMIN criado/atualizado:`);
    console.log(`   Email: ${saasAdmin.email}`);
    console.log(`   Senha: ${saasPassword}`);
    console.log(`   Role: ${saasAdmin.role}\n`);

    // 2. Criar ou buscar Tenant para ISP
    let ispTenant = await prisma.tenant.findFirst({
        where: { slug: "isp-demo" },
    });

    if (!ispTenant) {
        console.log("📦 Criando tenant de demonstração para ISP...");
        ispTenant = await prisma.tenant.create({
            data: {
                name: "ISP Demonstração",
                slug: "isp-demo",
                status: "ACTIVE",
                publicKey: "demo-public-key-placeholder",
                privateKey: "demo-private-key-placeholder",
            },
        });
        console.log(`✅ Tenant criado: ${ispTenant.name} (${ispTenant.slug})\n`);
    } else {
        console.log(`✅ Tenant existente encontrado: ${ispTenant.name} (${ispTenant.slug})\n`);
    }

    // 3. Criar ISP_ADMIN
    const ispEmail = "isp@mikrogestor.com";
    const ispPassword = "isp-admin-2026";
    const ispHashedPassword = await bcrypt.hash(ispPassword, 10);

    const ispAdmin = await prisma.user.upsert({
        where: { email: ispEmail },
        update: {
            password: ispHashedPassword,
            role: "ISP_ADMIN",
            name: "ISP Administrator",
            tenantId: ispTenant.id,
        },
        create: {
            email: ispEmail,
            name: "ISP Administrator",
            password: ispHashedPassword,
            role: "ISP_ADMIN",
            tenantId: ispTenant.id,
        },
    });

    console.log(`✅ ISP_ADMIN criado/atualizado:`);
    console.log(`   Email: ${ispAdmin.email}`);
    console.log(`   Senha: ${ispPassword}`);
    console.log(`   Role: ${ispAdmin.role}`);
    console.log(`   Tenant: ${ispTenant.name}\n`);

    console.log("🎉 Seed concluído com sucesso!");
    console.log("\n📋 Resumo das credenciais:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("SaaS Admin:");
    console.log(`  Email: ${saasEmail}`);
    console.log(`  Senha: ${saasPassword}`);
    console.log(`  Acesso: /saas-admin`);
    console.log("\nISP Admin:");
    console.log(`  Email: ${ispEmail}`);
    console.log(`  Senha: ${ispPassword}`);
    console.log(`  Acesso: /overview`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
    .catch((e) => {
        console.error("❌ Erro ao executar seed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
