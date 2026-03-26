import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

const DEFAULT_BLOCK_HTML = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aviso de Suspensão</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 flex items-center justify-center min-h-screen p-4">
    <div class="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden text-center p-8 space-y-6">
        <div class="h-20 w-20 bg-red-500 rounded-full mx-auto flex items-center justify-center animate-pulse">
            <svg class="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        </div>
        <div class="space-y-2">
            <h1 class="text-2xl font-black text-slate-900">Conexão Suspensa</h1>
            <p class="text-slate-500">Identificamos uma pendência financeira que interrompeu seu acesso temporariamente.</p>
        </div>
        <div class="bg-red-50 p-4 rounded-2xl border border-red-100 text-sm text-red-700 font-bold mb-6">
            Pague via Pix agora e reative em segundos!
        </div>
        <a href="/portal" class="block w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-lg text-center">
            Abrir Central do Assinante
        </a>
        <p class="text-slate-400 text-xs mt-4">Mikrogestor - Inteligência em Conectividade</p>
    </div>
</body>
</html>
`;

export default async function BlockPage() {
    const headersList = await headers();
    const tenantSlug = headersList.get("x-tenant-slug");

    if (!tenantSlug) {
        return <div dangerouslySetInnerHTML={{ __html: DEFAULT_BLOCK_HTML }} />;
    }

    const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
        include: { landingConfig: true }
    });

    const customHtml = tenant?.landingConfig?.blockHtml;

    return (
        <div dangerouslySetInnerHTML={{ __html: customHtml || DEFAULT_BLOCK_HTML }} />
    );
}
