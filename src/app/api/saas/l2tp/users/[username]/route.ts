import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import fs from "fs";

const CHAP_SECRETS_PATH = process.env.CHAP_SECRETS_PATH || "/host-ppp/chap-secrets";
const L2TP_SERVICE_NAME = "l2tpd";

function deleteUser(username: string): boolean {
    if (!fs.existsSync(CHAP_SECRETS_PATH)) return false;

    const content = fs.readFileSync(CHAP_SECRETS_PATH, "utf-8");
    const lines = content.split("\n");

    const filtered = lines.filter((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return true; // mantém comentários e linhas vazias
        const parts = trimmed.split(/\s+/);
        // Remove a linha se o username e service batem
        return !(parts[0] === username && parts[1] === L2TP_SERVICE_NAME);
    });

    if (filtered.length === lines.length) return false; // nada foi removido

    fs.writeFileSync(CHAP_SECRETS_PATH, filtered.join("\n"), "utf-8");
    return true;
}

// DELETE /api/saas/l2tp/users/[username]
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ username: string }> }
) {
    try {
        const session = await getSession();
        if (!session || session.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const { username } = await params;

        if (!username) {
            return NextResponse.json({ error: "Username inválido" }, { status: 400 });
        }

        const deleted = deleteUser(decodeURIComponent(username));

        if (!deleted) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: `Usuário ${username} removido` });
    } catch (error) {
        console.error("[L2TP Users DELETE]", error);
        return NextResponse.json({ error: "Erro ao remover usuário" }, { status: 500 });
    }
}
