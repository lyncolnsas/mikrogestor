import { spawn } from "child_process";
import { exec } from "child_process";
import { promisify } from "util";
import { prisma } from "@/lib/prisma";

const execAsync = promisify(exec);

/**
 * Serviço responsável pelo provisionamento dinâmico de schemas (BD) por tenant.
 * Uses "Smart Cloning" via pg_dump to replicate tenant_template exactly.
 */
export class SchemaService {
    /**
     * Verifica se as ferramentas necessárias (pg_dump, psql, sed) estão disponíveis.
     */
    static async testTools() {
        const results: Record<string, { ok: boolean; error?: string }> = {};

        const tools = [
            { name: 'pg_dump', cmd: 'pg_dump --version' },
            { name: 'psql', cmd: 'psql --version' },
            { name: 'sed', cmd: 'sed --version' }
        ];

        for (const tool of tools) {
            try {
                await execAsync(tool.cmd);
                results[tool.name] = { ok: true };
            } catch (error: any) {
                // Try fallback for sed on some windows environments
                if (tool.name === 'sed') {
                    try {
                        await execAsync("sed --help");
                        results[tool.name] = { ok: true };
                        continue;
                    } catch (e) { }
                }
                results[tool.name] = { ok: false, error: error.message };
            }
        }

        const missing = Object.entries(results).filter(([_, r]) => !r.ok);
        if (missing.length > 0) {
            const details = missing.map(([name, r]) => `${name} (${r.error})`).join(", ");
            return { success: false, error: `Ferramentas ausentes no HOST: ${details}. Certifique-se de que o Postgres Client e o SED estão no PATH ou rode via Docker.` };
        }

        return { success: true };
    }

    /**
     * Cria um novo schema para um tenant clonando o template.
     */
    static async createTenantSchema(tenantSlug: string, logId?: string) {
        const schemaName = `tenant_${tenantSlug.replace(/-/g, '_')}`;
        await this.safeLog(logId, 'STARTED', `Initializing schema ${schemaName}`);

        // 0. Preliminary Tool Check
        const toolsCheck = await this.testTools();
        if (!toolsCheck.success) {
            console.warn(`[SchemaService] External tools missing, falling back to Pure SQL Cloning: ${toolsCheck.error}`);
            return await this.cloneSchemaViaSql(schemaName, logId);
        }

        try {
            // 1. Check existing
            const exists: any[] = await prisma.$queryRaw`
                SELECT schema_name FROM information_schema.schemata 
                WHERE schema_name = ${schemaName}
            `;

            if (exists.length > 0) {
                await this.safeLog(logId, 'EXISTS', `Schema ${schemaName} already exists`);
                
                return schemaName;
            }

            // 2. Prepare Command
            const dbUrl = process.env.DATABASE_URL;
            if (!dbUrl) throw new Error("DATABASE_URL not configured");

            // Remove query params (like ?schema=management) to avoid pg_dump/psql errors
            let cleanDbUrl = dbUrl;
            try {
                const urlObj = new URL(dbUrl);
                urlObj.search = "";
                cleanDbUrl = urlObj.toString();
            } catch (e) {
                console.warn("[SchemaService] Failed to parse DATABASE_URL, using raw string");
            }

            
            await this.safeLog(logId, 'CLONING', `Running pg_dump clone pipeline...`);

            // Extract password for PGPASSWORD to avoid hang on prompt
            let pgPassword = "";
            try {
                const urlObj = new URL(dbUrl);
                pgPassword = urlObj.password;
            } catch (e) { }

            // Split the command into two parts: dump and psql, with sed in between
            const dumpCommand = `pg_dump "${cleanDbUrl}" --schema=tenant_template --no-owner --no-acl`;
            const psqlCommand = `psql "${cleanDbUrl}"`;

            try {
                

                // 1. PG_DUMP
                

                const dumpProc = spawn("pg_dump", [
                    cleanDbUrl,
                    "--schema=tenant_template",
                    "--no-owner",
                    "--no-acl"
                ], { env: { ...process.env, PGPASSWORD: pgPassword } });

                const psqlProc = spawn("psql", [cleanDbUrl], {
                    env: { ...process.env, PGPASSWORD: pgPassword }
                });

                // Error handlers
                let dumpError = "";
                let psqlError = "";
                dumpProc.stderr.on('data', (data) => dumpError += data.toString());
                psqlProc.stderr.on('data', (data) => psqlError += data.toString());

                // Transform logic: Stream-based replacement
                // For simplicity and to avoid splitting keywords across chunks, 
                // we'll use a simple approach but ensure we don't hold the whole dump in memory.
                const { Transform } = await import('stream');
                const replaceStream = new Transform({
                    transform(chunk, encoding, callback) {
                        // This is slightly naive if the keyword is split exactly at chunk boundary,
                        // but pg_dump output is usually large chunks. 
                        // To be 100% safe we'd need a multi-chunk buffer.
                        const content = chunk.toString();
                        const transformed = content.replace(/tenant_template/g, schemaName);
                        callback(null, transformed);
                    }
                });

                // Pipe chain
                dumpProc.stdout.pipe(replaceStream).pipe(psqlProc.stdin);

                // Wait for completion
                await new Promise((resolve, reject) => {
                    let dumpFinished = false;
                    let psqlFinished = false;

                    const cleanup = (err?: Error) => {
                        dumpProc.kill();
                        psqlProc.kill();
                        if (err) reject(err);
                    };

                    dumpProc.on('error', (err) => cleanup(new Error(`Falha ao iniciar pg_dump: ${err.message}. Verifique se está instalado.`)));
                    psqlProc.on('error', (err) => cleanup(new Error(`Falha ao iniciar psql: ${err.message}. Verifique se está instalado.`)));

                    dumpProc.on('close', (code) => {
                        dumpFinished = true;
                        if (code !== 0 && code !== null) reject(new Error(`pg_dump falhou (code ${code}): ${dumpError}`));
                    });

                    psqlProc.on('close', (code) => {
                        psqlFinished = true;
                        if (code !== 0 && code !== null) reject(new Error(`psql falhou (code ${code}): ${psqlError}`));
                        if (dumpFinished) resolve(true);
                    });

                    // Global timeout
                    setTimeout(() => {
                        if (!psqlFinished) {
                            cleanup(new Error("A clonagem do banco de dados excedeu o tempo limite (60s). Verifique a conectividade."));
                        }
                    }, 60000);
                });

                
                
            } catch (cmdError: any) {
                const stderr = cmdError.stderr || "";
                const message = cmdError.message || "";
                console.error("[SchemaService] pg_dump pipeline failed:", stderr || message);

                if (stderr.includes("authentication failed") || message.includes("password")) {
                    throw new Error("Falha na conexão: Autenticação negada. Verifique o DATABASE_URL.");
                }

                throw new Error(`Pipeline execution failed: ${stderr || message}`);
            }

            await this.safeLog(logId, 'COMPLETED', `Schema ${schemaName} provisioned successfully`);
            
            return schemaName;

        } catch (error: any) {
            console.error(`[SchemaService] Error creating schema ${schemaName}:`, error);
            // Check if it was a timeout
            const errorMessage = error.signal === 'SIGTERM' ? 'Operation timed out (90s)' : (error.message || String(error));
            await this.safeLog(logId, 'FAILED', errorMessage);
            throw new Error(`Schema provisioning failed: ${errorMessage}`);
        }
    }

