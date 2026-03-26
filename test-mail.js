const nodemailer = require('nodemailer');

async function main() {
    console.log("=== INICIANDO TESTE SMTP MIKROGESTOR (JS) ===");
    
    // Configurações extraídas do seu banco
    const config = {
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // TLS
        auth: {
            user: "lyncoln.sas@gmail.com",
            pass: "qajt yflg skqk anpt"
        }
    };

    console.log(`Host: ${config.host}:${config.port}`);
    console.log(`User: ${config.auth.user}`);

    const transporter = nodemailer.createTransport(config);

    try {
        console.log("Verificando conexão...");
        await transporter.verify();
        console.log("✅ Conexão Verificada!");

        console.log("Disparando e-mail de teste...");
        const info = await transporter.sendMail({
            from: '"Mikrogestor Teste" <lyncoln.sas@gmail.com>',
            to: 'lyncoln.sas@gmail.com',
            subject: 'Teste de Envio SMTP Mikrogestor (Node CLI)',
            text: 'Teste via CLI - Sistema Mikrogestor está operando SMTP.',
            html: '<h3>Teste via CLI</h3><p>O SMTP está configurado corretamente no banco de dados.</p>'
        });

        console.log(`✅ Sucesso! ID: ${info.messageId}`);
        console.log("Resposta:", info.response);
    } catch (error) {
        console.error("❌ ERRO NO SMTP:", error.message);
        if (error.response) console.error("Resposta do Servidor:", error.response);
    }
}

main();
