"use server";

import { prisma } from "@/lib/prisma";
import { RadiusService } from "@/modules/saas/services/radius.service";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(8).optional().or(z.literal("")),
  cpf: z.string().optional().or(z.literal("")),
  mac: z.string(),
  challenge: z.string().optional(),
  linkLogin: z.string().optional(),
});

export type RegisterHotspotResult = {
  success: boolean;
  username: string;
  password: string;
  redirect?: string;
  error?: string;
};

export async function registerHotspotUserAction(tenantId: string, formData: FormData): Promise<RegisterHotspotResult> {
  try {
    const data = registerSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      cpf: formData.get("cpf"),
      mac: formData.get("mac"),
      challenge: formData.get("challenge"),
      linkLogin: formData.get("linkLogin"),
    });

    // Get config for session/redirect settings
    const config = await prisma.hotspotConfig.findUnique({
      where: { tenantId }
    });

    const usernameBase = `hotspot_${data.mac.replace(/:/g, "")}`;
    const radiusUsername = `t${tenantId}_${usernameBase}`;
    const password = "p" + Math.random().toString(36).slice(-6);

    // Create lead
    await prisma.hotspotLead.create({
      data: {
        tenantId,
        name: data.name || "Visitante",
        email: data.email || "",
        phone: data.phone || "",
        cpfCnpj: data.cpf || "",
        macAddress: data.mac,
        username: radiusUsername,
      }
    });

    await RadiusService.syncCustomer(tenantId, {
      id: usernameBase,
      name: data.name || "Hotspot User",
      radiusPassword: password,
    } as any, {
      upload: 5,
      download: 10,
      remoteIpPool: "hotspot_pool"
    });

    // Redirect to MikroTik login if linkLogin is provided
    let redirectUrl = "";
    if (data.linkLogin) {
      try {
        const loginUrl = new URL(data.linkLogin);
        loginUrl.searchParams.append("username", radiusUsername);
        loginUrl.searchParams.append("password", password);
        
        // If config has a redirectUrl, tell MikroTik to go there after login
        if (config?.redirectUrl) {
          loginUrl.searchParams.append("dst", config.redirectUrl);
        }
        
        redirectUrl = loginUrl.toString();
      } catch (e) {
        // Fallback for non-url linkLogin
        redirectUrl = `${data.linkLogin}?username=${radiusUsername}&password=${password}${config?.redirectUrl ? `&dst=${encodeURIComponent(config.redirectUrl)}` : ''}`;
      }
    }

    return { 
      success: true, 
      username: radiusUsername, 
      password, 
      redirect: redirectUrl 
    };
  } catch (error: any) {
    console.error("[Register Hotspot Action] Error:", error);
    return {
      success: false,
      username: "",
      password: "",
      error: error.message || "Erro no registro"
    };
  }
}
