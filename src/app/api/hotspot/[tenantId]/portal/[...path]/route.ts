export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import mime from "mime-types";

type RouteParams = {
    tenantId: string;
    path: string[];
};

export async function GET(
    request: NextRequest, 
    { params }: { params: Promise<RouteParams> }
) {
    try {
        const { tenantId, path: pathArray } = await params;
        const requestedPath = pathArray.join(path.sep);

        // Path to the extracted files: storage/hotspot/[tenantId]/portal/[...path]
        const storagePath = path.join(process.cwd(), "storage", "hotspot", tenantId, "portal", requestedPath);

        if (!fs.existsSync(storagePath) || fs.lstatSync(storagePath).isDirectory()) {
            return new NextResponse("Not Found", { status: 404 });
        }

        const fileBuffer = fs.readFileSync(storagePath);
        const contentType = mime.lookup(storagePath) || "application/octet-stream";

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=3600"
            }
        });
    } catch (error) {
        console.error("Hotspot Portal Serve Error:", error);
        return new NextResponse("Server Error", { status: 500 });
    }
}
