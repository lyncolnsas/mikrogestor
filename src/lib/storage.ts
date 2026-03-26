import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import path from "path";

/**
 * Interface para drivers de storage
 */
interface StorageDriver {
  upload: (file: Buffer, filename: string, tenantId: string) => Promise<string>;
}

/**
 * Driver para salvamento Local (padrão atual)
 */
class LocalStorageDriver implements StorageDriver {
  async upload(file: Buffer, filename: string, tenantId: string): Promise<string> {
    const uploadDir = path.resolve(process.cwd(), "public", "uploads", tenantId);
    console.log(`[Storage] Uploading to: ${uploadDir}`);
    
    await mkdir(uploadDir, { recursive: true });
    
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, file);
    
    const relativeUrl = `/api/uploads/${tenantId}/${filename}`;
    console.log(`[Storage] File saved. Public URL: ${relativeUrl}`);
    
    return relativeUrl;
  }
}

/**
 * Driver para S3 (Exemplo de implementação futura)
 */
/*
class S3StorageDriver implements StorageDriver {
  async upload(file: Buffer, filename: string, tenantId: string): Promise<string> {
    // Implementar upload via @aws-sdk/client-s3
    return `https://seu-bucket.s3.amazonaws.com/${tenantId}/${filename}`;
  }
}
*/

// Exportar o driver ativo baseado em env
const driver: StorageDriver = new LocalStorageDriver();

export const storage = driver;
