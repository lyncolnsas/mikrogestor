
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.vpnServer.findMany()
    .then(servers => {
        console.log("=== VPN SERVERS IN DB ===");
        servers.forEach(s => {
            console.log(`ID: ${s.id}`);
            console.log(`Public Key: ${s.publicKey}`);
            console.log(`Endpoint: ${s.publicEndpoint}`);
            console.log(`Listen Port: ${s.listenPort}`);
            console.log("---");
        });
    })
    .catch(err => console.error(err))
    .finally(() => p.$disconnect());
