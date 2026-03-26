import { MasonryGallery } from "@/components/gallery/MasonryGallery";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Galeria de Ativos | Mikrogestor",
  description: "Gerencie e visualize fotos do seu ponto de venda em tempo real.",
};

export default function GalleryPage() {
  return (
    <main className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header Section with Badge */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-gray-900 dark:text-gray-100">
               Acesso à Mídia
            </h1>
            <p className="text-lg text-muted-foreground font-medium">
              Sincronização imediata com o seu script de upload local.
            </p>
          </div>
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 self-start md:self-center">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Storage Conectado</span>
          </div>
        </div>

        {/* The Live Component */}
        <MasonryGallery />
      </div>

      {/* Instructional Section */}
      <section className="mt-20 pt-10 border-t border-dashed max-w-7xl mx-auto">
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-8 border">
            <h4 className="text-lg font-bold mb-4">Como usar o Uploader?</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <span className="text-2xl font-black text-gray-200">01</span>
                    <p className="text-sm">Baixe a pasta <code className="bg-white px-2 py-0.5 rounded border">uploader-client</code> no seu computador local.</p>
                </div>
                <div className="space-y-2">
                    <span className="text-2xl font-black text-gray-200">02</span>
                    <p className="text-sm">Edite o <code className="bg-white px-2 py-0.5 rounded border">config.conf</code> com sua API Key e a pasta que deseja monitorar.</p>
                </div>
                <div className="space-y-2">
                    <span className="text-2xl font-black text-gray-200">03</span>
                    <p className="text-sm">Inicie o <code className="bg-white px-2 py-0.5 rounded border">python main.py</code> e veja as fotos aparecerem aqui instantaneamente.</p>
                </div>
            </div>
        </div>
      </section>
    </main>
  );
}
