import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const secretKey = process.env.JWT_SECRET || "development-secret-key-change-me";
const key = new TextEncoder().encode(secretKey);

/**
 * Estrutura do Payload da Sessão JWT.
 */
export type SessionPayload = {
    userId: string;
    email?: string;
    role: "SUPER_ADMIN" | "ISP_ADMIN" | "TECHNICIAN" | "SUBSCRIBER";
    tenantId?: string;
    tenantSlug?: string; // Adicionado para facilitar a troca de schemas do PostgreSQL
    tenantStatus?: "ACTIVE" | "BLOCKED" | "PROVISIONING" | "CANCELLED";
    isImpersonated?: boolean;
    originalAdminId?: string;
    expires: Date;
};

export async function encrypt(payload: SessionPayload) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("2h")
        .sign(key);
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(input, key, {
            algorithms: ["HS256"],
        });
        return payload as SessionPayload;
    } catch {
        return null;
    }
}

export async function createSession(payload: Omit<SessionPayload, "expires">) {
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const session = await encrypt({ ...payload, expires });

    const { cookies } = await import("next/headers");
    const isSecure = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") || false;

    (await cookies()).set("session", session, {
        httpOnly: true,
        secure: isSecure,
        expires,
        sameSite: "lax",
        path: "/",
    });
}

export async function deleteSession() {
    const { cookies } = await import("next/headers");
    (await cookies()).delete("session");
}

export async function getSession() {
    const { cookies } = await import("next/headers");
    const session = (await cookies()).get("session")?.value;
    if (!session) return null;
    return await decrypt(session);
}

export async function updateSession(request: NextRequest) {
    const session = request.cookies.get("session")?.value;
    if (!session) return;

    // Refresh the session so it doesn't expire
    const parsed = await decrypt(session);
    if (!parsed) return;

    parsed.expires = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const res = NextResponse.next();
    res.cookies.set({
        name: "session",
        value: await encrypt(parsed),
        httpOnly: true,
        expires: parsed.expires,
    });
    return res;
}