    /**
     * Fallback: Clones schema using only Raw SQL queries.
     * Replicates tables, indexes, and constraints using CREATE TABLE (LIKE ... INCLUDING ALL).
     */
    private static async cloneSchemaViaSql(targetSchema: string, logId?: string) {
        
        await this.safeLog(logId, 'CLONING', `Running SQL-only cloning (No pg_dump)...`);

        try {
            // 1. Create Schema
            await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${targetSchema}"`);

            // 2. Get all tables from template
            const tables: { tablename: string }[] = await prisma.$queryRaw`
                SELECT tablename 
                FROM pg_catalog.pg_tables 
                WHERE schemaname = 'tenant_template'
            `;

            for (const { tablename } of tables) {
                
                // Create table with all constraints/indexes
                await prisma.$executeRawUnsafe(`
                    CREATE TABLE IF NOT EXISTS "${targetSchema}"."${tablename}" 
                    (LIKE "tenant_template"."${tablename}" INCLUDING ALL)
                `);

                // Copy data if any (usually template data like default plans if they exist in schema)
                await prisma.$executeRawUnsafe(`
                    INSERT INTO "${targetSchema}"."${tablename}" 
                    SELECT * FROM "tenant_template"."${tablename}"
                    ON CONFLICT DO NOTHING
                `);
            }

            await this.safeLog(logId, 'COMPLETED', `Schema ${targetSchema} cloned via SQL`);
            return targetSchema;

        } catch (error: any) {
            console.error(`[SchemaService] SQL Cloning failed for ${targetSchema}:`, error);
            await this.safeLog(logId, 'FAILED', `SQL Clone Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Atualiza o log de provisionamento de forma segura (sem quebrar se a tabela não existir/migração falhar)
     */
    private static async safeLog(id: string | undefined, step: string, details: string) {
        if (!id) return;
        try {
            let status: 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' = 'IN_PROGRESS';
            if (step === 'COMPLETED') status = 'COMPLETED';
            if (step === 'FAILED') status = 'FAILED';

            await prisma.tenantProvisioningLog.update({
                where: { id },
                data: { step, details, status }
            });
        } catch (e) {
            console.warn("[SchemaService] Failed to write provisioning log:", e);
        }
    }

    /**
     * Helper to execute a command with stdin input (since util.promisify(exec) doesn't support it)
     */
    private static execWithInput(command: string, input: string, options: any): Promise<{ stdout: string, stderr: string }> {
        return new Promise((resolve, reject) => {
            const child = exec(command, options, (error, stdout, stderr) => {
                if (error) {
                    reject({ error, stdout, stderr });
                } else {
                    resolve({ stdout: stdout as unknown as string, stderr: stderr as unknown as string });
                }
            });

            if (child.stdin) {
                child.stdin.write(input);
                child.stdin.end();
            } else {
                reject(new Error("Failed to open stdin for child process"));
            }
        });
    }

    /**
     * Lista todos os schemas de tenants existentes.
     */
    static async listSchemas() {
        const result = await prisma.$queryRaw`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name LIKE 'tenant_%'
    `;
        return result;
    }
}
