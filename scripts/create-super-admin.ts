import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createSuperAdmin() {
    console.log('🚀 Criando usuário SUPER_ADMIN...');

    const email = 'admin@mikrogestor.com';
    const password = 'admin123'; // MUDE ISSO EM PRODUÇÃO!
    const name = 'Super Administrador';

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        // Criar usuário SUPER_ADMIN
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: 'SUPER_ADMIN',
            },
        });

        console.log('✅ Usuário SUPER_ADMIN criado com sucesso!');
        console.log('');
        console.log('📧 Email:', email);
        console.log('🔑 Senha:', password);
        console.log('');
        console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');
        console.log('');

        return user;
    } catch (error: any) {
        if (error?.code === 'P2002') {
            console.log('ℹ️  Usuário já existe!');
        } else {
            console.error('❌ Erro ao criar usuário:', error);
            throw error;
        }
    }
}

createSuperAdmin()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
