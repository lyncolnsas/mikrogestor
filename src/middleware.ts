import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/auth/session";

// 1. Definir rotas públicas e protegidas
const publicRoutes = ["/", "/auth/login", "/auth/register", "/login"];
const saasAdminRoutes = ["/saas-admin"]; // Protege tudo sob /saas-admin
const ispPanelRoutes = ["/customers", "/financial", "/network", "/overview", "/settings"];
const technicianRoutes = ["/jobs", "/technician"];

export default async function middleware(req: NextRequest) {
    // 2. Verificar se a rota atual é protegida ou pública
    const path = req.nextUrl.pathname;
    const isPublicRoute = publicRoutes.includes(path);

    // 3. Descriptografar a sessão do cookie
    const cookie = req.cookies.get("session")?.value;
    const session = cookie ? await decrypt(cookie) : null;

    // 4. Redirecionar para /auth/login se o usuário não estiver autenticado
    if (!isPublicRoute && !session) {
        return NextResponse.redirect(new URL("/auth/login", req.nextUrl));
    }

    // 4.5. Verificar Status do Tenant (Kill Switch)
    if (session?.tenantStatus === "BLOCKED" && path !== "/locked" && path !== "/auth/login") {
        // Permite que Super Admin bypass? Talvez não se estiver impersonando.
        // Se for login real de Super Admin, tenantId geralmente é undefined, então status undefined.
        // Status bloqueado vem do tenant.
        return NextResponse.redirect(new URL("/locked", req.nextUrl));
    }

    // 5. Lógica de Redirecionamento Baseada em Papel (Traffic Controller)
    if (session) {
        // Se logado e tentando acessar rotas públicas (exceto root), redirecionar para dashboard
        if (isPublicRoute && path !== "/") {
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

    // 6. Propagar contexto do tenant via header para rotas de API e componentes de servidor
    const response = NextResponse.next();

    if (session?.tenantSlug) {
        response.headers.set('x-tenant-slug', session.tenantSlug);
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
    matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
