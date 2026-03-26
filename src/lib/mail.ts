
import nodemailer from "nodemailer";
import { prisma } from "./prisma";

async function getSmtpConfig() {
    try {
        const settings = await (prisma as any).systemSettings.findUnique({
            where: { id: "GLOBAL" }
        });

        if (settings?.smtpConfig) {
            return settings.smtpConfig;
        }
    } catch (e) {
        console.warn("[MAIL] Could not fetch DB config, using env vars:", e);
    }

    return {
        host: process.env.SMTP_HOST || "smtp.example.com",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        user: process.env.SMTP_USER || "user@example.com",
        pass: process.env.SMTP_PASS || "password",
        fromName: process.env.SMTP_FROM_NAME || "Mikrogestor",
        fromEmail: process.env.SMTP_FROM_EMAIL || "no-reply@mikrogestor.com",
    };
}

export async function sendPasswordResetEmail(email: string, token: string) {
    const config = await getSmtpConfig();
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: config.user,
            pass: config.pass,
        },
    });
    
    const mailOptions = {
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: email,
        subject: "Redefinição de Senha - Mikrogestor",
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
                <h2 style="color: #0f172a; font-weight: 800; tracking-tight: -0.025em; margin-bottom: 24px;">Recuperação de Acesso</h2>
                <p style="color: #64748b; font-size: 16px; line-height: 24px;">
                    Você solicitou a redefinição de sua senha no <strong>Mikrogestor SaaS</strong>.
                </p>
                <div style="margin: 32px 0;">
                    <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 800; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                        Redefinir Minha Senha
                    </a>
                </div>
                <p style="color: #94a3b8; font-size: 14px; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 24px;">
                    Este link expirará em 1 hora. Se você não solicitou esta alteração, por favor ignore este e-mail por segurança.
                </p>
                <p style="color: #cbd5e1; font-size: 12px; margin-top: 8px;">
                    © 2026 Mikrogestor SaaS. Painel de Controle ISP.
                </p>
            </div>
        `
    };

    return await transporter.sendMail(mailOptions);
}

/**
 * Envia código OTP para validação de e-mail no primeiro acesso.
 */
export async function sendVerificationEmail(email: string, code: string) {
    const config = await getSmtpConfig();

    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: config.user,
            pass: config.pass,
        },
    });
    
    const mailOptions = {
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: email,
        subject: "Confirme seu E-mail - Mikrogestor",
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff;">
                <div style="background-color: #2563eb; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
                    <h2 style="color: #ffffff; font-weight: 900; margin: 0; text-transform: uppercase; font-style: italic;">MIKROGESTOR</h2>
                </div>
                <h3 style="color: #0f172a; font-weight: 800; margin-bottom: 12px;">Seja Bem-vindo ao Controle Total! 🚀</h3>
                <p style="color: #64748b; font-size: 16px; line-height: 24px;">
                    Seu cadastro no <strong>Mikrogestor SaaS</strong> foi realizado com sucesso. Para começar a gerir seu provedor, confirme sua identidade com o código abaixo:
                </p>
                <div style="margin: 32px 0; padding: 32px; background-color: #f8fafc; border-radius: 16px; border: 1px dashed #e2e8f0; text-align: center;">
                    <span style="font-size: 42px; font-weight: 900; letter-spacing: 0.25em; color: #2563eb; font-family: monospace;">${code}</span>
                </div>
                <p style="color: #94a3b8; font-size: 14px; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 24px;">
                    Este código expirará em 30 minutos. Se você não reconhece este cadastro, por favor ignore este e-mail.
                </p>
                <div style="margin-top: 32px; text-align: center;">
                    <p style="color: #cbd5e1; font-size: 12px;">© 2026 Mikrogestor SaaS. Tecnologia para Provedores de Elite.</p>
                </div>
            </div>
        `
    };

    return await transporter.sendMail(mailOptions);
}
