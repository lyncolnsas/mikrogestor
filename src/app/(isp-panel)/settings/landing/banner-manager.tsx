"use client";

import { useState, useCallback } from "react";
// import { useDropzone } from "react-dropzone"; // Verify if installed, or use simple input
import { Button } from "@/components/ui/button";
import { X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

interface BannerManagerProps {
    urls: string[];
    onChange: (urls: string[]) => void;
    tenantId: string | undefined; // We might need this for upload path, or API infers it
}

export function BannerManager({ urls = [], onChange, tenantId }: BannerManagerProps) {
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async (file: File) => {
        if (!tenantId) {
            toast.error("Erro: ID do tenant não encontrado.");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("tenantId", tenantId);

        try {
            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Erro no upload");
            }

            const data = await response.json();
            const newUrl = data.url;

            onChange([...urls, newUrl]);
            toast.success("Imagem enviada com sucesso!");
        } catch (error) {
            console.error(error);
            toast.error("Falha ao enviar imagem. Verifique tamanho (<2MB) e formato.");
        } finally {
            setIsUploading(false);
        }
    };

    const removeImage = (indexToRemove: number) => {
        const newUrls = urls.filter((_, index) => index !== indexToRemove);
        onChange(newUrls);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {urls.map((url, index) => (
                    <div key={index} className="relative group aspect-video rounded-lg overflow-hidden border bg-muted">
                        <Image
                            src={url}
                            alt={`Banner ${index + 1}`}
                            fill
                            className="object-cover"
                        />
                        <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-500/90 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            title="Remover imagem"
                            aria-label="Remover imagem"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}

                {urls.length < 10 && (
                    <>
                        <div className="relative aspect-video">
                            <label className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors border-muted-foreground/25">
                                {isUploading ? (
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                ) : (
                                    <>
                                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                        <span className="text-xs text-muted-foreground font-medium text-center px-2">
                                            Adicionar<br />(Max 2MB)
                                        </span>
                                    </>
                                )}
                                <input
                                    type="file"
                                    className="hidden"
                                    id="banner-upload"
                                    accept="image/png, image/jpeg, image/webp"
                                    multiple
                                    onChange={(e) => {
                                        if (e.target.files) {
                                            const files = Array.from(e.target.files);
                                            if (urls.length + files.length > 10) {
                                                toast.error("Limite de 10 imagens atingido.");
                                                return;
                                            }
                                            files.forEach(handleUpload);
                                        }
                                    }}
                                />
                            </label>
                        </div>

                        {/* External URL Input */}
                        <div className="col-span-2 md:col-span-5 flex gap-2">
                            <input
                                type="url"
                                placeholder="Colar URL externa da imagem..."
                                className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const input = e.currentTarget;
                                        const url = input.value.trim();
                                        if (url) {
                                            if (urls.length >= 10) {
                                                toast.error("Limite de 10 imagens atingido.");
                                                return;
                                            }
                                            try {
                                                new URL(url);
                                                onChange([...urls, url]);
                                                input.value = "";
                                                toast.success("URL adicionada ao carrossel.");
                                            } catch {
                                                toast.error("URL inválida.");
                                            }
                                        }
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                    const url = input.value.trim();
                                    if (url) {
                                        if (urls.length >= 10) {
                                            toast.error("Limite de 10 imagens atingido.");
                                            return;
                                        }
                                        onChange([...urls, url]);
                                        input.value = "";
                                        toast.success("URL adicionada.");
                                    }
                                }}
                            >
                                Adicionar URL
                            </Button>
                        </div>
                    </>
                )}
            </div>
            <p className="text-xs text-muted-foreground">
                {urls.length} / 10 imagens utilizadas.
            </p>
        </div>
    );
}
