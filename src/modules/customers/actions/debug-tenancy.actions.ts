
"use server"

import { protectedAction } from "@/lib/api/action-wrapper"
import { withTenantDb } from "@/lib/auth-utils.server"

export const debugTenancyAction = protectedAction(
    ["ISP_ADMIN", "SUPER_ADMIN"],
    async () => {
        return await withTenantDb(async (db) => {
            const searchPath = await db.$queryRaw`SHOW search_path` as any[];
            const customersCount = await db.customer.count();
            const rawCustomers = await db.$queryRaw`SELECT COUNT(*) as count FROM customers` as any[];
            const qualifiedCustomers = await db.$queryRaw`SELECT COUNT(*) as count FROM management.customers` as any[];

            const tableList = await db.$queryRaw`
                SELECT table_schema, table_name 
                FROM information_schema.tables 
                WHERE table_name = 'customers'
            ` as any[];

            return {
                searchPath: searchPath[0].search_path,
                countPrisma: customersCount,
                countRawUnqualified: rawCustomers[0].count,
                countRawQualified: qualifiedCustomers[0].count,
                tables: tableList
            };
        });
    }
);
