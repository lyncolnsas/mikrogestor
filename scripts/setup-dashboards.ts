import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
    console.log('--- Configurando Credenciais de Acesso ---');

    // 1. SaaS Super Admin
    const saasEmail = "saas@mikrogestor.com";
    const saasPass = "saas-admin-2026";
    const saasHash = await bcrypt.hash(saasPass, 10);

    await prisma.user.upsert({
        where: { email: saasEmail },
        update: { password: saasHash, role: 'SUPER_ADMIN', name: 'SaaS Master' },
        create: { email: saasEmail, password: saasHash, role: 'SUPER_ADMIN', name: 'SaaS Master' },
    });
    console.log(`✅ SaaS Admin (Super): ${saasEmail} / ${saasPass}`);

    // 2. ISP Admin
    const ispEmail = "isp@mikrogestor.com";
    const ispPass = "isp-admin-2026";
    const ispHash = await bcrypt.hash(ispPass, 10);

    await prisma.user.upsert({
        where: { email: ispEmail },
        update: { password: ispHash, role: 'ISP_ADMIN', name: 'ISP Master' },
        create: { email: ispEmail, password: ispHash, role: 'ISP_ADMIN', name: 'ISP Master' },
    });
    console.log(`✅ ISP Admin (Painel): ${ispEmail} / ${ispPass}`);

    console.log('\n--- Configuração Concluída ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
