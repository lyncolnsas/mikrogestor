"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileVpnList, MobilePeer } from "@/modules/saas/components/mobile-vpn-list";
import { L2tpUsersPanel } from "@/modules/saas/components/l2tp-users-panel";
import { Shield, Smartphone } from "lucide-react";

interface MobileVpnTabsProps {
    peers: MobilePeer[];
}

export function MobileVpnTabs({ peers }: MobileVpnTabsProps) {
    return (
        <Tabs defaultValue="wireguard" className="w-full space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <TabsTrigger 
                        value="wireguard" 
                        className="px-6 py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm transition-all"
                    >
                        <Shield className="h-4 w-4 mr-2" />
                        WireGuard
                    </TabsTrigger>
                    <TabsTrigger 
                        value="l2tp" 
                        className="px-6 py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:shadow-sm transition-all"
                    >
                        <Shield className="h-4 w-4 mr-2" />
                        L2TP/IPSec
                    </TabsTrigger>
                </TabsList>

                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border border-blue-100 dark:border-blue-800 shadow-sm flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    {peers.length} Dispositivos WireGuard
                </div>
            </div>

            <TabsContent value="wireguard" className="focus-visible:outline-none animate-in fade-in-50 duration-500">
                <MobileVpnList peers={peers} />
            </TabsContent>

            <TabsContent value="l2tp" className="focus-visible:outline-none animate-in fade-in-50 duration-500">
                <L2tpUsersPanel />
            </TabsContent>
        </Tabs>
    );
}
