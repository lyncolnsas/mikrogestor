const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando verificação em massa de usuários...');
  
  try {
    const updated = await prisma.user.updateMany({
      where: {
        emailVerified: false
      },
      data: {
        emailVerified: true
      }
    });
    
    console.log(`✅ Sucesso! ${updated.count} usuários foram verificados automaticamente.`);
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
