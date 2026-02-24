const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const servers = await prisma.vpnServer.findMany();
        console.log("Servers found:", servers.length);
        servers.forEach(s => {
            console.log(`ID: ${s.id} | Name: ${s.name} | Secret: ${s.secret}`);
        });
    } catch (e) {
        console.error("Error checking servers:", e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
