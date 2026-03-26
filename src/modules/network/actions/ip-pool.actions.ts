"use server";

import * as z from "zod";
import { protectedAction } from "@/lib/api/action-wrapper";
import { IpamService } from "../ipam.service";
import { revalidatePath } from "next/cache";

const ipPoolSchema = z.object({
    name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
    rangeStart: z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, "IP inicial inválido"),
    rangeEnd: z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, "IP final inválido"),
    description: z.string().optional(),
    nasId: z.coerce.number().optional(),
});

/**
 * Busca todos os Pools de IP do Tenant
 */
export const getIpPoolsAction = protectedAction(
    ["ISP_ADMIN", "SUPER_ADMIN"],
    async () => {
        const ipam = new IpamService();
        return await ipam.getPools();
    }
);

/**
 * Cria um novo Pool de IP e sincroniza com o Radius
 */
export const createIpPoolAction = protectedAction(
    ["ISP_ADMIN", "SUPER_ADMIN"],
    async (input) => {
        const data = ipPoolSchema.parse(input);
        const ipam = new IpamService();
        
        const pool = await ipam.createPool(data);
        
        revalidatePath("/(isp-panel)/network/pools", "page");
        return pool;
    }
);

/**
 * Remove um Pool de IP e seus registros no Radius
 */
export const deleteIpPoolAction = protectedAction(
    ["ISP_ADMIN", "SUPER_ADMIN"],
    async (id: string) => {
        const ipam = new IpamService();
        await ipam.deletePool(id);
        
        revalidatePath("/(isp-panel)/network/pools", "page");
        return { success: true };
    }
);
