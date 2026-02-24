
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // We import workers dynamically to avoid issues with Next.js edge runtime or other environments
        const { VpnMonitorWorker } = await import('@/modules/saas/workers/vpn-monitor.worker');
        const { SaasBillingWorker } = await import('@/modules/saas/workers/saas-billing.worker');
        const { SubscriberAutomationWorker } = await import('@/modules/financial/workers/subscriber-automation.worker');
        const { BackupWorker } = await import('@/modules/saas/workers/backup.worker');

        
        

        try {
            new VpnMonitorWorker();
            

            new SaasBillingWorker();
            

            new SubscriberAutomationWorker();
            

            new BackupWorker();
            

            
        } catch (error) {
            console.error('[System] Error initializing workers:', error);
        }
        
    }
}
