import { SignJWT, jwtVerify } from 'jose';
import { Role, JWT_SECRET } from './iam.constants';

const secret = new TextEncoder().encode(JWT_SECRET);

export interface AccessTokenPayload {
    sub: string; // User ID
    email: string;
    role: Role;
    tenantId?: string;
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('2h')
        .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, secret);
        return payload as unknown as AccessTokenPayload;
    } catch (error) {
        return null;
    }
}
