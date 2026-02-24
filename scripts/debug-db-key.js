const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const server = await prisma.vpnServer.findFirst();
    console.log('CURRENT_DB_KEY:', server?.publicKey);
}
main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
