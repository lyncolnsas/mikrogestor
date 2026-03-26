import nodemailer from 'nodemailer';

async function main() {
    console.log("=== INICIANDO TESTE SMTP MIKROGESTOR ===");
    
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

    console.log(`Config: ${config.host}:${config.port} (User: ${config.auth.user})`);

    const transporter = nodemailer.createTransport(config);

    try {
        console.log("Tentando conexão...");
        await transporter.verify();
        console.log("✅ Conexão Verificada com Sucesso!");

        console.log("Enviando e-mail de teste...");
        const info = await transporter.sendMail({
            from: '"Mikrogestor Teste" <lyncoln.sas@gmail.com>', // Usando o mesmo email do user para evitar bloqueio
            to: 'lyncoln.sas@gmail.com',
            subject: 'Teste de Envio SMTP Mikrogestor v2',
            text: 'Olá! Se você está lendo isso, o SMTP do seu Mikrogestor está funcionando perfeitamente via script de teste.',
            html: '<b>Olá!</b><br>Se você está lendo isso, o SMTP do seu Mikrogestor está funcionando perfeitamente via script de teste.'
        });

        console.log(`✅ E-mail enviado! ID: ${info.messageId}`);
        console.log("Verifique sua caixa de entrada (e pasta de spam).");
    } catch (error: any) {
        console.error("❌ ERRO NO SMTP:", error.message);
        if (error.response) console.error("Resposta do Servidor:", error.response);
    }
}

main();
