import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContext {
    tenantId: string;
    schema: string;
    isInsideTransaction?: boolean;
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext | undefined {
    return tenantStorage.getStore();
}

export function runWithTenant<T>(context: TenantContext, callback: () => T): T {
    return tenantStorage.run(context, callback);
}
