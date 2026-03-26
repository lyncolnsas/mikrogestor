"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/auth-utils.server";
import { MikrotikService } from "../services/mikrotik.service";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const hotspotConfigSchema = z.object({
  title: z.string().min(2),
  subtitle: z.string().optional(),
  primaryColor: z.string().default('#2563eb'),
  logoUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  bgType: z.enum(['IMAGE', 'VIDEO', 'COLOR']).default('IMAGE'),
  
  collectName: z.boolean().default(true),
  collectEmail: z.boolean().default(true),
  collectPhone: z.boolean().default(true),
  collectCpf: z.boolean().default(false),
  
  lgpdActive: z.boolean().default(true),
  termsOfUse: z.string().optional(),
  privacyPolicyUrl: z.string().optional(),
  
  sessionTime: z.number().default(60),
  redirectUrl: z.string().optional(),
  useCustomPage: z.boolean().optional(),
  
  // Marketing Automation
  welcomeEmailActive: z.boolean().default(false),
  welcomeEmailSubject: z.string().optional(),
  welcomeEmailBody: z.string().optional(),
  
  welcomeWhatsappActive: z.boolean().default(false),
  welcomeWhatsappBody: z.string().optional(),
  
  npsActive: z.boolean().default(false),
  npsQuestion: z.string().optional(),
  npsTimeout: z.number().default(60),
  
  walledGarden: z.array(z.string()).optional(),
});

/**
 * Gets the hotspot configuration for the tenant (PUBLIC).
 */
export async function getHotspotConfigAction(tenantId?: string) {
  let targetTenantId = tenantId;

  if (!targetTenantId) {
    const context = await getCurrentTenant();
    if (!context) throw new Error("Unauthorized");
    targetTenantId = context.tenantId;
  }

  return await prisma.hotspotConfig.findUnique({
    where: { tenantId: targetTenantId }
  });
}

export async function saveHotspotConfigAction(data: any) {
  const context = await getCurrentTenant();
  if (!context) throw new Error("Unauthorized");

  try {
    const validated = hotspotConfigSchema.parse(data);

    const config = await prisma.hotspotConfig.upsert({
      where: { tenantId: context.tenantId },
      create: {
        ...validated,
        tenantId: context.tenantId
      },
      update: validated
    });

    revalidatePath("/mk-integration");
    return { success: true, config };
  } catch (error: any) {
    console.error("[Save Hotspot Config] Error:", error);
    return { 
      success: false, 
      error: error.message || "Erro desconhecido ao salvar banco de dados. Verifique se as migrações (db push) foram aplicadas." 
    };
  }
}

/**
 * Provisions the hotspot on the MikroTik router.
 */
export async function provisionHotspotAction(nasId: number, options: {
  interface: string;
  hotspotAddress: string;
  dnsName: string;
}) {
  const context = await getCurrentTenant();
  if (!context) throw new Error("Unauthorized");

  const nas = await prisma.nas.findUnique({ where: { id: nasId } });
  if (!nas || nas.tenantId !== context.tenantId) throw new Error("NAS não autorizado");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const portalUrl = `${appUrl}/hotspot/${context.tenantId}`;
  
  const tunnel = await prisma.vpnTunnel.findFirst({
    where: { tenantId: context.tenantId, type: 'ROUTER' }
  });
  
  const radiusServerIp = '10.255.0.1'; // Primary VPN IP

  try {
    await MikrotikService.setupHotspot(nasId, {
      interface: options.interface,
      hotspotAddress: options.hotspotAddress,
      dnsName: options.dnsName,
      radiusServerIp: radiusServerIp,
      radiusSecret: nas.secret,
      portalUrl: portalUrl
    });

    return { success: true };
  } catch (error: any) {
    console.error("[Hotspot Provision Action] Error:", error.message);
    throw new Error(error.message || "Erro no provisionamento do Hotspot");
  }
}

/**
 * Gets the leads captured via the hotspot.
 */
