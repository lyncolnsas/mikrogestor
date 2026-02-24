import { VpnService } from "@/modules/saas/services/vpn.service";

/**
 * VPN Downgrade Enforcement Cron Job
 * 
 * Executes daily to enforce scheduled VPN downgrades.
 * Deactivates excess VPNs when the grace period expires.
 * 
 * Recommended schedule: Daily at 2 AM
 */
export async function runVpnDowngradeEnforcement() {
    

    try {
        await VpnService.enforceDowngradeSchedule();
        
    } catch (error) {
        console.error("[CRON] VPN downgrade enforcement failed:", error);
        throw error;
    }
}
