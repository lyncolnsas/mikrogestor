import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { existsSync, createReadStream } from "fs";

const execAsync = promisify(exec);

export type BackupFile = {
    name: string;
    size: number;
    createdAt: Date;
    trigger?: string;
};

export class BackupService {
    private static STORAGE_PATH = "/app/storage/backups";

    /**
     * Ensures the backup directory exists
     */
    private static async ensureDirectory() {
        if (!existsSync(this.STORAGE_PATH)) {
            await fs.mkdir(this.STORAGE_PATH, { recursive: true });
        }
    }

    /**
     * Creates a new database backup
     * @param triggerReason The reason for this backup (e.g., "Auto: New Plan")
     */
    static async createBackup(triggerReason: string = "Manual"): Promise<BackupFile> {
        await this.ensureDirectory();

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `backup-${timestamp}.sql`;
        const filepath = path.join(this.STORAGE_PATH, filename);

        // Construct pg_dump command
        // We use env vars that should be available in the container
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL not configured");

        // Sanitize URL for pg_dump (remove query params like schema/search_path which pg_dump rejects)
        // pg_dump expects just the connection details, not client options
        let cleanDbUrl = dbUrl;
        try {
            const urlObj = new URL(dbUrl);
            urlObj.search = ""; // Remove all query params
            cleanDbUrl = urlObj.toString();
        } catch (e) {
            console.warn("[Backup] Could not parse DATABASE_URL, using as is.");
        }

        const command = `pg_dump "${cleanDbUrl}" -f "${filepath}"`;

        try {

            const { stdout, stderr } = await execAsync(command);

            if (stderr) {
                console.warn("[Backup] pg_dump stderr:", stderr);
            }

            // Save metadata (optional, or just parse from filename/file stats later)
            // For now, we'll just rely on the file system

            const stats = await fs.stat(filepath);

            return {
                name: filename,
                size: stats.size,
                createdAt: stats.birthtime,
                trigger: triggerReason
            };
        } catch (error: any) {
            console.error("[Backup] Failed to create backup:", error);
            // Include cmd output if available
            if (error.stdout)
                if (error.stderr) console.error("[Backup] stderr:", error.stderr);

            throw new Error(`Failed to create backup: ${error.message}`);
        }
    }

    /**
     * Lists all available backups
     */
    static async listBackups(): Promise<BackupFile[]> {
        await this.ensureDirectory();

        try {
            const files = await fs.readdir(this.STORAGE_PATH);
            const backupFiles: BackupFile[] = [];

            for (const file of files) {
                if (!file.endsWith('.sql')) continue;

                const filepath = path.join(this.STORAGE_PATH, file);
                const stats = await fs.stat(filepath);

                backupFiles.push({
                    name: file,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    trigger: "Unknown" // We might want to store metadata in a separate json file if we really need this persistent
                });
            }

            return backupFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        } catch (error) {
            console.error("[Backup] Failed to list backups:", error);
            return [];
        }
    }

    /**
     * Gets the full path for a backup file
     */
    static getBackupPath(filename: string): string {
        // Prevent directory traversal
        const safeFilename = path.basename(filename);
        return path.join(this.STORAGE_PATH, safeFilename);
    }
}
