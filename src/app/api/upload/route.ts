import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import path from "path";

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate via Header (x-api-key)
        const apiKey = request.headers.get("x-api-key");
        
        if (!apiKey) {
            return NextResponse.json({ error: "Unauthorized: Missing API Key" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { apiKey },
            include: { tenant: true }
        });

        if (!user) {
            return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
        }

        // 2. Extract and Validate File
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const type = formData.get("type") as string || "photo";

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!validTypes.includes(file.type)) {
            return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            return NextResponse.json({ error: "File exceeds 5MB limit" }, { status: 400 });
        }

        // 3. Storage Logic (Via Abstraction Layer)
        const tenantId = user.tenantId || "default";
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.name) || ".png";
        const filename = `${type}-${uniqueSuffix}${ext}`;

        const publicUrl = await storage.upload(buffer, filename, tenantId);

        // 4. Record in Database (Rule: Photos are isolated by user/tenant)
        const photo = await prisma.photo.create({
            data: {
                url: publicUrl,
                userId: user.id,
                tenantId: tenantId
            }
        });

        return NextResponse.json({ 
            success: true, 
            url: publicUrl,
            photoId: photo.id 
        });

    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
