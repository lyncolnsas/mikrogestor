import { NextRequest, NextResponse } from "next/server";
import { runVpnDowngradeEnforcement } from "@/lib/cron/vpn-downgrade.cron";

/**
 * VPN Downgrade Enforcement Cron Endpoint
 * 
 * This endpoint should be called daily by a cron service (Vercel Cron, GitHub Actions, etc.)
 * to enforce scheduled VPN downgrades.
 * 
 * Security: Protected by CRON_SECRET environment variable
 * 
 * Usage with Vercel Cron (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/vpn-downgrade",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        await runVpnDowngradeEnforcement();

        return NextResponse.json({
            success: true,
            message: "VPN downgrade enforcement completed",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("[API] VPN downgrade cron failed:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}
