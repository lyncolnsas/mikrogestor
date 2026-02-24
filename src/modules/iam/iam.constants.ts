export enum Role {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ISP_ADMIN = 'ISP_ADMIN',
    TECHNICIAN = 'TECHNICIAN',
}

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod';
