const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function resetUser() {
    const password = '22101844';
    const hash = bcrypt.hashSync(password, 10);

    console.log('Hash gerado:', hash);
    console.log('Tamanho:', hash.length);
    console.log('');

    // Conectar ao banco
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'mikrogestor_prod',
        user: 'postgres',
        password: 'mikrogestor_secure_2026'
    });

    try {
        await client.connect();
        console.log('✅ Conectado ao banco');

        // Apagar todos os usuários
        await client.query('DELETE FROM users');
        console.log('✅ Usuários apagados');

        // Criar novo usuário
        const result = await client.query(`
            INSERT INTO users (id, email, password, name, role, "createdAt", "updatedAt")
            VALUES (
                gen_random_uuid()::text,
                'lyncoln.sas@gmail.com',
                $1,
                'Lyncoln',
                'SUPER_ADMIN',
                NOW(),
                NOW()
            )
            RETURNING email, name, role, LENGTH(password) as hash_length
        `, [hash]);

        console.log('✅ Usuário criado:');
        console.log(result.rows[0]);
        console.log('');

        // Testar senha
        const user = await client.query('SELECT password FROM users WHERE email = $1', ['lyncoln.sas@gmail.com']);
        const storedHash = user.rows[0].password;

        const match = await bcrypt.compare(password, storedHash);

        if (match) {
            console.log('═══════════════════════════════════════');
            console.log('  ✅ SENHA FUNCIONANDO!');
            console.log('═══════════════════════════════════════');
            console.log('');
            console.log('  Email: lyncoln.sas@gmail.com');
            console.log('  Senha: 22101844');
            console.log('  Role:  SUPER_ADMIN');
            console.log('');
            console.log('  Acesse: http://localhost:3000');
            console.log('');
            console.log('═══════════════════════════════════════');
        } else {
            console.log('❌ ERRO: Senha não funciona!');
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await client.end();
    }
}

resetUser();
