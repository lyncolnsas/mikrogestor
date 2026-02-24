
import { Worker, Queue } from 'bullmq';
import { prisma } from '@/lib/prisma';
import { SaasBillingService } from '../services/saas-billing.service';

const CONNECTION = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

const QUEUE_NAME = 'saas-billing-queue';

export class SaasBillingWorker {
    private worker: Worker;
    private queue: Queue;

    constructor() {
        this.queue = new Queue(QUEUE_NAME, { connection: CONNECTION });

        this.worker = new Worker(QUEUE_NAME, async (job) => {
            if (job.name === 'check-subscriptions') {
                await this.processBillingCycle();
            }
        }, { connection: CONNECTION });

        this.worker.on('completed', (job) => {
            
        });

        this.worker.on('failed', (job, err) => {
            console.error(`[SaasBilling] Job failed: ${err.message}`);
        });

        this.init();
    }

    private async init() {
        // Run daily (every 24 hours)
        await this.queue.add('check-subscriptions', {}, {
            repeat: {
                pattern: '0 0 * * *' // Midnight every day
            }
        });
        
    }

    private async processBillingCycle() {
        

        const fiveDaysFromNow = new Date();
        fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

        // Find subscriptions that expire in the next 5 days and are ACTIVE
        const subscriptionsDue = await prisma.subscription.findMany({
            where: {
                status: 'ACTIVE',
                currentPeriodEnd: {
                    lte: fiveDaysFromNow
                }
            },
            include: {
                tenant: true,
                invoices: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        

        for (const sub of subscriptionsDue) {
            try {
                // Check if a PENDING invoice already exists for this subscription to avoid duplicates
                const latestInvoice = sub.invoices[0];

                // If the latest invoice is recent (within the last 20 days) and PENDING, skip
                // This is a safety check to avoid double billing for the same period.
                if (latestInvoice && latestInvoice.status === 'PENDING') {
                    const twentyDaysAgo = new Date();
                    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

                    if (latestInvoice.createdAt > twentyDaysAgo) {
                        
                        continue;
                    }
                }

                await SaasBillingService.generateInvoice(sub.tenantId);
                
            } catch (error) {
                console.error(`[SaasBilling] Error generating invoice for tenant ${sub.tenantId}:`, error);
            }
        }

        
    }
}
