
import { Worker, Queue } from 'bullmq';
import { prisma } from '@/lib/prisma';
import { BillingService } from '../billing.service';
import { BlockOverdueJob } from '../jobs/block-overdue.job';
import { RadiusService } from '@/modules/saas/services/radius.service';

const CONNECTION = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

const QUEUE_NAME = 'subscriber-automation-queue';

/**
 * SubscriberAutomationWorker
 * Handles daily tasks for all tenants:
 * 1. Monthly invoice generation
 * 2. Overdue customer blocking
 */
export class SubscriberAutomationWorker {
    private worker: Worker;
    private queue: Queue;
    private billingService = new BillingService();
    private radiusSync = RadiusService;

    constructor() {
        this.queue = new Queue(QUEUE_NAME, { connection: CONNECTION });

        this.worker = new Worker(QUEUE_NAME, async (job) => {


            if (job.name === 'daily-automation-task') {
                await this.processAllTenants();
            }
        }, { connection: CONNECTION });

        this.worker.on('completed', (job) => {
        });

        this.worker.on('failed', (job, err) => {
            console.error(`[AutomationWorker] Job ${job?.id} failed: ${err.message}`);
        });

        this.init();
    }

    private async init() {
        // Schedule to run every day at 03:00 AM
        await this.queue.add('daily-automation-task', {}, {
            repeat: {
                pattern: '0 3 * * *'
            },
            jobId: 'daily-task-singleton'
        });
    }

    private async processAllTenants() {


        const tenants = await prisma.tenant.findMany({
            where: { status: 'ACTIVE' }
        });

        for (const tenant of tenants) {
            try {
                // 1. Generate Monthly Invoices
                const billingResult = await this.billingService.generateMonthlyInvoices(tenant.id);


                // 2. Block Overdue Customers
                const blockJob = new BlockOverdueJob(prisma as any, this.radiusSync);
                const blockResult = await blockJob.execute(tenant.id);


            } catch (error) {
                console.error(`[AutomationWorker] Error processing tenant ${tenant.id}:`, error);
            }
        }


    }
}
