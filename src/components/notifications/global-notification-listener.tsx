"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";

// Generic interface that fits both SaasNotification and TenantNotification
interface NotificationItem {
    id: string;
    title: string;
    message: string;
    imageUrl?: string | null;
    type: "MODAL" | "TOAST" | "BANNER";
    createdAt: Date | string;
}

interface GlobalNotificationListenerProps {
    fetchAction: () => Promise<{ data?: NotificationItem[], error?: string }>;
    markReadAction: (id: string) => Promise<void | { success: boolean } | unknown>;
}

export function GlobalNotificationListener({ fetchAction, markReadAction }: GlobalNotificationListenerProps) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [currentModal, setCurrentModal] = useState<NotificationItem | null>(null);

    useEffect(() => {
        let mounted = true;

        const processNotifications = (items: NotificationItem[]) => {
            // Sort by date desc
            const sorted = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            // 1. Show newest MODAL first
            const modal = sorted.find(n => n.type === "MODAL");
            if (modal) {
                // Only set modal if it's different or not set, to avoid re-rendering loops or interuptions
                setCurrentModal(prev => (prev?.id === modal.id ? prev : modal));
            }

            // 2. Show TOASTS for others (limit to 3 to not spam)
            const toasts = sorted.filter(n => n.type === "TOAST" || (n.type === "MODAL" && n.id !== modal?.id));
            toasts.slice(0, 3).forEach(n => {
                // We could add a check here to not re-toast if recently toasted, but for now simple polling is fine.
                setTimeout(() => {
                    toast(n.title, {
                        description: n.message.substring(0, 100) + (n.message.length > 100 ? "..." : ""),
                        action: {
                            label: "Marcar como lido",
                            onClick: () => handleMarkRead(n.id)
                        },
                        duration: 10000,
                    });
                }, 1000);
            });
        };

        const loadNotifications = async () => {
            const result = await fetchAction();
            if (result.data && mounted) {
                // Only update if data changed to avoid unnecessary processing
                setNotifications(prev => {
                    if (JSON.stringify(prev) !== JSON.stringify(result.data)) {
                        processNotifications(result.data!);
                        return result.data!;
                    }
                    return prev;
                });
            }
        };

        loadNotifications();

        // Poll every 60 seconds
        const intervalId = setInterval(loadNotifications, 60000);

        return () => {
            mounted = false;
            clearInterval(intervalId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleMarkRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (currentModal?.id === id) {
            setCurrentModal(null);

            // Check for next modal
            const nextModal = notifications.find(n => n.type === "MODAL" && n.id !== id);
            if (nextModal) {
                setTimeout(() => setCurrentModal(nextModal), 300);
            }
        }

        await markReadAction(id);
    };

    if (!currentModal) return null;

    return (
        <Dialog open={!!currentModal} onOpenChange={(open) => !open && handleMarkRead(currentModal.id)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    {currentModal.imageUrl && (
                        <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden">
                            <Image
                                src={currentModal.imageUrl}
                                alt={currentModal.title}
                                fill
                                className="object-cover"
                            />
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Megaphone className="h-5 w-5 text-primary" />
                        <DialogTitle>{currentModal.title}</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2 text-foreground font-medium">
                        {currentModal.message}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-between">
                    <div className="text-xs text-muted-foreground self-center">
                        {new Date(currentModal.createdAt).toLocaleDateString()}
                    </div>
                    <Button onClick={() => handleMarkRead(currentModal.id)}>
                        Entendido
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
