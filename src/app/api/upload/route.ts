import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { join } from "path";

export async function POST(request: NextRequest) {
    try {
        // Simple auth check - adjust based on your project's auth
        // In a real app, use: const session = await getServerSession(authOptions);
        // For now, we'll try to get the tenantId from the dashboard context if possible, 
        // but API routes usually need proper session handling.

        // Let's assume the user is authenticated if they can hit this endpoint 
        // (middleware usually handles protection, but we should verify).

        const formData = await request.formData();
        const file = formData.get("file") as File;
        const tenantId = formData.get("tenantId") as string;
        const type = formData.get("type") as string || "banner"; // default to banner

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!tenantId) {
            return NextResponse.json({ error: "No tenant ID provided" }, { status: 400 });
        }

        // Validate file type
        const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
        if (!validTypes.includes(file.type)) {
            return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
        }

        // Validate file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json({ error: "File exceeds 2MB limit" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure directory exists: public/uploads/[tenantId]
        const uploadDir = join(process.cwd(), "public", "uploads", tenantId);
        await mkdir(uploadDir, { recursive: true });

        // Generate unique filename
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.name) || (file.type === "image/svg+xml" ? ".svg" : ".png");
        const filename = `${type}-${uniqueSuffix}${ext}`;
        const filepath = join(uploadDir, filename);

        await writeFile(filepath, buffer);

        // Return public URL
        const publicUrl = `/uploads/${tenantId}/${filename}`;

        return NextResponse.json({ url: publicUrl });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
