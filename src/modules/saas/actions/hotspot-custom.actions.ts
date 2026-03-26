"use server";

import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { revalidatePath } from "next/cache";

export async function uploadHotspotZipAction(tenantId: string, formData: FormData) {
    const file = formData.get("file") as File;
    if (!file) throw new Error("Arquivo não enviado");

    if (!file.name.endsWith(".zip")) {
        throw new Error("Apenas arquivos .zip são permitidos");
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Path to store and extract: storage/hotspot/[tenantId]/portal
    const storagePath = path.join(process.cwd(), "storage", "hotspot", tenantId, "portal");
    
    // Create folders
    if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
    }

    // Clean current folder before extracting new version
    const files = fs.readdirSync(storagePath);
    for (const f of files) {
        const fullPath = path.join(storagePath, f);
        if (fs.lstatSync(fullPath).isDirectory()) {
            fs.rmSync(fullPath, { recursive: true });
        } else {
            fs.unlinkSync(fullPath);
        }
    }

    // Extract
    try {
        const zip = new AdmZip(buffer);
        zip.extractAllTo(storagePath, true);
        
        // Update DB
        await prisma.hotspotConfig.update({
            where: { tenantId },
            data: {
                useCustomPage: true,
                customPagePath: "/api/hotspot/" + tenantId + "/portal/index.html"
            }
        });

        revalidatePath("/mk-integration");
        return { success: true };
    } catch (error: any) {
        console.error("ZIP Error:", error);
        throw new Error("Erro ao extrair o arquivo ZIP: " + error.message);
    }
}

export async function toggleHotspotCustomPageAction(tenantId: string, enabled: boolean) {
    await prisma.hotspotConfig.update({
        where: { tenantId },
        data: { useCustomPage: enabled }
    });
    revalidatePath("/mk-integration");
    return { success: true };
}
