import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import path from "path";
import sharp from "sharp";

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate via Header (x-api-key) OR Session
        const apiKey = request.headers.get("x-api-key");
        let user;

        if (apiKey) {
            user = await prisma.user.findUnique({
                where: { apiKey },
                include: { tenant: true }
            });
        } else {
            // Fallback: Check if user is logged in via session
            const { getSession } = await import("@/lib/auth/session");
            const session = await getSession();
            if (session?.userId) {
                user = await prisma.user.findUnique({
                    where: { id: session.userId },
                    include: { tenant: true }
                });
            }
        }
        
        if (!user) {
            return NextResponse.json({ error: "Unauthorized: Missing or Invalid Authentication" }, { status: 401 });
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
        let buffer = Buffer.from(bytes);

        // Security: Re-encode image using Sharp to strip malicious metadata/hidden code
        try {
            const image = sharp(buffer);
            const metadata = await image.metadata();
            
            // Re-encode to the same format but sanitized
            // This strips EXIF, XMP, and other potentially dangerous metadata chunks
            if (metadata.format === "jpeg" || metadata.format === "jpg") {
                buffer = await image.jpeg({ quality: 85, mozjpeg: true }).toBuffer() as any;
            } else if (metadata.format === "png") {
                buffer = await image.png({ quality: 85, compressionLevel: 9 }).toBuffer() as any;
            } else if (metadata.format === "webp") {
                buffer = await image.webp({ quality: 85 }).toBuffer() as any;
            } else {
                // Default fallback: convert to WebP for maximum security/compression
                buffer = await image.webp({ quality: 85 }).toBuffer() as any;
            }
        } catch (err) {
            console.error("Image processing failed (possible malicious file):", err);
            return NextResponse.json({ error: "Invalid or corrupted image file" }, { status: 400 });
        }

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
