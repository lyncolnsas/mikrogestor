import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const tenantSlug = request.headers.get("x-tenant-slug");
        
        if (!tenantSlug) {
            return NextResponse.json({ error: "Tenant context requested" }, { status: 400 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { slug: tenantSlug }
        });

        if (!tenant) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        const photos = await prisma.photo.findMany({
            where: { tenantId: tenant.id },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(photos);
    } catch (error) {
        console.error("Photos GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
