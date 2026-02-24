"use server";

import { protectedAction } from "@/lib/api/action-wrapper";
import { RadiusEngineService } from "@/modules/network/radius-engine.service";
import { revalidatePath } from "next/cache";

export const executeMassBlockAction = protectedAction(
    ["ISP_ADMIN"],
    async () => {
        const radiusEngine = new RadiusEngineService();

        try {
            const result = await radiusEngine.syncBlockingRules();

            revalidatePath("/financial/dashboard");
            return {
                success: true,
                blockedCount: result.blockedCount,
                processedUsers: result.processedUsers
            };
        } catch (error) {
            console.error("[Mass Block Action] Failed:", error);
            throw new Error("Falha ao executar bloqueio em massa.");
        }
    }
);
