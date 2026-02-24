import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetUser() {
    const email = 'lyncoln.sas@gmail.com';
    const password = '22101844';
    const name = 'Lyncoln';

    try {
        console.log('🔐 Gerando hash da senha...');
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Hash:', hashedPassword);
        console.log('Tamanho:', hashedPassword.length);
        console.log('');

        console.log('🗑️  Apagando usuários existentes...');
        await prisma.user.deleteMany({});
        console.log('✅ Usuários apagados');
        console.log('');

        console.log('👤 Criando novo usuário...');
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: 'SUPER_ADMIN',
            },
        });

        console.log('✅ Usuário criado:');
        console.log('   ID:', user.id);
        console.log('   Email:', user.email);
        console.log('   Nome:', user.name);
        console.log('   Role:', user.role);
        console.log('');

        // Verificar senha
        console.log('🔍 Verificando senha...');
        const storedUser = await prisma.user.findUnique({
            where: { email }
        });

        if (storedUser) {
            const match = await bcrypt.compare(password, storedUser.password);

            if (match) {
                console.log('');
                console.log('═══════════════════════════════════════');
                console.log('  ✅ CREDENCIAIS FUNCIONANDO!');
                console.log('═══════════════════════════════════════');
                console.log('');
                console.log('  Email: lyncoln.sas@gmail.com');
                console.log('  Senha: 22101844');
                console.log('  Role:  SUPER_ADMIN');
                console.log('');
                console.log('  🚀 Acesse: http://localhost:3000');
                console.log('');
                console.log('═══════════════════════════════════════');
                console.log('');
            } else {
                console.log('❌ ERRO: Senha não confere!');
            }
        }

    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

resetUser();
