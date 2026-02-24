"use server";

import { protectedAction } from "@/lib/api/action-wrapper";
import { BackupService, BackupFile } from "../services/backup.service";
import fs from "fs/promises";
import { revalidatePath } from "next/cache";

/**
 * Lists all available backups
 */
export const getBackupsAction = protectedAction(
    ["SUPER_ADMIN"],
    async () => {
        return await BackupService.listBackups();
    }
);

/**
 * Manually triggers a new backup
 */
export const createBackupAction = protectedAction(
    ["SUPER_ADMIN"],
    async () => {
        const backup = await BackupService.createBackup("Solicitação Manual");
        revalidatePath("/saas-admin/backups");
        return backup;
    }
);

/**
 * Prepares a backup for download (reads file content)
 * Note: For very large files, a streaming approach via a Route Handler would be better.
 * But for this MVP, sending base64 or just checking existence is fine. 
 * Actually, we can just return the path for the client to request via a route handler if we had one.
 * Given the constraints, we will read the file and return base64 for client-side download.
 * WARNING: This is memory intensive for large dumps.
 */
export const downloadBackupAction = protectedAction(
    ["SUPER_ADMIN"],
    async (filename: string) => {
        const filePath = BackupService.getBackupPath(filename);
        try {
            const content = await fs.readFile(filePath, { encoding: 'base64' });
            return { content, filename };
        } catch (error) {
            console.error("Error reading backup file:", error);
            throw new Error("Failed to read backup file");
        }
    }
);
