import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const IPSEC_SECRETS_PATH = process.env.IPSEC_SECRETS_PATH || "/host-ipsec.secrets";
const CHAP_SECRETS_PATH = process.env.CHAP_SECRETS_PATH || "/host-ppp/chap-secrets";
const VPS_IP = process.env.VPS_PUBLIC_IP || "76.13.160.251";

function readPsk(): string | null {
    if (!fs.existsSync(IPSEC_SECRETS_PATH)) return null;
    const content = fs.readFileSync(IPSEC_SECRETS_PATH, "utf-8");
    const match = content.match(/PSK\s+"([^"]+)"/);
    return match ? match[1] : null;
}

function writePsk(newPsk: string): void {
    const content = `# IPSec Pre-Shared Key - Managed by Mikrogestor\n${VPS_IP} %any : PSK "${newPsk}"\n`;
    fs.writeFileSync(IPSEC_SECRETS_PATH, content, "utf-8");
}

// GET /api/saas/l2tp/config — Retorna configuração L2TP
export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const psk = readPsk();

        // Verifica status dos serviços (via existência de arquivos montados no volume)
        const strongswanActive = fs.existsSync(IPSEC_SECRETS_PATH);
        const xl2tpdActive = fs.existsSync(CHAP_SECRETS_PATH);

        return NextResponse.json({
            psk: psk || null,
            vpsIp: VPS_IP,
            services: {
                strongswan: strongswanActive,
                xl2tpd: xl2tpdActive,
            },
            config: {
                serverIp: VPS_IP,
                authType: "PSK",
                protocol: "L2TP/IPSec",
                ports: {
                    ike: 500,
                    natT: 4500,
                    l2tp: 1701,
                },
            },
        });
    } catch (error) {
        console.error("[L2TP Config GET]", error);
        return NextResponse.json({ error: "Erro ao ler configuração" }, { status: 500 });
    }
}

// PUT /api/saas/l2tp/config — Atualiza PSK
export async function PUT(req: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const { psk } = await req.json();

        if (!psk || psk.length < 8) {
            return NextResponse.json({ error: "PSK deve ter pelo menos 8 caracteres" }, { status: 400 });
        }

        writePsk(psk.trim());

        return NextResponse.json({
            success: true,
            message: "PSK atualizado. Reinicie o strongSwan no servidor para aplicar.",
        });
    } catch (error) {
        console.error("[L2TP Config PUT]", error);
        return NextResponse.json({ error: "Erro ao atualizar PSK" }, { status: 500 });
    }
}
