"use server"

import { protectedAction } from "@/lib/api/action-wrapper";
import { withTenantDb } from "@/lib/auth-utils.server";
import { format } from "date-fns";

export type LogEntry = {
    id: string;
    type: "auth_success" | "auth_failure" | "acct_start" | "acct_stop" | "sys_alert";
    user: string;
    nas: string;
    time: string;
    ip?: string;
    reason?: string;
    timestamp: Date; // for sorting
};

/**
 * Fetches combined logs from RadAcct (Accounting) and RadPostAuth (Authentication)
 */
export const getNetworkLogsAction = protectedAction(
    ["ISP_ADMIN", "TECHNICIAN"],
    async () => {
        // We use withTenantDb to get the client, but accessing 'radius' schema 
        // which might be shared or tenant-specific. 
        // Based on previous files, 'radius' schema is shared (schema.prisma).
        // We will filter by username if possible, but currently we fetch global logs 
        // and identifying tenant users might require joining with Customer table.
        // For now, fetching RECENT logs efficiently.

        return await withTenantDb(async (db) => {
            // Fetch Authentication Logs (PostAuth) - Using queryRaw because model might not be generated
            // Table: radius.radpostauth
            const authLogs = await db.$queryRaw<any[]>`
                SELECT 
                    id, 
                    username, 
                    reply, 
                    authdate, 
                    'unknown' as nasname -- RadPostAuth might not have nasname in minimal schema, check standard
                FROM "radius"."radpostauth"
                ORDER BY authdate DESC
                LIMIT 50
            `;

            // Fetch Accounting Logs (Acct)
            // Table: radius.radacct
            const acctLogs = await db.$queryRaw<any[]>`
                SELECT 
                    radacctid as id,
                    username,
                    nasipaddress,
                    acctstarttime,
                    acctstoptime,
                    acctterminatecause,
                    framedipaddress,
                    servicetype
                FROM "radius"."radacct"
                ORDER BY acctstarttime DESC
                LIMIT 50
            `;

            // Transform and Merge
            const formattedLogs: LogEntry[] = [];

            // Process Auth Logs
            authLogs.forEach((log) => {
                const isSuccess = log.reply === "Access-Accept";
                formattedLogs.push({
                    id: `auth-${log.id}`,
                    type: isSuccess ? "auth_success" : "auth_failure",
                    user: log.username,
                    nas: "Radius-Auth", // Or try to deduce
                    time: format(new Date(log.authdate), "HH:mm:ss"),
                    timestamp: new Date(log.authdate),
                    reason: isSuccess ? "Login OK" : log.reply,
                });
            });

            // Process Acct Logs
            acctLogs.forEach((log) => {
                // Acct Start
                if (log.acctstarttime) {
                    formattedLogs.push({
                        id: `acct-start-${log.id}`,
                        type: "acct_start",
                        user: log.username,
                        nas: log.nasipaddress,
                        time: format(new Date(log.acctstarttime), "HH:mm:ss"),
                        timestamp: new Date(log.acctstarttime),
                        ip: log.framedipaddress,
                    });
                }
                // Acct Stop
                if (log.acctstoptime) {
                    formattedLogs.push({
                        id: `acct-stop-${log.id}`,
                        type: "acct_stop",
                        user: log.username,
                        nas: log.nasipaddress,
                        time: format(new Date(log.acctstoptime), "HH:mm:ss"),
                        timestamp: new Date(log.acctstoptime),
                        reason: log.acctterminatecause || "Session End",
                    });
                }
            });

            // Sort merged logs by timestamp desc
            return formattedLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 50);
        });
    }
);
