import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RadiusService } from "@/modules/saas/services/radius.service";

type RouteParams = {
    tenantId: string;
};

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<RouteParams> }
) {
    try {
        const { tenantId } = await params;
        const data = await request.json();

        const { name, email, phone, mac, challenge, ["link-login"]: linkLogin } = data;

        if (!mac || !tenantId) return NextResponse.json({ success: false, error: "MAC address or tenant missing" }, { status: 400 });

        // Create lead
        const lead = await prisma.hotspotLead.create({
            data: {
                tenantId,
                name: name || "Visitante",
                email: email || "",
                phone: phone || "",
                macAddress: mac,
                username: `hs_${mac.replace(/:/g, "")}`,
            }
        });

        // Create Radius account
        const username = `hs_${mac.replace(/:/g, "")}`;
        const password = "p" + Math.random().toString(36).slice(-6);

        await RadiusService.syncCustomer(tenantId, {
            id: `hotspot_${mac}`,
            name: name || "Hotspot User",
            radiusPassword: password,
        } as any, {
            upload: 5,
            download: 10,
            remoteIpPool: "hotspot_pool"
        });

        // Redirect URL for MikroTik
        let redirect = "";
        if (linkLogin) {
            try {
                const loginUrl = new URL(linkLogin);
                loginUrl.searchParams.append("username", username);
                loginUrl.searchParams.append("password", password);
                redirect = loginUrl.toString();
            } catch (e) {
                // If link-login is not a valid URL (MikroTik might send relative or just hostname)
                redirect = `${linkLogin}?username=${username}&password=${password}`;
            }
        }

        return NextResponse.json({ 
            success: true, 
            redirect, 
            username, 
            password 
        });

    } catch (error: any) {
        console.error("Hotspot API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
