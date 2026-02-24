import { PrismaClient } from '@prisma/client';

export class CalculateInterestService {
    constructor(private readonly prisma: PrismaClient) { }

    async execute(tenantId: string) {
        

        // 1. Find invoices paid AFTER due date
        // 2. Calculate fine + daily interest
        // 3. Store in pending_debits (mocked)

        // const overdueInvoices = await this.prisma.invoice.findMany({ ... });
        // overdueInvoices.forEach(invoice => { ... });
    }
}
