
const { Client } = require('pg');

const passwords = ['mikrogestor_secure_2026', 'password', 'postgres', '123456'];
const urlBase = 'postgresql://postgres:';
const urlEnd = '@localhost:5432/mikrogestor_prod';

async function test() {
    for (const pw of passwords) {
        const url = `${urlBase}${pw}${urlEnd}`;
        const client = new Client({ connectionString: url });
        try {
            await client.connect();
            console.log(`SUCCESS: Password is "${pw}"`);
            await client.end();
            process.exit(0);
        } catch (e) {
            console.log(`FAILED: "${pw}" -> ${e.message}`);
        }
    }
}

test();
