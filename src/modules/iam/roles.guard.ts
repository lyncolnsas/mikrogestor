import { Role } from './iam.constants';
import { AccessTokenPayload } from './jwt.service';

export function hasRole(user: AccessTokenPayload, requiredRoles: Role[]): boolean {
    if (!user || !user.role) return false;
    return requiredRoles.includes(user.role);
}

export function assertRole(user: AccessTokenPayload, requiredRoles: Role[]) {
    if (!hasRole(user, requiredRoles)) {
        throw new Error('Forbidden: Insufficient Permissions');
    }
}
