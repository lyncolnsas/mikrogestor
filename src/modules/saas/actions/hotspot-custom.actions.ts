"use server";

import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { revalidatePath } from "next/cache";

import { getCurrentTenant } from "@/lib/auth-utils.server";

export async function uploadHotspotZipAction(formData: FormData) {
    const context = await getCurrentTenant();
    if (!context) throw new Error("Não autorizado");
    const tenantId = context.tenantId;

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

export async function toggleHotspotCustomPageAction(enabled: boolean) {
    const context = await getCurrentTenant();
    if (!context) throw new Error("Não autorizado");

    await prisma.hotspotConfig.update({
        where: { tenantId: context.tenantId },
        data: { useCustomPage: enabled }
    });
    revalidatePath("/mk-integration");
    return { success: true };
}
