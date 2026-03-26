
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { sendPasswordResetEmail } from "@/lib/mail";

export async function POST(request: Request) {
    console.log("[API RECOVERY] Solicitação recebida via API Route!");
    
    try {
        const body = await request.json();
        const { email, phone } = body;
        const normalizedEmail = (email || "").toLowerCase();

        console.log(`[API RECOVERY] Email: ${normalizedEmail}, Phone: ${phone}`);

        // 1. Audit Log Inicial
        await (prisma as any).passwordRecoveryRequest.create({
            data: {
                name: "Anônimo (API)",
                email: normalizedEmail,
                phone: phone,
                status: "PENDING",
                message: "Iniciado via API Route Ultra-SaaS"
            }
        });

        // 2. Buscar Usuário
        const user = await (prisma as any).user.findFirst({
            where: {
                OR: [
                    { phone: phone },
                    { email: normalizedEmail }
                ],
                role: "ISP_ADMIN"
            }
        });

        if (!user) {
            console.warn("[API RECOVERY] Usuário não encontrado.");
            return NextResponse.json({ success: true, message: "Processado" });
        }

        console.log(`[API RECOVERY] Usuário identificado: ${user.name}`);

        // 3. Gerar Token e E-mail
        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 3600000);

        await (prisma as any).passwordResetToken.create({
            data: {
                email: user.email,
                token: token,
                expiresAt: expiresAt
            }
        });

        await (prisma as any).passwordRecoveryRequest.create({
            data: {
                name: user.name,
                email: user.email,
                phone: (user as any).phone || "N/A",
                status: "SENT_EMAIL",
                message: `Token gerado via API. Tentando envio para ${user.email}`
            }
        });

        try {
            await sendPasswordResetEmail(user.email, token);
            console.log("[API RECOVERY] ✅ E-mail enviado com sucesso!");
        } catch (mailErr) {
            console.error("[API RECOVERY] Erro no Nodemailer:", mailErr);
             await (prisma as any).passwordRecoveryRequest.create({
                data: {
                    name: user.name,
                    email: user.email,
                    status: "FAILED",
                    message: "Erro no envio de e-mail (SMTP)"
                }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[API RECOVERY] Erro Crítico:", error);
        return NextResponse.json({ success: false, error: "Internal Error" }, { status: 500 });
    }
}
