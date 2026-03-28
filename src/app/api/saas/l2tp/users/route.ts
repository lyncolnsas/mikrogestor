import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import fs from "fs";

const CHAP_SECRETS_PATH = process.env.CHAP_SECRETS_PATH || "/host-ppp/chap-secrets";
const L2TP_SERVICE_NAME = "l2tpd";

interface L2tpUser {
    username: string;
    service: string;
    ipOrWildcard: string;
}

function readUsers(): L2tpUser[] {
    if (!fs.existsSync(CHAP_SECRETS_PATH)) return [];

    const content = fs.readFileSync(CHAP_SECRETS_PATH, "utf-8");
    const users: L2tpUser[] = [];

    for (const line of content.split("\n")) {
        const trimmed = line.trim();
        // Ignora comentários e linhas vazias
        if (!trimmed || trimmed.startsWith("#")) continue;

        const parts = trimmed.split(/\s+/);
        if (parts.length >= 3 && parts[1] === L2TP_SERVICE_NAME) {
            users.push({
                username: parts[0],
                service: parts[1],
                ipOrWildcard: parts[3] || "*",
            });
        }
    }
    return users;
}

function writeUser(username: string, password: string): void {
    const line = `\n${username}  ${L2TP_SERVICE_NAME}  ${password}  *`;

    if (!fs.existsSync(CHAP_SECRETS_PATH)) {
        fs.writeFileSync(CHAP_SECRETS_PATH, `# L2TP Users - Managed by Mikrogestor\n${line}`, "utf-8");
    } else {
        const existing = fs.readFileSync(CHAP_SECRETS_PATH, "utf-8");
        // Verifica se usuário já existe
        if (existing.includes(`\n${username} `) || existing.includes(`\n${username}\t`)) {
            throw new Error("Usuário já existe");
        }
        fs.appendFileSync(CHAP_SECRETS_PATH, line, "utf-8");
    }
}

// GET /api/saas/l2tp/users — Lista usuários
export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const users = readUsers();
        return NextResponse.json({ users, total: users.length });
    } catch (error) {
        console.error("[L2TP Users GET]", error);
        return NextResponse.json({ error: "Erro ao listar usuários" }, { status: 500 });
    }
}

// POST /api/saas/l2tp/users — Cria usuário
export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ error: "Usuário e senha são obrigatórios" }, { status: 400 });
        }

        // Validação básica
        if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
            return NextResponse.json({ error: "Nome de usuário inválido (use apenas letras, números, _ . -)" }, { status: 400 });
        }

        writeUser(username.trim(), password.trim());

        return NextResponse.json({ success: true, message: `Usuário ${username} criado com sucesso` });
    } catch (error: any) {
        console.error("[L2TP Users POST]", error);
        if (error.message === "Usuário já existe") {
            return NextResponse.json({ error: "Usuário já existe" }, { status: 409 });
        }
        return NextResponse.json({ error: "Erro ao criar usuário" }, { status: 500 });
    }
}
