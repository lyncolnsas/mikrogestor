"use server";

import { protectedAction } from "@/lib/api/action-wrapper";
import { BackupService, BackupFile } from "../services/backup.service";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
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

/**
 * Restores the database from a given backup file
 */
export const restoreBackupAction = protectedAction(
    ["SUPER_ADMIN"],
    async (filename: string) => {
        const success = await BackupService.restoreBackup(filename);
        revalidatePath("/saas-admin/backups");
        return { success };
    }
);

/**
 * Uploads a backup file and restores it immediately
 */
export const uploadRestoreAction = protectedAction(
    ["SUPER_ADMIN"],
    async (formData: FormData) => {
        const file = formData.get("file") as File;
        if (!file) throw new Error("Arquivo não enviado");

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const tempPath = path.join(process.cwd(), "storage", "backups", `upload_${Date.now()}.sql`);
        
        try {
            // Ensure directory exists
            await fs.mkdir(path.dirname(tempPath), { recursive: true });
            
            // Write temp file
            await fs.writeFile(tempPath, buffer);
            
            // Restore from temp file
            const success = await BackupService.restoreBackup("upload_manual", tempPath);
            
            // Delete temp file
            await fs.unlink(tempPath);
            
            revalidatePath("/saas-admin/backups");
            return { success };
        } catch (error: any) {
            // Cleanup on error
            if (existsSync(tempPath)) await fs.unlink(tempPath);
            console.error("[Upload Restore] Error:", error);
            throw new Error(`Falha no upload/restauração: ${error.message}`);
        }
    }
);
