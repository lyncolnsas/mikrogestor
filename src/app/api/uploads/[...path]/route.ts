import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { lookup } from "mime-types";

/**
 * Custom Route Handler to serve uploaded files.
 * This is CRITICAL for Next.js Standalone mode where files added at runtime 
 * to the 'public' folder are not automatically served.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path: pathSegments } = await params;
        const relativePath = join(...pathSegments);
        
        // Ensure we are only accessing the uploads directory for security
        const fullPath = join(process.cwd(), "public", "uploads", relativePath);

        if (!existsSync(fullPath)) {
            console.warn(`[AssetServer] File not found: ${fullPath}`);
            return new NextResponse("Not Found", { status: 404 });
        }

        const fileBuffer = await readFile(fullPath);
        const mimeType = lookup(fullPath) || "application/octet-stream";

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": mimeType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        console.error("[AssetServer] Error serving file:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