export async function getHotspotLeadsAction() {
  const context = await getCurrentTenant();
  if (!context) throw new Error("Unauthorized");

  return await prisma.hotspotLead.findMany({
    where: { tenantId: context.tenantId },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Generates a MikroTik configuration script for the Hotspot.
 */
export async function generateHotspotScriptAction(nasId: number, options: {
  interface: string;
  dnsName: string;
  hotspotAddress?: string;
}) {
  const context = await getCurrentTenant();
  if (!context) throw new Error("Unauthorized");

  const nas = await prisma.nas.findUnique({ where: { id: nasId } });
  if (!nas || nas.tenantId !== context.tenantId) throw new Error("NAS não autorizado");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const portalUrl = `${appUrl}/hotspot/${context.tenantId}`;
  const radiusIp = "10.255.0.1";
  const portalHost = new URL(appUrl).hostname;

  const script = `
# ========================================================
# MIKROGESTOR - CONFIGURAÇÃO DE HOTSPOT AUTOMÁTICA
# ========================================================
# ID DO TENANT: ${context.tenantId}
# NOME DO NAS: ${nas.shortname}
# DESCRIÇÃO: Este script configura o servidor Hotspot e o link com RADIUS
# DATA DE GERAÇÃO: ${new Date().toLocaleString('pt-BR')}

:log info "MG-HOTSPOT: Iniciando configuracao..."

# 1. Configurar Cliente RADIUS (Caso não exista)
:if ([/radius find address=${radiusIp}] = "") do={
    /radius add address=${radiusIp} secret="${nas.secret}" service=hotspot timeout=5000ms comment="Radius Hotspot Mikrogestor"
}

# 2. Habilitar RADIUS Incoming (Para desconexão remota / CoA)
/radius incoming set accept=yes port=3799

# 3. Walled Garden (Liberar destinos obrigatórios antes do login)
:local portalHost "${portalHost}"
/ip hotspot walled-garden add dst-host=$portalHost action=allow comment="Portal Captivo Mikrogestor"
/ip hotspot walled-garden add dst-host="*.google.com" action=allow comment="Google Assets"
/ip hotspot walled-garden add dst-host="*.gstatic.com" action=allow comment="Google Assets"
/ip hotspot walled-garden add dst-host="*.googleapis.com" action=allow comment="Google API Assets"
/ip hotspot walled-garden add dst-host="*.facebook.com" action=allow comment="Facebook Assets"
/ip hotspot walled-garden add dst-host="*.fbcdn.net" action=allow comment="Facebook CDN"

# 4. Profile do Hotspot (Protocolo de Comunicação)
/ip hotspot profile add name="hsp_mgestor" \\
    dns-name="${options.dnsName}" \\
    hotspot-address=${options.hotspotAddress || "0.0.0.0"} \\
    login-by=http-chap,https,http-pap,mac-cookie \\
    use-radius=yes \\
    radius-interim-update=00:05:00 \\
    split-user-domain=yes

# 5. Criar Servidor Hotspot (Instância do Rodízio)
/ip hotspot add name="hs_mgestor" \\
    interface="${options.interface}" \\
    profile="hsp_mgestor" \\
    disabled=no \\
    address-pool=none

# 6. Melhorias de UX & Cookies
/ip hotspot profile set [ find name=hsp_mgestor ] http-cookie-lifetime=3d

:log info "MG-HOTSPOT: Configuracao finalizada com sucesso!"
# Lembre-se de configurar o DHCP Pool e o NAT para a interface ${options.interface} se necessário.
`.trim();

  return { success: true, script };
}

/**
 * Uploads a hotspot asset (image or video).
 */
export async function uploadHotspotAssetAction(formData: FormData) {
  const context = await getCurrentTenant();
  if (!context) throw new Error("Unauthorized");

  const file = formData.get("file") as File;
  if (!file) throw new Error("Arquivo não encontrado");

  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  
  if (!isVideo && !isImage) throw new Error("Tipo de arquivo não suportado. Use imagens ou vídeos.");

  // Validation: 10MB for video, 500KB for image
  const maxSize = isVideo ? 10 * 1024 * 1024 : 500 * 1024;
  if (file.size > maxSize) {
    throw new Error(`Arquivo muito grande. Máximo de ${isVideo ? '10MB' : '500KB'}.`);
  }

  const { storage } = await import("@/lib/storage");
  const buffer = Buffer.from(await file.arrayBuffer());
  
  // Create unique filename to avoid collision but keep extension
  const extension = file.name.split(".").pop();
  const filename = `asset_${Date.now()}.${extension}`;
  
  const url = await storage.upload(buffer, filename, context.tenantId);
  
  return { success: true, url };
}
