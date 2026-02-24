import { Worker, Queue, Job } from 'bullmq';
import { BackupService } from '../services/backup.service';

const CONNECTION = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

const QUEUE_NAME = 'backup-queue';

export class BackupWorker {
    private worker: Worker;
    public static queue: Queue;

    constructor() {
        // Initialize the queue static instance if it doesn't exist (for producers)
        if (!BackupWorker.queue) {
            BackupWorker.queue = new Queue(QUEUE_NAME, { connection: CONNECTION });
        }

        this.worker = new Worker(QUEUE_NAME, async (job: Job) => {
            try {
                if (job.name === 'create-backup') {
                    const { trigger } = job.data;
                    await BackupService.createBackup(trigger || 'Scheduled/Manual');
                } else {
                    console.warn(`[BackupWorker] Unknown job name: ${job.name}`);
                }
            } catch (error: any) {
                console.error(`[BackupWorker] Job failed: ${error.message}`);
                throw error; // Let BullMQ handle retries if configured
            }

        }, { connection: CONNECTION });

        this.worker.on('completed', (job) => {

        });

        this.worker.on('failed', (job, err) => {
            console.error(`[BackupWorker] Job ${job?.id} failed: ${err.message}`);
        });

        // Initialize cron jobs
        this.initScheduler();
    }

    private async initScheduler() {
        // Ensure the queue is ready
        if (!BackupWorker.queue) {
            BackupWorker.queue = new Queue(QUEUE_NAME, { connection: CONNECTION });
        }

        // Schedule daily backup at 03:00 AM
        // Remove existing repeatable jobs to avoid duplicates if schedule changes (optional but good practice)
        // For simplicity in this setup, we just add it. BullMQ handles 'every' well, but 'cron' is better for specific times.
        await BackupWorker.queue.add('create-backup', { trigger: 'Auto: Daily Schedule' }, {
            repeat: {
                pattern: '0 3 * * *', // Every day at 03:00
            },
            jobId: 'daily-backup' // Unique ID to prevent duplicates
        });


    }
}

// Initialize the static queue for external use (actions/services)
// This ensures that even if the worker isn't instantiated in the same process (e.g. Next.js server actions separate from worker process),
// we can still import the class and use the queue to add jobs.
// Note: In a pure worker process, we might not need this immediately, but for the Next.js app to producer jobs, it helps.
if (!BackupWorker.queue) {
    BackupWorker.queue = new Queue(QUEUE_NAME, { connection: CONNECTION });
}
