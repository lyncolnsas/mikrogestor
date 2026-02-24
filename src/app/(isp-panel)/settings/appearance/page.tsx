"use client"

import {
    Paintbrush,
    Upload,
    Palette,
    Check,
    Loader2,
    Save,
    Image as ImageIcon,
    Smartphone,
    Layout
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { NeonCard } from "@/components/ui/neon-card";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getLandingConfigAction, updateLandingConfigAction } from "@/modules/saas/actions/landing.actions";

const PRESET_COLORS = [
    { name: "Azul Elétrico", value: "oklch(0.65 0.18 250)", class: "bg-[oklch(0.65_0.18_250)]" },
    { name: "Esmeralda", value: "oklch(0.7 0.15 150)", class: "bg-[oklch(0.7_0.15_150)]" },
    { name: "Índigo", value: "oklch(0.6 0.15 280)", class: "bg-[oklch(0.6_0.15_280)]" },
    { name: "Âmbar", value: "oklch(0.8 0.12 80)", class: "bg-[oklch(0.8_0.12_80)]" },
    { name: "Rosa", value: "oklch(0.6 0.18 20)", class: "bg-[oklch(0.6_0.18_20)]" },
];

export default function AppearanceSettingsPage() {
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [config, setConfig] = useState<any>(null);
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0].value);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function loadConfig() {
            try {
                const result = await getLandingConfigAction({});
                if (result.data) {
                    setConfig(result.data);
                    setSelectedColor(result.data.primaryColor || PRESET_COLORS[0].value);
                    setLogoUrl(result.data.logoUrl || null);
                }
            } catch (error) {
                toast.error("Erro ao carregar configurações");
            } finally {
                setIsLoading(false);
            }
        }
        loadConfig();
    }, []);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !config) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("tenantId", config.tenantId);
        formData.append("type", "logo");

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (data.url) {
                setLogoUrl(data.url);
                toast.success("Logotipo carregado com sucesso!");
            } else {
                toast.error(data.error || "Erro no upload");
            }
        } catch (error) {
            toast.error("Falha ao enviar arquivo");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await updateLandingConfigAction({
                ...config,
                primaryColor: selectedColor,
                secondaryColor: selectedColor,
                logoUrl: logoUrl || "",
            });
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Identidade visual atualizada!");
            }
        } catch (error) {
            toast.error("Erro ao salvar alterações");
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Carregando Identidade...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-700">
            {/* Cabeçalho Fixo */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-xl sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_15px_-5px_var(--color-primary)]">
                        <Paintbrush className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-foreground uppercase tracking-tight italic">Personalização</h2>
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest opacity-70">Identidade Visual & Branding</p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={isSaving} variant="neon" className="gap-2 italic px-8 h-11 uppercase font-black tracking-tighter shadow-lg shadow-primary/20">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar Alterações
                </Button>
            </div>

            <div className="p-8 space-y-12 overflow-auto flex-1 max-w-5xl mx-auto w-full">
                {/* 1. Logotipo da Marca */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="rounded-lg h-8 w-8 p-0 flex items-center justify-center bg-primary/10 text-primary border-primary/20 font-black italic">01</Badge>
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground italic">Logotipo da Marca</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Upload da Logo</Label>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleLogoUpload}
                                accept="image/*"
                                className="hidden"
                                title="Upload de Logotipo"
                            />
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-border rounded-3xl p-10 flex flex-col items-center justify-center bg-card/30 hover:bg-card/50 hover:border-primary/40 transition-all cursor-pointer group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="w-16 h-16 rounded-2xl bg-background border border-border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative z-10 shadow-xl">
                                    {uploading ? (
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    ) : (
                                        <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                                    )}
                                </div>
                                <p className="text-xs font-black text-foreground relative z-10 uppercase tracking-tight">
                                    {uploading ? "Enviando..." : "Arraste ou selecione"}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-widest font-bold opacity-60 relative z-10">PNG, SVG (Max 2MB)</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Pré-visualização</Label>
                            <NeonCard className="h-[188px] flex items-center justify-center bg-card group relative overflow-hidden border-border" glow={false}>
                                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-center gap-3 transition-all">
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Logotipo do Cliente" className="max-h-24 max-w-[200px] object-contain" />
                                    ) : (
                                        <div className="flex items-center gap-3 opacity-30 scale-95">
                                            <ImageIcon className="h-10 w-10 text-primary" />
                                            <span className="font-black text-2xl tracking-tighter uppercase italic text-foreground">Sua Logo</span>
                                        </div>
                                    )}
                                </div>
                            </NeonCard>
                        </div>
                    </div>
                </section>

                <Separator className="bg-border opacity-50" />

                {/* 2. Brand Colors */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="rounded-lg h-8 w-8 p-0 flex items-center justify-center bg-primary/10 text-primary border-primary/20 font-black italic">02</Badge>
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground italic">Esquema de Cores</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-4">
                                    <Palette className="h-4 w-4 text-primary" /> Paleta Sugerida
                                </Label>
                                <div className="flex flex-wrap gap-5">
                                    {PRESET_COLORS.map((color) => (
                                        <button
                                            key={color.value}
                                            onClick={() => setSelectedColor(color.value)}
                                            className="flex flex-col items-center gap-3 group"
                                        >
                                            <div
                                                className={cn(
                                                    "w-14 h-14 rounded-2xl border-2 transition-all flex items-center justify-center shadow-lg transform group-hover:scale-110",
                                                    color.class,
                                                    selectedColor === color.value
                                                        ? "border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                                                        : "border-transparent opacity-60 hover:opacity-100"
                                                )}
                                            >
                                                {selectedColor === color.value && <Check className="h-7 w-7 text-white drop-shadow-md" />}
                                            </div>
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-widest transition-colors",
                                                selectedColor === color.value ? "text-primary" : "text-muted-foreground opacity-50"
                                            )}>{color.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Separator className="bg-border opacity-30" />

                            <div className="p-4 bg-muted/5 border border-border rounded-2xl">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 italic">Aviso de Acessibilidade</p>
                                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                                    Cores de alto contraste garantem que seu painel seja legível para todos os tipos de usuários e dispositivos.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Preview de Interface</Label>
                            <NeonCard className="p-6 space-y-4 bg-card border-border" variant="primary">
                                <div className="flex items-center gap-2 mb-2">
                                    <div
                                        className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center p-1"
                                        style={{ borderColor: selectedColor }}
                                    >
                                        {logoUrl ? <img src={logoUrl} alt="Miniatura Logo" className="w-full h-full object-contain" /> : <div className="w-full h-full bg-primary/20 rounded" />}
                                    </div>
                                    <div className="h-3 w-24 bg-muted/20 rounded-full" />
                                </div>
                                <div className="space-y-2">
                                    <div className="h-4 w-full bg-muted/10 rounded-lg" />
                                    <div className="h-4 w-3/4 bg-muted/10 rounded-lg" />
                                </div>
                                <Button
                                    className="w-full h-9 rounded-xl font-black text-[10px] uppercase tracking-widest italic"
                                    variant="neon"
                                    style={{ backgroundColor: selectedColor }}
                                >
                                    Botão de Ação
                                </Button>
                                <div className="flex gap-2 justify-center pt-2">
                                    <Layout className="h-4 w-4 text-muted-foreground/30" />
                                    <Smartphone className="h-4 w-4 text-muted-foreground/30" />
                                </div>
                            </NeonCard>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
