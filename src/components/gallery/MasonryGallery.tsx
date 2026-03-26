"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon, Loader2, Maximize2, Share2, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Photo {
  id: string;
  url: string;
  createdAt: string;
}

export function MasonryGallery() {
  const { data: photos, isLoading, isError, refetch } = useQuery<Photo[]>({
    queryKey: ["tenant-photos"],
    queryFn: async () => {
      const res = await fetch("/api/photos");
      if (!res.ok) throw new Error("Falha ao carregar galeria");
      return res.json();
    },
    refetchInterval: 5000, // Pooling for "auto-updating" feature (Rule 3)
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
        <p className="animate-pulse">Sincronizando com a nuvem...</p>
      </div>
    );
  }

  if (isError || !photos || photos.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center min-h-[400px] border-dashed bg-muted/20 text-center px-6">
        <div className="p-4 rounded-full bg-muted mb-4">
          <ImageIcon className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Sua Galeria está vazia</h3>
        <p className="text-muted-foreground mb-6 max-w-xs">
          Use o script Uploader para enviar as fotos do seu ponto de venda automaticamente para cá.
        </p>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          Atualizar Manualmente
        </Button>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Galeria Multi-tenant</h2>
          <p className="text-muted-foreground">Fotos sincronizadas via API do Provedor.</p>
        </div>
        <div className="flex gap-2">
           <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-xs text-green-600 font-medium">LIVE</span>
        </div>
      </div>

      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {photos.map((photo, index) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              className="relative group breakout-inside"
            >
              <Card className="overflow-hidden border-none shadow-lg ring-1 ring-black/5 hover:ring-primary/50 transition-all duration-300">
                <img
                  src={photo.url}
                  alt={`SaaS Asset ${photo.id}`}
                  className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                
                {/* Overlay with Actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 border-none">
                        <Maximize2 className="h-4 w-4 text-white" />
                      </Button>
                      <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 border-none">
                        <Download className="h-4 w-4 text-white" />
                      </Button>
                    </div>
                    <Button 
                        size="icon" 
                        variant="secondary" 
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.origin + photo.url);
                            toast.success("Link copiado!");
                        }}
                        className="h-8 w-8 rounded-full bg-primary/80 backdrop-blur-md hover:bg-primary border-none shadow-lg"
                    >
                      <Share2 className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-white/60 mt-2 font-mono">
                    {new Date(photo.createdAt).toLocaleString()}
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
