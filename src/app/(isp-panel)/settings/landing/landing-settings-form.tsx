"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { updateLandingConfigAction, togglePlanVisibilityAction } from "@/modules/saas/actions/landing.actions";
import { toast } from "sonner";
import { Globe, Save, ExternalLink, Phone, MapPin, Palette, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { TestimonialManager } from "./testimonial-manager";
import { FAQManager } from "./faq-manager";
import { BannerManager } from "./banner-manager";

const formSchema = z.object({
    title: z.string().min(3, "Título é muito curto"),
    subtitle: z.string().optional(),
    heroDescription: z.string().optional(),
    primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Cor inválida"),
    secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Cor inválida"),
    logoUrl: z.string().url("URL inválida").optional().or(z.literal("")),
    bannerUrl: z.string().url("URL inválida").optional().or(z.literal("")),
    bannerUrls: z.array(z.string()).default([]),
    whatsapp: z.string().optional(),
    address: z.string().optional(),
    isActive: z.boolean().default(true),
    showTestimonials: z.boolean().default(true),
    showFAQ: z.boolean().default(true),
    showFloatingCTA: z.boolean().default(true),
});

interface LandingSettingsFormProps {
    initialConfig: any;
    plans: any[];
    tenantSlug: string;
    testimonials: any[];
    faqs: any[];
}

export function LandingSettingsForm({ initialConfig, plans, tenantSlug, testimonials, faqs }: LandingSettingsFormProps) {
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialConfig?.title || "Nossa Internet",
            subtitle: initialConfig?.subtitle || "A melhor conexão para você e sua família.",
            heroDescription: initialConfig?.heroDescription || "",
            primaryColor: initialConfig?.primaryColor || "#2563eb",
            secondaryColor: initialConfig?.secondaryColor || "#10b981",
            logoUrl: initialConfig?.logoUrl || "",
            bannerUrl: initialConfig?.bannerUrl || "",
            bannerUrls: initialConfig?.bannerUrls || [],
            whatsapp: initialConfig?.whatsapp || "",
            address: initialConfig?.address || "",
            showTestimonials: initialConfig?.showTestimonials !== false,
            showFAQ: initialConfig?.showFAQ !== false,
            showFloatingCTA: initialConfig?.showFloatingCTA !== false,
            isActive: initialConfig?.isActive !== false,
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSaving(true);
        // Inject deprecated field to satisfy type requirements
        const result = await updateLandingConfigAction({ ...values, showCoverageChecker: false });
        setIsSaving(false);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Configurações do site atualizadas!");
        }
    }

    async function handleTogglePlan(planId: string, currentStatus: boolean) {
        const result = await togglePlanVisibilityAction({ planId, show: !currentStatus });
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(currentStatus ? "Plano removido do site" : "Plano agora está visível no site");
        }
    }

    const publicUrl = `/p/${tenantSlug}`;

    return (
        <div className="space-y-10">
            {/* Visual Preview Alert */}
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                        <Globe className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-indigo-500">Seu site está online!</p>
                        <p className="text-xs text-indigo-500/80 font-medium">Endereço: {publicUrl}</p>
                    </div>
                </div>
                <Button variant="outline" className="bg-card border-indigo-500/20 text-indigo-500 font-bold" asChild>
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                        Visualizar <ExternalLink size={14} />
                    </a>
                </Button>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Basic Info */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Globe className="h-5 w-5 text-blue-600" /> Conteúdo Principal
                            </h3>

                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Título Principal</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: NetFast Fibra" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="subtitle"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Subtítulo / Descrição</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Descreva brevemente seu diferencial..."
                                                className="resize-none h-24"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="heroDescription"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descrição Detalhada (Opcional)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Texto adicional para a seção principal..."
                                                className="resize-none h-20"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="isActive"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel>Site Ativo</FormLabel>
                                            <FormDescription>
                                                Se desativado, os clientes não verão sua landing page.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Contact & Identity */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Palette className="h-5 w-5 text-blue-600" /> Identidade e Contato
                            </h3>

                            <FormField
                                control={form.control}
                                name="logoUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>URL do Logo (Opcional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://exemplo.com/logo.png" {...field} />
                                        </FormControl>
                                        <FormDescription>Link direto para a imagem do seu logo.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="bannerUrls"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Banners Rotativos (Opcional)</FormLabel>
                                        <FormControl>
                                            <BannerManager
                                                urls={field.value || []}
                                                onChange={field.onChange}
                                                tenantId={tenantSlug} // Passing slug as ID for now, or need actual ID
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Carrossel de imagens (Max 10, 2MB cada). Recomendado: 1920x1080px.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="primaryColor"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cor Principal</FormLabel>
                                        <div className="flex gap-4">
                                            <FormControl>
                                                <Input type="color" className="p-1 h-10 w-20" {...field} />
                                            </FormControl>
                                            <Input {...field} placeholder="#000000" className="flex-1" />
                                        </div>
                                        <FormDescription>Cor da sua marca para botões e destaques.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="secondaryColor"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cor Secundária</FormLabel>
                                        <div className="flex gap-4">
                                            <FormControl>
                                                <Input type="color" className="p-1 h-10 w-20" {...field} />
                                            </FormControl>
                                            <Input {...field} placeholder="#000000" className="flex-1" />
                                        </div>
                                        <FormDescription>Cor para ícones de sucesso e detalhes.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="whatsapp"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2"><Phone size={14} className="text-emerald-600" /> WhatsApp de Vendas</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: 5511999999999" {...field} />
                                        </FormControl>
                                        <FormDescription>Usado para pedidos de novos planos.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2"><MapPin size={14} className="text-blue-600" /> Endereço Físico</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Rua Exemplo, 123 - Centro" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    {/* Conversion Features Section */}
                    <div className="space-y-6 pt-8 border-t">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-blue-600" /> Recursos de Conversão
                        </h3>
                        <p className="text-sm text-muted-foreground">Ative ou desative seções específicas da sua landing page.</p>

                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="showTestimonials"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel>Depoimentos</FormLabel>
                                            <FormDescription>
                                                Seção de prova social
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="showFAQ"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel>FAQ (Perguntas Frequentes)</FormLabel>
                                            <FormDescription>
                                                Seção de dúvidas comuns
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="showFloatingCTA"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel>Botão Flutuante WhatsApp</FormLabel>
                                            <FormDescription>
                                                CTA fixo no canto da tela
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <Button type="submit" disabled={isSaving} className="gap-2 px-8 font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                            {isSaving ? "Salvando..." : <><Save size={18} /> Salvar Alterações</>}
                        </Button>
                    </div>
                </form>
            </Form>

            {/* Content Management Sections */}
            <div className="grid md:grid-cols-2 gap-8 pt-8 border-t">
                <TestimonialManager testimonials={testimonials} />
                <FAQManager faqs={faqs} />
            </div>

            {/* Plan Visibility Management */}
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Globe className="h-5 w-5 text-blue-600" /> Gestão de Planos no Site
                    </h3>
                    <p className="text-sm text-muted-foreground">Selecione quais planos de internet deseja exibir na sua página pública.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {plans.map((plan) => (
                        <Card key={plan.id} className={`overflow-hidden border-2 transition-all ${plan.showOnLanding ? 'border-blue-500 shadow-md' : 'border-border opacity-80'}`}>
                            <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <p className="font-black text-lg text-foreground">{plan.name}</p>
                                        <Switch
                                            checked={plan.showOnLanding}
                                            onCheckedChange={() => handleTogglePlan(plan.id, plan.showOnLanding)}
                                        />
                                    </div>
                                    <p className="text-2xl font-black text-blue-600 mt-1">R$ {Number(plan.price).toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground font-bold uppercase mt-2">{plan.download}MB Down / {plan.upload}MB Up</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {plans.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">Cadastre planos no menu Financeiro para que apareçam aqui.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
