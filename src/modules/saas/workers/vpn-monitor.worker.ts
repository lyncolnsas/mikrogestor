
import { Worker, Queue } from 'bullmq';
import { VpnMonitorService } from '../services/vpn-monitor.service';

const CONNECTION = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

const QUEUE_NAME = 'vpn-monitor-queue';

export class VpnMonitorWorker {
    private worker: Worker;
    private queue: Queue;

    constructor() {
        this.queue = new Queue(QUEUE_NAME, { connection: CONNECTION });

        this.worker = new Worker(QUEUE_NAME, async (job) => {
            

            await Promise.all([
                VpnMonitorService.collectServerStats(),
                VpnMonitorService.collectTunnelTraffic()
            ]);

        }, { connection: CONNECTION });

        this.worker.on('completed', (job) => {
            
        });

        this.worker.on('failed', (job, err) => {
            console.error(`[VpnMonitor] Job failed: ${err.message}`);
        });

        // Add repeatable job if not exists
        this.init();
    }

    private async init() {
        // Collect every 1 minute
        await this.queue.add('collect-stats', {}, {
            repeat: {
                every: 60 * 1000 // 1 minute
            }
        });
        
    }
}
