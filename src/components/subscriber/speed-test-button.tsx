"use client";

import { Button } from "@/components/ui/button";
import { ArrowUpRight, Gauge } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export function SpeedTestButton() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" className="w-full justify-start text-slate-700 text-sm h-11 gap-4 font-semibold hover:bg-slate-100 rounded-xl">
                    <div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center">
                        <ArrowUpRight className="h-4 w-4 text-slate-500" />
                    </div>
                    Testar Minha Velocidade
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <Gauge className="h-5 w-5 text-indigo-600" />
                        Teste de Velocidade (Fast.com)
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 w-full bg-black">
                    <iframe
                        src="https://fast.com"
                        className="w-full h-full border-none"
                        title="Speed Test"
                        allow="autoplay"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
