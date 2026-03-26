import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/auth/session";
import { getSubdomain } from "@/lib/tenancy/subdomain";

// 1. Definir rotas públicas e protegidas
const publicRoutes = ["/", "/guia", "/auth/login", "/auth/register", "/login", "/locked", "/redirect/block", "/redirect/alert", "/auth/recuperar", "/auth/reset-password"];
const saasAdminRoutes = ["/saas-admin"]; // Protege tudo sob /saas-admin
const ispPanelRoutes = ["/customers", "/financial", "/network", "/overview", "/settings", "/notifications"];
const technicianRoutes = ["/jobs", "/technician"];

export default async function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname;
    const host = req.headers.get("host") || "";
    const subdomain = getSubdomain(host);

    // 2. Bypass middleware for static uploads, Next.js assets, and common extensions
    if (
        path.startsWith("/uploads") || 
        path.startsWith("/_next") || 
        path.startsWith("/api/public") ||
        path.startsWith("/api/uploads") || // Custom asset serving via API
        path.includes(".")
    ) {
        return NextResponse.next();
    }

    // 3. Descriptografar a sessão do cookie
    const cookie = req.cookies.get("session")?.value;
    const session = cookie ? await decrypt(cookie) : null;

    // 3. Determinar o Tenant Sugerido (Propriedade Rule 1: Subdomínio Identifica o Usuário)
    // Se houver subdomínio, ele é a fonte da verdade para o tenant.
    const effectiveTenantSlug = subdomain || session?.tenantSlug || null;

    // 4. Verificar se a rota atual é protegida ou pública
    const isPublicRoute = publicRoutes.includes(path);

    // 5. Redirecionar para /auth/login se o usuário não estiver autenticado
    if (!isPublicRoute && !session) {
        return NextResponse.redirect(new URL("/auth/login", req.nextUrl));
    }

    // 6. Verificar Status do Tenant (Kill Switch)
    if (session?.tenantStatus === "BLOCKED" && path !== "/locked" && path !== "/auth/login") {
        return NextResponse.redirect(new URL("/locked", req.nextUrl));
    }

    // 7. Lógica de Redirecionamento Baseada em Papel (Traffic Controller)
    if (session) {
        // Se logado e tentando acessar rotas públicas (exceto root e guia), redirecionar para dashboard
        if (isPublicRoute && path !== "/" && path !== "/locked" && path !== "/guia") {
            return redirectToDashboard(session.role, req);
        }

        // Proteger SaaS Admin
        if (saasAdminRoutes.some(route => path.startsWith(route))) {
            if (session.role !== "SUPER_ADMIN") {
                return redirectToDashboard(session.role, req);
            }
        }

        // Proteger ISP Panel
        if (ispPanelRoutes.some(route => path.startsWith(route)) && session.role !== "ISP_ADMIN") {
            return redirectToDashboard(session.role, req);
        }

        // Proteger Technician
        if (technicianRoutes.some(route => path.startsWith(route)) && session.role !== "TECHNICIAN") {
            return redirectToDashboard(session.role, req);
        }
    }

    // 8. Propagar contexto do tenant via header para rotas de API e componentes de servidor
    const response = NextResponse.next();

    if (effectiveTenantSlug) {
        response.headers.set('x-tenant-slug', effectiveTenantSlug);
    }

    return response;
}

function redirectToDashboard(role: string, req: NextRequest) {
    if (role === "SUPER_ADMIN") return NextResponse.redirect(new URL("/saas-admin/tower", req.nextUrl));
    if (role === "ISP_ADMIN") return NextResponse.redirect(new URL("/overview", req.nextUrl));
    if (role === "TECHNICIAN") return NextResponse.redirect(new URL("/technician/dashboard", req.nextUrl));
    if (role === "SUBSCRIBER") return NextResponse.redirect(new URL("/portal", req.nextUrl));
    return NextResponse.redirect(new URL("/auth/login", req.nextUrl));
}

// Rotas onde o Middleware não deve executar
export const config = {
    matcher: ["/((?!api|_next/static|_next/image|uploads|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.webp$|.*\\.gif$|.*\\.ico$).*)"],
};
