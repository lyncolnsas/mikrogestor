import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const settings = await prisma.systemSettings.findUnique({
            where: { id: "GLOBAL" }
        });

        if (settings && settings.smtpConfig) {
            const config = (settings.smtpConfig as any);
            console.log("Configuração atual encontrada:", config.user);
            
            const updatedConfig = {
                ...config,
                user: "",
                pass: ""
            };

            await prisma.systemSettings.update({
                where: { id: "GLOBAL" },
                data: { smtpConfig: updatedConfig }
            });
            
            console.log("Configurações de e-mail limpas com sucesso.");
        } else {
            console.log("Nenhuma configuração SMTP encontrada para limpar.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
